import mongoose from 'mongoose';

const bargainSchema = new mongoose.Schema(
  {
    shopItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShopItem',
      required: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      default: null,
    },
  },
  { timestamps: true }
);

// A buyer can only have one pending bargain per item
bargainSchema.index({ shopItemId: 1, buyerId: 1, status: 1 });

export default mongoose.model('Bargain', bargainSchema);
