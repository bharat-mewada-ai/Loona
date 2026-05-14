import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function findPiyush() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ 
      $or: [
        { name: /piyush/i },
        { email: /piyush/i }
      ]
    });
    console.log('Search Results:', users.map(u => ({ name: u.name, email: u.email })));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

findPiyush();
