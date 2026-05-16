import express from 'express';
import ErrorLog from '../models/errorLog.model.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { optionalAuth } from '../middlewares/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/v1/errors/log
 * Receives error reports from the client (ErrorBoundary)
 */
router.post('/log', optionalAuth, asyncHandler(async (req, res) => {
  const { message, stack, component, platform, metadata } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Error message is required' });
  }

  const errorLog = await ErrorLog.create({
    message,
    stack,
    component: component || 'Unknown',
    platform: platform || 'mobile',
    metadata: metadata || {},
    userId: req.user?._id,
    version: metadata?.version || '1.0.0'
  });

  logger.error(`[ClientError] from ${platform}: ${message}`);
  
  res.status(201).json({ success: true, id: errorLog._id });
}));

export default router;
