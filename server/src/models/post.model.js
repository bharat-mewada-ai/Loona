import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 120 },
  body: { type: String, maxlength: 5000 },
  campus: { type: String, required: true },
  type: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  anonName: String,
  anonAvatar: String,
  image: String,
  eventDate: Date,
  eventLocation: String,
  offerBrand: String,
  offerDiscount: String,
  externalLink: String,
  isExclusive: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  hashtags: [{ type: String }],
  upvotes: { type: Number, default: 0 },
  commentCount: { type: Number, default: 0 },
  reactions: {
    wow:       { type: Number, default: 0 },
    fire:      { type: Number, default: 0 },
    same:      { type: Number, default: 0 },
    skull:     { type: Number, default: 0 },
    spicy:     { type: Number, default: 0 },
    lit:       { type: Number, default: 0 },
    wholesome: { type: Number, default: 0 },
    hmm:       { type: Number, default: 0 },
    lmao:      { type: Number, default: 0 },
  },
  isPoll: { type: Boolean, default: false },
  pollOptions: [
    {
      text: String,
      votes: { type: Number, default: 0 }
    }
  ],
  pollVoters: {
    type: Map,
    of: Number, // Stores the index of the option the user voted for
    default: {}
  },
  // Duplicate-reaction prevention — maps userId → reaction emoji key
  // Duplicate-reaction prevention — maps userId → reaction emoji key
  reactedBy: {
    type: Map,
    of: String,
    default: {},
  },
  bhandaraCountYes: { type: Number, default: 0 },
  bhandaraCountNo: { type: Number, default: 0 },
  goingCount: { type: Number, default: 0 },
  goingBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  location: {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], default: [0, 0] }, // [longitude, latitude]
  },
  burnAfter24h: { type: Boolean, default: false },
  burnAt: { type: Date },
  isHot: { type: Boolean, default: false },
  score: { type: Number, default: 0 },
  reportCount: { type: Number, default: 0 },
  hidden: { type: Boolean, default: false },
  reports: [
    {
      reason: String,
      reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reportedAt: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
});

// ─── Indexes ──────────────────────────────────────────────────────────────────
postSchema.index({ location: "2dsphere" });
// Existing
postSchema.index({ campus: 1, createdAt: -1 });
postSchema.index({ type: 1, createdAt: -1 });
postSchema.index({ score: -1, createdAt: -1 });
postSchema.index({ burnAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL

// Compound indexes for feed queries (5k-user scale)
postSchema.index({ campus: 1, hidden: 1, score: -1 });
postSchema.index({ campus: 1, hidden: 1, createdAt: -1 });
postSchema.index({ type: 1, hidden: 1, score: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ title: "text", body: "text" });

export default mongoose.model("Post", postSchema);