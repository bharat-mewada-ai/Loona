import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function promoteUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // 1. Promote Super Admins
    const superAdmins = ['bharatmewada652@gmail.com', 'bharatmewada477@gmail.com'];
    await User.updateMany(
      { email: { $in: superAdmins } },
      { role: 'admin' }
    );
    console.log('Super Admins promoted');

    // 2. Promote Piyush
    const piyushEmail = 'piyushpatelyt@gmail.com';
    await User.findOneAndUpdate({ email: piyushEmail }, { role: 'moderator' });
    console.log(`Piyush (${piyushEmail}) promoted to Moderator`);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

promoteUsers();
