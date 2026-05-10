import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  isVerified: Boolean
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function promote(email) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    user.role = 'admin';
    user.isVerified = true;
    await user.save();

    console.log(`SUCCESS: ${email} is now an ADMIN and VERIFIED 😎`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

promote(process.argv[2] || 'bharatmewada652@gmail.com');
