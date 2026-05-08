import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

/**
 * GET /api/config/version
 * Returns the current supported version and platform-specific download links.
 * Used for the "Force Update" mechanism.
 */
router.get('/version', asyncHandler(async (req, res) => {
  res.json({
    minimumVersion: '1.0.0',
    currentVersion: '1.0.0',
    iosUrl: 'https://apps.apple.com/app/loona',
    androidUrl: 'https://play.google.com/store/apps/details?id=app.loona',
    forceUpdate: false,
    message: "New features are here! Update Loona to stay in the loop."
  });
}));

export default router;
