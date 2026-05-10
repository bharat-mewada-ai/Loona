import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  role: String,
  lastActive: Date
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function promote(email) {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    if (!email) {
      console.log('No email provided. Showing recent users:');
      const users = await User.find().sort({ lastActive: -1 }).limit(5);
      users.forEach(u => console.log(`- ${u.email} (${u.name}) | Role: ${u.role} | Last Active: ${u.lastActive}`));
      process.exit(0);
    }

    const user = await User.findOne({ email });
    if (!user) {
      console.log(`User with email ${email} not found.`);
      process.exit(1);
    }

    user.role = 'admin';
    await user.save();
    console.log(`SUCCESS: User ${email} has been promoted to ADMIN.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

const targetEmail = process.argv[2];
promote(targetEmail);
