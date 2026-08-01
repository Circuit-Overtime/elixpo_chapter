'use client';

const DB_NAME = 'lixblogs-media-queue';
const STORE_NAME = 'uploads';
const DB_VERSION = 1;
const EVENT_NAME = 'lixblogs:media-upload';
const activeUploads = new Map();

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeJob(job) {
  const db = await openDB();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(job);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function readJob(id) {
  const db = await openDB();
  const job = await new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME).objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return job;
}

function announce(job) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, {
    detail: { id: job.id, blogId: job.blogId, type: job.type, status: job.status, result: job.result },
  }));
}

async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function runUpload(id) {
  if (activeUploads.has(id)) return activeUploads.get(id);
  const task = (async () => {
    const job = await readJob(id);
    if (!job) throw new Error('Upload is no longer available');
    if (job.status === 'complete' && job.result) return job.result;
    job.status = 'uploading';
    job.attempts = (job.attempts || 0) + 1;
    await writeJob(job);
    announce(job);

    let data;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const uploadBlob = job.blob?.type
          ? job.blob
          : new Blob([job.blob], { type: 'image/webp' });
        // Use the same JSON transport as the rest of the Pages API. Production
        // Cloudflare rejected both multipart and raw image requests before the
        // Function ran (generic HTML 400), while JSON requests reach the route.
        const body = JSON.stringify({
          data: await blobToBase64(uploadBlob),
          mimeType: uploadBlob.type || 'image/webp',
          type: job.type,
          uploadId: job.id,
          blogId: job.blogId || '',
          orgId: job.orgId || '',
        });
        const response = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        });
        const responseText = await response.text();
        try { data = responseText ? JSON.parse(responseText) : {}; } catch { data = {}; }
        if (response.ok) break;
        const isHtml = /^\s*<!doctype|^\s*<html/i.test(responseText);
        const detail = isHtml ? '' : responseText.slice(0, 300).trim();
        lastError = new Error(data.error || detail || `Upload failed (${response.status})`);
        if (![502, 503, 504].includes(response.status)) {
          lastError.nonRetryable = true;
          throw lastError;
        }
      } catch (error) {
        lastError = error;
        if (error.nonRetryable || attempt === 2) throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * (2 ** attempt)));
    }
    if (!data?.url) throw lastError || new Error('Upload failed');
    job.status = 'complete';
    job.result = data;
    job.completedAt = Date.now();
    await writeJob(job);
    announce(job);
    return data;
  })().catch(async (error) => {
    const job = await readJob(id).catch(() => null);
    if (job) {
      job.status = 'error';
      job.error = error.message;
      await writeJob(job).catch(() => {});
      announce(job);
    }
    throw error;
  }).finally(() => activeUploads.delete(id));
  activeUploads.set(id, task);
  return task;
}

export function createMediaUploadId() {
  return crypto.randomUUID();
}

export async function enqueueMediaUpload(blob, options = {}) {
  const id = options.id || createMediaUploadId();
  const existing = await readJob(id).catch(() => null);
  if (!existing) {
    await writeJob({
      id,
      blob,
      filename: options.filename || `image_${id}.webp`,
      blogId: options.blogId || '',
      orgId: options.orgId || '',
      type: options.type || 'image',
      status: 'queued',
      attempts: 0,
      createdAt: Date.now(),
    });
  }
  return runUpload(id);
}

export function resumeMediaUpload(id) {
  return runUpload(id);
}

export const MEDIA_UPLOAD_EVENT = EVENT_NAME;
