import mongoose from "mongoose";
import dotenv from "dotenv";
import Post from "./src/models/post.model.js";

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/loona");
  
  await Post.deleteMany({});
  
  const dummyPosts = [
    {
      title: "OGI library 2nd floor AC is finally fixed!",
      body: "Summer exams just got 10x better. See you guys there at 10 AM.",
      campus: "ogi",
      type: "thought",
      vibe: "wholesome",
      anonName: "CoolReader_OGI",
      anonAvatar: "📚",
      upvotes: 156,
      commentCount: 24,
      reactions: ["💖", "🧊"],
      isHot: true,
      createdAt: new Date(Date.now() - 12 * 60000) // 12 mins ago
    },
    {
      title: "OGI placement cell sent the same circular 4 times",
      body: "Counting as 4 placement drives on LinkedIn now.",
      campus: "ogi",
      type: "confess",
      vibe: "funny",
      anonName: "SilentFox_OGI",
      anonAvatar: "🦊",
      upvotes: 218,
      commentCount: 45,
      reactions: ["💀", "😂", "🤦"],
      isHot: true,
      createdAt: new Date(Date.now() - 34 * 60000) // 34 mins ago
    },
    {
      title: "Honest question: does anyone attend 9 AM at LNCT?",
      body: "My attendance is 74% and I have literally never been before 10:30.",
      campus: "lnct",
      type: "thought",
      vibe: "funny",
      anonName: "GhostLNCT_77",
      anonAvatar: "🌙",
      upvotes: 89,
      commentCount: 12,
      reactions: ["😂", "💯"],
      isHot: false,
      createdAt: new Date(Date.now() - 60 * 60000) // 1 hour ago
    }
  ];

  await Post.insertMany(dummyPosts);
  console.log("Database seeded with posts!");
  process.exit();
};

seed();
