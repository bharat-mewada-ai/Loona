
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Post from '../src/models/post.model.js';
import User from '../src/models/user.model.js';

dotenv.config();

async function testSearch() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const samplePost = await Post.findOne();
    const query = samplePost ? samplePost.title.split(' ')[0] : 'a';
    console.log(`Searching for: ${query}`);

    // Test searchPosts
    const posts = await Post.find({
      $or: [
        { title: { $regex: query, $options: "i" } },
        { body: { $regex: query, $options: "i" } }
      ],
      hidden: false
    })
    .sort({ createdAt: -1 })
    .populate("author", "bio isVerified")
    .select("-reports -reactedBy")
    .limit(5)
    .lean();

    console.log(`Found ${posts.length} posts:`);
    posts.forEach(p => console.log(`- ${p.title} (Author Verified: ${p.author?.isVerified})`));

    // Test searchUsers
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } }
      ]
    })
    .limit(5)
    .select("name avatar karma campus isVerified")
    .lean();

    console.log(`Found ${users.length} users:`);
    users.forEach(u => console.log(`- ${u.name} (${u.campus}) (Verified: ${u.isVerified})`));

  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await mongoose.connection.close();
  }
}

testSearch();
