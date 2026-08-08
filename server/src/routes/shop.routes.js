import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  getListings,
  getMyListings,
  createListingOrder,
  deleteListing,
  createBargain,
  getBargains,
  respondToBargain,
  markAsSold,
  chatWithSeller,
} from '../controllers/shop.controller.js';

const router = express.Router();

// All shop routes require authentication
router.use(requireAuth);

// Browse listings
router.get('/', asyncHandler(getListings));

// Seller's own listings
router.get('/my', asyncHandler(getMyListings));

// Create listing — Step 1: pay listing fee
router.post('/create-order', asyncHandler(createListingOrder));

// Create listing — Step 2: verify payment & go live (Removed during Razorpay mothballing)

// Delete listing
router.delete('/:id', asyncHandler(deleteListing));

// Mark listing as sold (seller only)
router.patch('/:id/mark-sold', asyncHandler(markAsSold));

// Open in-app chat with seller (buyer — no bargain required)
router.post('/:id/contact', asyncHandler(chatWithSeller));

// Get sent or received bargains
router.get('/bargains', asyncHandler(getBargains));

// Respond to a bargain (accept/reject)
router.post('/bargains/:id/respond', asyncHandler(respondToBargain));

// Create a bargain for an item
router.post('/:id/bargain', asyncHandler(createBargain));

export default router;
