import "dotenv/config";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

const notifSchema = new mongoose.Schema({}, { strict: false, timestamps: true });
const Notification = mongoose.model("Notification", notifSchema);

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model("User", userSchema);

await mongoose.connect(MONGO_URI);

const recent = await Notification.find({})
  .sort({ createdAt: -1 })
  .limit(5)
  .lean();

console.log("\n=== Last 5 Notifications ===\n");
for (const n of recent) {
  const recipient = await User.findById(n.recipient).select("name email").lean();
  const sender    = await User.findById(n.sender).select("name email").lean();
  console.log({
    type:      n.type,
    title:     n.title,
    body:      n.body,
    recipient: recipient ? `${recipient.name} (${recipient.email})` : n.recipient,
    sender:    sender    ? `${sender.name} (${sender.email})`       : n.sender,
    time:      n.createdAt,
  });
  console.log("---");
}

await mongoose.disconnect();
