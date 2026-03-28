// Cloudinary upload/delete helpers using the Upload API (no SDK needed)

function getConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
}

async function sha1(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
  return [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function uploadToCloudinary(fileBuffer, { folder, publicId, resourceType = 'image' }) {
  const config = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);

  // Build params to sign
  const params = { folder, timestamp };
  if (publicId) params.public_id = publicId;

  // Generate signature: alphabetically sorted key=value joined by &, appended with api_secret
  const signStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + config.apiSecret;
  const signature = await sha1(signStr);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]));
  formData.append('timestamp', timestamp.toString());
  formData.append('folder', folder);
  formData.append('api_key', config.apiKey);
  formData.append('signature', signature);
  if (publicId) formData.append('public_id', publicId);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary upload failed: ${err}`);
  }

  return res.json();
}

export async function deleteFromCloudinary(publicId, { resourceType = 'image' } = {}) {
  const config = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);

  const signStr = `public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = await sha1(signStr);

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', config.apiKey);
  formData.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`,
    { method: 'POST', body: formData }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Cloudinary delete failed: ${err}`);
  }

  return res.json();
}

export function getCloudinaryUrl(publicId, transforms = '') {
  const config = getConfig();
  const t = transforms ? `${transforms}/` : '';
  return `https://res.cloudinary.com/${config.cloudName}/image/upload/${t}${publicId}`;
}
