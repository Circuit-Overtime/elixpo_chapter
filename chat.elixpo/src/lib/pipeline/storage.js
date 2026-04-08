import { v2 as cloudinary } from "cloudinary";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from "./config.js";

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer - File bytes
 * @param {string} folder - Cloudinary folder path
 * @param {string} publicId - Public ID for the file
 * @param {"image"|"video"|"raw"} resourceType - Type of resource
 * @returns {Promise<string>} Public URL
 */
export async function uploadBuffer(buffer, folder, publicId, resourceType = "image") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
        overwrite: true,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}

/**
 * Delete all resources in a Cloudinary folder.
 * @param {string} folder - Folder prefix to delete
 */
export async function deleteFolder(folder) {
  try {
    await cloudinary.api.delete_resources_by_prefix(folder);
    await cloudinary.api.delete_folder(folder);
    console.log(`🧹 Deleted Cloudinary folder: ${folder}`);
  } catch (err) {
    console.warn(`⚠️ Failed to delete folder ${folder}:`, err.message);
  }
}

export { cloudinary };
