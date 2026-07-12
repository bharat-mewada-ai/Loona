import Razorpay from 'razorpay';
import crypto from 'crypto';
import ShopItem from '../models/shopItem.model.js';
import Bargain from '../models/bargain.model.js';
import Chat from '../models/chat.model.js';
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
    const { title, description, price, category, sellerUpi, sellerContact, wantFeatured, paymentMethod = 'razorpay', image, images } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ error: 'Title, price, and category are required' });
    }
    if (price < 0) {
      return res.status(400).json({ error: 'Price cannot be negative' });
    }
    if (image && image.startsWith("data:")) {
      return res.status(400).json({ error: "Base64 images are not accepted." });
    }
    if (images && Array.isArray(images)) {
      for (const img of images) {
        if (img && img.startsWith("data:")) {
          return res.status(400).json({ error: "Base64 images are not accepted." });
        }
      }
    }

    const cleanImages = images || (image ? [image] : []);

    if (paymentMethod === 'potato') {
      const listingPotatoCost = 150;
      const boostPotatoCost = 150;
      const totalPotatoCost = wantFeatured ? listingPotatoCost + boostPotatoCost : listingPotatoCost;

      // Find user to check latest potato balance
      const user = await User.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if ((user.potato || 0) < totalPotatoCost) {
        return res.status(400).json({ error: `You need at least ${totalPotatoCost} 🥔 Potatoes to list this item. You currently have ${user.potato || 0} 🥔.` });
      }

      // Deduct potatoes
      user.potato = (user.potato || 0) - totalPotatoCost;
      await user.save();

      // Create live listing immediately
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
        status: 'available',
        listingFeePaid: true,
        boostFeePaid: !!wantFeatured,
        image: image || (cleanImages.length > 0 ? cleanImages[0] : null),
        images: cleanImages,
      });

      // Populate seller fields for client-side display
      const populatedItem = await ShopItem.findById(item._id).populate('seller', 'name avatar campus').lean();

      return res.json({
        itemId: item._id,
        item: populatedItem,
        paymentMethod: 'potato',
        feeBreakdown: {
          listingFee: listingPotatoCost,
          boostFee: wantFeatured ? boostPotatoCost : 0,
          total: totalPotatoCost,
        },
      });
    } else {
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
        image: image || (cleanImages.length > 0 ? cleanImages[0] : null),
        images: cleanImages,
      });

      return res.json({
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
        paymentMethod: 'razorpay',
      });
    }
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
    const shopItem = await ShopItem.findByIdAndDelete(req.params.id);
    if (!shopItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    logger.error('[Shop] deleteListing error:', err.message);
    res.status(500).json({ error: 'Could not delete listing' });
  }
};

// ─── POST /shop/:id/bargain ────────────────────────────────────────────────
// Submit a bargain request
export const createBargain = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, message } = req.body;
    const buyerId = req.user._id;

    if (!price || price <= 0) return res.status(400).json({ error: 'Valid price is required' });

    const item = await ShopItem.findById(id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    if (item.status !== 'available') return res.status(400).json({ error: 'Item is not available' });
    if (item.seller.toString() === buyerId.toString()) return res.status(400).json({ error: 'Cannot bargain on your own item' });

    // Check if there's already a pending bargain from this buyer
    const existing = await Bargain.findOne({ shopItemId: id, buyerId, status: 'pending' });
    if (existing) return res.status(400).json({ error: 'You already have a pending bargain for this item' });

    const bargain = await Bargain.create({
      shopItemId: item._id,
      buyerId,
      sellerId: item.seller,
      price,
      message: message || '',
    });

    // Notify seller
    const buyerInfo = await User.findById(buyerId).select('name');
    await createNotification({
      recipient: item.seller,
      sender: buyerId,
      type: 'bargain_request',
      title: '🤝 New Bargain Offer',
      body: `${buyerInfo?.name || 'Someone'} offered ₹${price} for "${item.title}".`,
      data: { shopItemId: item._id, bargainId: bargain._id },
    });

    res.json(bargain);
  } catch (err) {
    logger.error('[Shop] createBargain error:', err.message);
    res.status(500).json({ error: 'Could not submit bargain' });
  }
};

// ─── GET /shop/bargains ────────────────────────────────────────────────────
// Get bargains for the current user (either sent or received)
export const getBargains = async (req, res) => {
  try {
    const { type } = req.query; // 'sent' or 'received'
    const userId = req.user._id;

    const filter = type === 'sent' ? { buyerId: userId } : { sellerId: userId };

    const bargains = await Bargain.find(filter)
      .populate('shopItemId', 'title price image status')
      .populate('buyerId', 'name avatar')
      .populate('sellerId', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.json(bargains);
  } catch (err) {
    logger.error('[Shop] getBargains error:', err.message);
    res.status(500).json({ error: 'Could not fetch bargains' });
  }
};

// ─── POST /shop/bargains/:id/respond ───────────────────────────────────────
// Seller accepts or rejects a bargain
export const respondToBargain = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const sellerId = req.user._id;

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const bargain = await Bargain.findById(id).populate('shopItemId');
    if (!bargain) return res.status(404).json({ error: 'Bargain not found' });
    if (bargain.sellerId.toString() !== sellerId.toString()) return res.status(403).json({ error: 'Forbidden' });
    if (bargain.status !== 'pending') return res.status(400).json({ error: 'Bargain is already ' + bargain.status });

    bargain.status = action === 'accept' ? 'accepted' : 'rejected';

    let chatId = null;
    if (action === 'accept') {
      // Create a chat between buyer and seller if it doesn't exist
      // Since it's a real name chat, isAnonymous = false
      let chat = await Chat.findOne({
        participants: { $all: [bargain.buyerId, bargain.sellerId] },
        isAnonymous: false
      });
      
      if (!chat) {
        chat = await Chat.create({
          participants: [bargain.buyerId, bargain.sellerId],
          isAnonymous: false,
          unreadCounts: {
            [bargain.buyerId.toString()]: 1, // Will have one system message
            [bargain.sellerId.toString()]: 0
          }
        });
      }
      bargain.chatId = chat._id;
      chatId = chat._id;

      // Add a system message to the chat
      const Message = (await import('../models/message.model.js')).default;
      await Message.create({
        chatId: chat._id,
        sender: bargain.sellerId,
        content: `🤝 Bargain Accepted! I agreed to sell "${bargain.shopItemId.title}" for ₹${bargain.price}. Let's coordinate!`,
        isSystem: true
      });
      
      chat.lastMessageAt = new Date();
      await chat.save();
    }

    await bargain.save();

    // Notify buyer
    const title = action === 'accept' ? '🎉 Bargain Accepted!' : '❌ Bargain Rejected';
    const body = action === 'accept' 
      ? `Your offer of ₹${bargain.price} for "${bargain.shopItemId.title}" was accepted! Tap to chat.` 
      : `Your offer of ₹${bargain.price} for "${bargain.shopItemId.title}" was rejected.`;
      
    await createNotification({
      recipient: bargain.buyerId,
      sender: sellerId,
      type: action === 'accept' ? 'bargain_accepted' : 'bargain_rejected',
      title,
      body,
      data: { shopItemId: bargain.shopItemId._id, bargainId: bargain._id, chatId },
    });

    res.json(bargain);
  } catch (err) {
    logger.error('[Shop] respondToBargain error:', err.message);
    res.status(500).json({ error: 'Could not respond to bargain' });
  }
};
