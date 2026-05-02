import mongoose from "mongoose";

const voteSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
}, { timestamps: true });

// Prevent duplicate votes at the database level
voteSchema.index({ postId: 1, userId: 1 }, { unique: true });

const Vote = mongoose.model("Vote", voteSchema);
export default Vote;
