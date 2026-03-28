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

// Profile images (avatar/banner) get heavy compression + overwrite
const PROFILE_TRANSFORMS = 'q_auto:low,f_webp';
const AVATAR_TRANSFORMS = 'q_auto:low,f_webp,w_256,h_256,c_fill,g_face';
const BANNER_TRANSFORMS = 'q_auto:low,f_webp,w_1920,h_480,c_fill';

export async function uploadToCloudinary(fileBuffer, { folder, publicId, overwrite = false, resourceType = 'image' }) {
  const config = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);

  // Build params to sign (must be alphabetically sorted)
  const params = { folder, timestamp };
  if (publicId) params.public_id = publicId;
  if (overwrite) {
    params.overwrite = 'true';
    params.invalidate = 'true';
  }

  const signStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + config.apiSecret;
  const signature = await sha1(signStr);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]));
  formData.append('timestamp', timestamp.toString());
  formData.append('folder', folder);
  formData.append('api_key', config.apiKey);
  formData.append('signature', signature);
  if (publicId) formData.append('public_id', publicId);
  if (overwrite) {
    formData.append('overwrite', 'true');
    formData.append('invalidate', 'true');
  }

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

export function getAvatarUrl(publicId) {
  return getCloudinaryUrl(publicId, AVATAR_TRANSFORMS);
}

export function getBannerUrl(publicId) {
  return getCloudinaryUrl(publicId, BANNER_TRANSFORMS);
}

export { PROFILE_TRANSFORMS, AVATAR_TRANSFORMS, BANNER_TRANSFORMS };
