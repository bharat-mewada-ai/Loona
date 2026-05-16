import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'server/.env') });

const checkErrors = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const ErrorLog = mongoose.model('ErrorLog', new mongoose.Schema({
      message: String,
      stack: String,
      createdAt: Date
    }), 'errorlogs');
    
    const count = await ErrorLog.countDocuments();
    console.log(`Total errors in DB: ${count}`);
    
    const recent = await ErrorLog.find().sort({ createdAt: -1 }).limit(5).lean();
    console.log('Recent errors:', JSON.stringify(recent, null, 2));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err);
  }
};

checkErrors();
