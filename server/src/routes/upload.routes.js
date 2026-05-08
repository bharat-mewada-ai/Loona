import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();

/**
 * GET /api/upload/sign
 * Returns a signed Cloudinary upload signature valid for 60 seconds.
 * The client uses this to upload directly to Cloudinary without exposing
 * any credentials in the app bundle.
 */
router.get('/sign', requireAuth, asyncHandler(async (req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const paramsToSign = {
    timestamp,
    folder: 'loona',
    // Limit uploaded file size to 5MB at Cloudinary level (transformation)
    transformation: 'q_auto,f_auto,w_1200,c_limit',
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET
  );

  res.json({
    timestamp,
    signature,
    folder: 'loona',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  });
}));

export default router;
