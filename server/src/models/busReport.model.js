import mongoose from "mongoose";

const busReportSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      trim: true,
    },
    route: {
      type: String,
      required: true,
      trim: true,
    },
    parkingSpot: {
      type: String,
      required: true,
      trim: true,
    },
    campus: {
      type: String,
      required: true,
    },
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Auto-delete / expire reports index (not using TTL index, we filter by time in query)
busReportSchema.index({ campus: 1, createdAt: -1 });

export default mongoose.model("BusReport", busReportSchema);
