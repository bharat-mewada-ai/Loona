import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    type: { 
      type: String, 
      enum: ["upvote", "reaction", "comment", "mention", "wave", "system"], 
      required: true 
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: {
      postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-delete notifications after 30 days to save space
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
