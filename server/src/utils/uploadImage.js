import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a base64 image or file path to Cloudinary.
 * @param {string} image - Base64 string or file path.
 * @param {string} folder - Cloudinary folder name.
 * @returns {Promise<string>} - The secure URL of the uploaded image.
 */
export const uploadImage = async (image, folder = 'loona_posts') => {
  if (!image) return null;

  try {
    const result = await cloudinary.uploader.upload(image, {
      folder,
      resource_type: 'auto',
    });
    return result.secure_url;
  } catch (error) {
    console.error('[Cloudinary] Upload failed:', error);
    throw new Error('Image upload failed');
  }
};

export const isCloudinaryUrl = (url) => {
  if (!url) return false;
  return url.includes('cloudinary.com');
};

export default uploadImage;
