import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Post from '../src/models/post.model.js';
// We re-define Vote here just for the script since we'll delete the original file
const voteSchema = new mongoose.Schema({
  postId: mongoose.Schema.Types.ObjectId,
  userId: mongoose.Schema.Types.ObjectId,
});
const Vote = mongoose.model('Vote', voteSchema);

const runMigration = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");
    
    const posts = await Post.find({});
    console.log(`Found ${posts.length} posts. Starting migration...`);
    
    let totalVotesMigrated = 0;
    
    for (const post of posts) {
      const votes = await Vote.find({ postId: post._id });
      const voterIds = votes.map(v => v.userId.toString());
      
      // Auto-like own post if not already liked (Option 2 retroactively)
      if (post.author && !voterIds.includes(post.author.toString())) {
        voterIds.push(post.author.toString());
      }
  
      // Deduplicate
      const uniqueVoterIds = [...new Set(voterIds)];
      
      await Post.updateOne({ _id: post._id }, {
        $set: { upvotedBy: uniqueVoterIds, upvotes: uniqueVoterIds.length }
      });
      
      totalVotesMigrated += uniqueVoterIds.length;
    }
    
    console.log(`Successfully migrated ${totalVotesMigrated} votes to upvotedBy arrays and fixed counts!`);
    console.log("You can now safely drop the 'votes' collection in MongoDB.");
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
};

runMigration();
