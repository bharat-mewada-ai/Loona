import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function checkTokens() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ 
      expoPushToken: { $exists: true, $ne: null, $ne: '' } 
    }).select('name email campus');
    
    console.log('--- RECIPIENTS FOUND ---');
    users.forEach((u, i) => {
      console.log(`${i+1}. ${u.name} (${u.email}) - Campus: ${u.campus}`);
    });
    console.log('------------------------');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTokens();
