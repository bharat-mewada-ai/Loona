import mongoose from "mongoose";

const campusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  id: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

const Campus = mongoose.model("Campus", campusSchema);
export default Campus;
