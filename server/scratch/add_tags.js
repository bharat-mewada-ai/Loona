import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const UserSchema = new mongoose.Schema({
    email: String,
    tags: [String]
}, { strict: false });

const User = mongoose.model('User', UserSchema);

async function addTags() {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'bharatmewada477@gmail.com' });
    if (user) {
        user.tags = ['TestTag1', 'TestTag2'];
        await user.save();
        console.log('Tags added to bharatmewada477@gmail.com');
    } else {
        console.log('User not found');
    }
    await mongoose.disconnect();
}

addTags();
