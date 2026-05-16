import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);

const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }));

const email = "bharatmewada652@gmail.com";
const result = await User.findOneAndUpdate(
  { email },
  { $set: { isVerified: true } },
  { new: true }
);

if (result) {
  console.log(`\n✅ Success! User ${result.name} (${email}) is now VERIFIED.`);
  console.log(`Current isVerified status: ${result.isVerified}`);
} else {
  console.log(`\n❌ Error: User with email ${email} not found.`);
}

await mongoose.disconnect();
