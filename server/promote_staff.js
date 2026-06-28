import mongoose from 'mongoose';
import User from './src/models/user.model.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

async function promoteUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // Promote all three to Super Admin
    const superAdmins = [
      'bharatmewada652@gmail.com', 
      'bharatmewada477@gmail.com',
      'piyushpatelyt@gmail.com'
    ];
    
    await User.updateMany(
      { email: { $in: superAdmins } },
      { role: 'admin' }
    );
    
    console.log('All three users are now Super Admins!');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

promoteUsers();
