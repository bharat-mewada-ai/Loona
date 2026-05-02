import mongoose from "mongoose";

const bhandaraVoteSchema = new mongoose.Schema({
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
  vote: {
    type: String,
    enum: ["yes", "no"],
    required: true,
  },
}, { timestamps: true });

bhandaraVoteSchema.index({ postId: 1, userId: 1 }, { unique: true });

const BhandaraVote = mongoose.model("BhandaraVote", bhandaraVoteSchema);
export default BhandaraVote;
