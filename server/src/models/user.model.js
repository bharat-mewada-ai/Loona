import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      maxlength: 150,
      default: "",
    },
    isPrivate: {
      type: Boolean,
      default: false,
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
    // Password — set to 'google_oauth' placeholder for OAuth users (never exposed)
    password: { type: String, default: "google_oauth", select: false },
    // Expo push token — stored on login so server can send push notifications
    expoPushToken: { type: String, default: null },
    notificationsEnabled: { type: Boolean, default: true },
    isBanned: { type: Boolean, default: false },
    tags: {
      type: [String],
      default: [],
    },
    refreshTokens: { type: [String], default: [] },
  },
  { timestamps: true, minimize: false }
);

// Note: email unique index is already declared via { unique: true } on the field above.
// Only the campus+karma compound index is added here.
userSchema.index({ campus: 1, karma: -1 });

export default mongoose.model("User", userSchema);