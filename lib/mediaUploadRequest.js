export async function readUploadRequest(request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.toLowerCase().startsWith('application/json')) {
    const payload = await request.json();
    const encoded = typeof payload?.data === 'string' ? payload.data : '';
    if (!encoded || !/^[a-zA-Z0-9+/]*={0,2}$/.test(encoded)) {
      throw new Error('Invalid base64 image body');
    }
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return {
      file: {
        type: String(payload.mimeType || '').trim().toLowerCase(),
        size: bytes.byteLength,
        arrayBuffer: async () => bytes.buffer,
      },
      blogId: payload.blogId || '',
      orgId: payload.orgId || '',
      mediaType: payload.type || 'image',
      requestedUploadId: String(payload.uploadId || ''),
      fields: Object.keys(payload),
      transport: 'json',
    };
  }

  if (contentType.toLowerCase().startsWith('multipart/form-data')) {
    const formData = await request.formData();
    return {
      file: formData.get('file'),
      blogId: formData.get('blogId'),
      orgId: formData.get('orgId'),
      mediaType: formData.get('type') || 'image',
      requestedUploadId: String(formData.get('uploadId') || ''),
      fields: [...formData.keys()],
      transport: 'multipart',
    };
  }

  return { file: null, blogId: '', orgId: '', mediaType: 'image', requestedUploadId: '', fields: [], transport: 'unknown' };
}
