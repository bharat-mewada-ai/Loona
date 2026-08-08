import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
  targetType: { 
    type: String, 
    enum: ["post", "comment", "user", "chat"], 
    required: true 
  },
  targetId: { 
    type: mongoose.Schema.Types.ObjectId, 
    required: true 
  },
  reporter: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  reason: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["pending", "resolved", "dismissed"], 
    default: "pending" 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

reportSchema.index({ targetId: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ targetId: 1, reporter: 1 }, { unique: true });

export default mongoose.model("Report", reportSchema);
