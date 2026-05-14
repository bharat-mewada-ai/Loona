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
    isVerified: {
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
    upvotesGiven: { type: Number, default: 0 },
    tags: {
      type: [String],
      default: [],
    },
    refreshTokens: { type: [String], default: [] },
    lastActive: { type: Date, default: Date.now },
    location: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lon, lat]
    },
    savedPosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
    badges: [{
      name: { type: String, required: true },
      icon: { type: String, required: true },
      awardedAt: { type: Date, default: Date.now }
    }],
    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date },
    razorpayOrderId: { type: String },
  },
  { timestamps: true, minimize: false }
);

userSchema.index({ location: "2dsphere" });

// Phase 1.6: Prune refresh tokens and Sanitize Badges
userSchema.pre('validate', async function() {
  // Prune tokens
  if (this.refreshTokens && this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }

  // Sanitize Badges: Remove any strings that might have leaked in from old code/logic
  if (this.badges && Array.isArray(this.badges)) {
    this.badges = this.badges.filter(b => b && typeof b === 'object' && b.name && b.icon);
  }
});

// Note: email unique index is already declared via { unique: true } on the field above.
// Only the campus+karma compound index is added here.
userSchema.index({ campus: 1, karma: -1 });

export default mongoose.model("User", userSchema);