import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const UserSchema = new mongoose.Schema({
    email: String,
    tags: [String]
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function checkTags() {
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find().select('email tags');
    console.log('All Users:', users.map(u => ({ email: u.email, tags: u.tags })));
    await mongoose.disconnect();
}

checkTags();
