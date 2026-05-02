import mongoose from "mongoose";
import dotenv from "dotenv";
import Post from "./src/models/post.model.js";
import User from "./src/models/user.model.js";
import Comment from "./src/models/comment.model.js";
import { generateAnonIdentity } from "./src/utils/anonIdentity.js";

dotenv.config();

const inject = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");

  // Find latest post
  const post = await Post.findOne().sort({ createdAt: -1 });
  if (!post) {
    console.log("No posts found. Please create a post first.");
    process.exit(0);
  }

  // Create a fake user if one doesn't exist to own the comment
  let fakeUser = await User.findOne({ email: "fake@loona.app" });
  if (!fakeUser) {
    fakeUser = await User.create({
      name: "Fake User",
      email: "fake@loona.app",
      password: "password123",
      campus: "NIT",
      karma: 100,
    });
  }

  const identity = generateAnonIdentity(fakeUser._id.toString(), post._id.toString());
  
  await Comment.create({
    postId: post._id,
    author: fakeUser._id,
    anonName: identity.name,
    anonAvatar: identity.avatar,
    content: "This is a fake comment for testing! 👋 Let's chat!",
  });

  post.commentCount += 1;
  await post.save();

  console.log(`Injected fake comment into post: ${post.title}`);
  process.exit(0);
};

inject().catch(console.error);
