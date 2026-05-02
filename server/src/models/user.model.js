import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    googleId: { type: String },
    campus: {
      type: String,
      required: true,
    },
    karma: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    avatar: {
      type: String,
      default: "🦊",
    },
    badges: {
      type: [String],
      default: [],
    },
    postCount: {
      type: Number,
      default: 0,
    },
    // Fields used in controllers — must be present to avoid silent undefined writes
    upvotesReceived: { type: Number, default: 0 },
    lastPostDate: { type: Date },
    commentsCount: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    // Expo push token — stored on login so server can send push notifications
    expoPushToken: { type: String, default: null },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ campus: 1, karma: -1 });

export default mongoose.model("User", userSchema);