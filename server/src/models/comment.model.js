import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  anonName: String,
  anonAvatar: String,
  content: { type: String, required: true },
  image: String, // For GIFs/Photos
  createdAt: { type: Date, default: Date.now }
});

commentSchema.index({ postId: 1, createdAt: -1 });

export default mongoose.model("Comment", commentSchema);
