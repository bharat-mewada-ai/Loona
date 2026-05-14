import express from 'express';
import { createOrder, verifyPayment } from '../controllers/payment.controller.js';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// All payment routes require authentication
router.use(requireAuth);

/**
 * @route   POST /api/v1/payments/create-order
 * @desc    Create a new Razorpay order
 */
router.post('/create-order', asyncHandler(createOrder));

/**
 * @route   POST /api/v1/payments/verify
 * @desc    Verify payment signature and upgrade account
 */
router.post('/verify', asyncHandler(verifyPayment));

export default router;
