import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["bug", "feature", "improvement", "other"],
      default: "other",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
