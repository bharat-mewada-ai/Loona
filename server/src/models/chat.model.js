import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isAnonymous: { type: Boolean, default: false },
    anonAuthorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isRevealed: { type: Boolean, default: false },
    // Map user _id to their anonymous identity for this chat
    anonIdentities: {
      type: Map,
      of: new mongoose.Schema({
        name: String,
        avatar: String,
      }, { _id: false })
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

// Index to find chats for a user quickly
chatSchema.index({ participants: 1, lastMessageAt: -1 });

export default mongoose.model("Chat", chatSchema);
