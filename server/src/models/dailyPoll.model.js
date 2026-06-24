import mongoose from "mongoose";

const dailyPollSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    options: [
      {
        text: { type: String, required: true },
        votes: { type: Number, default: 0 }
      }
    ],
    votedUsers: {
      type: Map,
      of: Number, // Maps User ID (string) to their selected Option Index (number)
      default: {}
    },
    activeDate: {
      type: String, // Format: YYYY-MM-DD
      required: true,
      unique: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("DailyPoll", dailyPollSchema);
