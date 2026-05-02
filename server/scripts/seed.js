import mongoose from "mongoose";
import dotenv from "dotenv";
import Post from "./src/models/post.model.js";

dotenv.config();

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/loona");
  
  await Post.deleteMany({});
  
  const dummyPosts = [
    {
      title: "NIT canteen bhaiya gives extra samosa if you say \"bhaiya jai hind\"",
      body: "Tried it 3 times. 3 for 3. You are welcome.",
      campus: "nit",
      type: "confess",
      vibe: "funny",
      anonName: "EagleNIT_01",
      anonAvatar: "🦅",
      upvotes: 342,
      commentCount: 87,
      reactions: ["😂", "🔥", "👀"],
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
