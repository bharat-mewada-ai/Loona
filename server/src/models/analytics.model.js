import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    event: {
      type: String, // e.g., "SCREEN_VIEW", "POST_CREATE", "CHAT_START"
      required: true,
    },
    screen: String, // e.g., "feed", "chat", "profile"
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    platform: String, // "ios", "android"
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

// Index for fast analytics queries
analyticsSchema.index({ event: 1, createdAt: -1 });

const Analytics = mongoose.model("Analytics", analyticsSchema);
export default Analytics;
