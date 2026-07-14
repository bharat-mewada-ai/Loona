import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String },
    image: { type: String },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    reactions: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1, createdAt: 1 }); // Primary fetch index (get messages in order)
messageSchema.index({ chatId: 1, senderId: 1 });  // markAsRead updateMany filter


export default mongoose.model("Message", messageSchema);
