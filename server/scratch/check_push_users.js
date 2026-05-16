import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);

const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));

const users = await User.find({
  expoPushToken: { $exists: true, $ne: "" }
}).select("name email lastActive").lean();

console.log(`\n=== ${users.length} Users with Push Tokens (got the notification) ===\n`);
users.forEach(u => {
  console.log(`  • ${u.name} — ${u.email}`);
  console.log(`    Last active: ${u.lastActive}`);
});

await mongoose.disconnect();
