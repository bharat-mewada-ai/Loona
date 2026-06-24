import Razorpay from 'razorpay';
import crypto from 'crypto';
import ShopItem from '../models/shopItem.model.js';
import User from '../models/user.model.js';
import logger from '../utils/logger.js';
import { createNotification } from '../utils/notificationService.js';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

const LISTING_FEE_INR = 5;    // ₹5 to list
const BOOST_FEE_INR   = 15;   // ₹15 to feature listing

// ─── GET /shop ─────────────────────────────────────────────────────────────
// List available items — featured items first, then newest
export const getListings = async (req, res) => {
  try {
    const { campus, category, page = 1, limit = 20 } = req.query;

    const filter = { status: 'available', listingFeePaid: true };
    if (campus && campus !== 'all') filter.campus = campus;
    if (category && category !== 'all') filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      ShopItem.find(filter)
        .populate('seller', 'name avatar campus')
        .sort({ isFeatured: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ShopItem.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), hasMore: skip + items.length < total });
  } catch (err) {
    logger.error('[Shop] getListings error:', err.message);
    res.status(500).json({ error: 'Could not fetch listings' });
  }
};

// ─── GET /shop/my ──────────────────────────────────────────────────────────
// Seller's own listings (all statuses)
export const getMyListings = async (req, res) => {
  try {
    const items = await ShopItem.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(items);
  } catch (err) {
    logger.error('[Shop] getMyListings error:', err.message);
    res.status(500).json({ error: 'Could not fetch your listings' });
  }
};

// ─── POST /shop/create-order ───────────────────────────────────────────────
// Step 1: Create Razorpay order for listing fee (₹5)
// Temporarily saves listing data; listing goes live only after payment verification
export const createListingOrder = async (req, res) => {
  try {
    const { title, description, price, category, sellerUpi, sellerContact, wantFeatured } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ error: 'Title, price, and category are required' });
    }
    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }

    const feeAmount = wantFeatured ? LISTING_FEE_INR + BOOST_FEE_INR : LISTING_FEE_INR;

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: feeAmount * 100, // paise
      currency: 'INR',
      receipt: `shop_list_${req.user._id}_${Date.now()}`,
      notes: { type: 'shop_listing', userId: req.user._id.toString() },
    });

    // Save a pending listing
    const item = await ShopItem.create({
      title,
      description,
      price,
      category,
      seller: req.user._id,
      campus: req.user.campus,
      sellerUpi: sellerUpi || '',
      sellerContact: sellerContact || '',
      isFeatured: !!wantFeatured,
      listingFeeOrderId: order.id,
      status: 'pending_payment',
    });

    res.json({
      itemId: item._id,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
      feeBreakdown: {
        listingFee: LISTING_FEE_INR,
        boostFee: wantFeatured ? BOOST_FEE_INR : 0,
        total: feeAmount,
      },
    });
  } catch (err) {
    logger.error('[Shop] createListingOrder error:', err.message);
    res.status(500).json({ error: 'Could not create listing order' });
  }
};

// ─── POST /shop/:id/verify-listing ─────────────────────────────────────────
// Step 2: Verify Razorpay payment for listing fee — makes item live
export const verifyListingPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const { id } = req.params;

    const item = await ShopItem.findById(id);
    if (!item) return res.status(404).json({ error: 'Listing not found' });
    if (item.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Verify signature
    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
      .update(sign)
      .digest('hex');

    if (razorpay_signature !== expected) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Mark listing as live
    item.status = 'available';
    item.listingFeePaid = true;
    if (item.isFeatured) item.boostFeePaid = true;
    await item.save();

    logger.info(`[Shop] Listing ${item._id} is now live (seller: ${req.user._id})`);

    res.json({ success: true, item });
  } catch (err) {
    logger.error('[Shop] verifyListingPayment error:', err.message);
    res.status(500).json({ error: 'Payment verification failed' });
  }
};

// ─── DELETE /shop/:id ──────────────────────────────────────────────────────
// Seller removes their own listing (only if still available)
export const deleteListing = async (req, res) => {
  try {
    const item = await ShopItem.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Listing not found' });
    if (item.seller.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'You can only delete your own listings' });
    }
    if (item.status === 'sold') {
      return res.status(400).json({ error: 'Cannot delete a sold item' });
    }

    await item.deleteOne();
    res.json({ success: true });
  } catch (err) {
    logger.error('[Shop] deleteListing error:', err.message);
    res.status(500).json({ error: 'Could not delete listing' });
  }
};
