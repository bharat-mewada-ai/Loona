import Razorpay from 'razorpay';
import crypto from 'crypto';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import { createNotification } from '../utils/notificationService.js';

/**
 * Initialize Razorpay
 * Requires RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env
 */
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

/**
 * Step 1: Create an Order
 * POST /api/v1/payments/create-order
 */
export const createOrder = async (req, res) => {
  try {
    const { amount, planId } = req.body; // amount in INR (e.g. 199)
    
    if (!amount) return res.status(400).json({ error: "Amount is required" });

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `receipt_${req.user._id}_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    
    // Save order ID to user for verification later
    await User.findByIdAndUpdate(req.user._id, { razorpayOrderId: order.id });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    logger.error("[Payment] Create Order failed:", error.message);
    res.status(500).json({ error: "Could not create payment order" });
  }
};

/**
 * Step 2: Verify Payment
 * POST /api/v1/payments/verify
 */
export const verifyPayment = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      planDays = 30 
    } = req.body;

    // 1. Validate signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature !== expectedSign) {
      return res.status(400).json({ error: "Invalid payment signature" });
    }

    // 2. Upgrade user to Premium
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + planDays);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        isPremium: true,
        premiumExpiresAt: expiryDate,
        $unset: { razorpayOrderId: "" } // clear temp order ID
      },
      { new: true }
    );

    // 3. Notify user
    createNotification({
      recipient: user._id,
      sender: null,
      type: "system",
      title: "Welcome to Loona Pro! 💎",
      body: `Your premium subscription is active until ${expiryDate.toLocaleDateString()}. Enjoy your exclusive perks!`
    });

    res.json({ 
      success: true, 
      message: "Payment verified and account upgraded",
      isPremium: true,
      premiumExpiresAt: expiryDate
    });

  } catch (error) {
    logger.error("[Payment] Verification failed:", error.message);
    res.status(500).json({ error: "Payment verification failed" });
  }
};
