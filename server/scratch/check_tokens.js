import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });
import mongoose from 'mongoose';
import User from '../src/models/user.model.js';

async function checkTokens() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ expoPushToken: { $regex: /^ExponentPushToken/ } }).select("name email expoPushToken");
    console.log(`Users with valid Expo tokens: ${users.length}`);
    console.log(JSON.stringify(users, null, 2));

    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

checkTokens();
