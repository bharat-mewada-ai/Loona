import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const UserSchema = new mongoose.Schema({
    email: String,
    tags: [String]
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function clearTags() {
    await mongoose.connect(process.env.MONGO_URI);
    const result = await User.updateMany({}, { $set: { tags: [] } });
    console.log('Cleared tags for all users:', result.modifiedCount);
    await mongoose.disconnect();
}

clearTags();
