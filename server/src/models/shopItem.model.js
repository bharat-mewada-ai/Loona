import mongoose from 'mongoose';

const shopItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['books', 'notes', 'stationery', 'electronics', 'clothing', 'other'],
      required: true,
    },
    image: {
      type: String,
      default: null,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    campus: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending_payment', 'available', 'sold'],
      default: 'pending_payment',
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // UPI ID of the seller — buyer pays directly to this
    sellerUpi: {
      type: String,
      trim: true,
      default: '',
    },
    // Seller contact (WhatsApp/phone) so buyer can coordinate pickup
    sellerContact: {
      type: String,
      trim: true,
      default: '',
    },
    // Whether listing is featured (paid boost)
    isFeatured: {
      type: Boolean,
      default: false,
    },
    // Razorpay order IDs for listing fee & boost fee payments
    listingFeeOrderId: { type: String, default: null },
    listingFeePaid: { type: Boolean, default: false },
    boostFeeOrderId: { type: String, default: null },
    boostFeePaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for campus-based queries — most common lookup
shopItemSchema.index({ campus: 1, status: 1, isFeatured: -1, createdAt: -1 });
shopItemSchema.index({ seller: 1 });

export default mongoose.model('ShopItem', shopItemSchema);
