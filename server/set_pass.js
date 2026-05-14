import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function setPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const hash = await bcrypt.hash('admin123', 10);
    await User.findOneAndUpdate({ email: 'bharatmewada652@gmail.com' }, { password: hash });
    console.log('Password successfully set to admin123');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

setPassword();
