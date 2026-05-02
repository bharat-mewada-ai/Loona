import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";
import Vote from "../models/vote.model.js";
import BhandaraVote from "../models/bhandaraVote.model.js";
import { checkContent } from "../utils/moderation.js";
import { generateAnonIdentity } from "../utils/anonIdentity.js";
import { scheduleBurn } from "../utils/burnQueue.js";
import { sendPush } from "../utils/pushNotifications.js";
import { invalidateCache } from "../../server.js";

// Helper to update post score (hot algorithm)
const updatePostScore = (post) => {
  const hours = (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60);
  const reactionCount = Object.values(post.reactions || {}).reduce((a, b) => a + b, 0);
  post.score = post.upvotes * 2 + post.commentCount * 1.5 + reactionCount - hours * 0.5;
  if (post.score > 50) post.isHot = true;
};

/* ---------------- CREATE POST ---------------- */
export const createPost = async (req, res) => {
  const { title, body, campus, type, burnAfter24h, image, eventDate, eventLocation } = req.body;
  if (!title || !campus) return res.status(400).json({ error: "Title and campus are required" });

  // Reject base64 images — clients must upload to Cloudinary first and send the CDN URL
  if (image && image.startsWith("data:")) {
    return res.status(400).json({ error: "Base64 images are not accepted. Upload to Cloudinary and send the URL.", code: "BASE64_REJECTED" });
  }
  // Basic URL sanity check — must be http/https if provided
  if (image && !/^https?:\/\/.+/.test(image)) {
    return res.status(400).json({ error: "Invalid image URL format.", code: "INVALID_IMAGE_URL" });
  }

  const moderation = checkContent(`${title} ${body || ""}`);
  if (moderation.level === "bad") return res.status(400).json({ error: moderation.reason });

  const identity = generateAnonIdentity(req.user._id.toString(), Date.now().toString());
  const postData = {
    title, body, campus, type: type || "all",
    author: req.user._id, 
    anonName: identity.name, 
    anonAvatar: req.user.avatar || identity.avatar,
    image, eventDate, eventLocation, 
    burnAfter24h: burnAfter24h || false,
    burnAt: burnAfter24h ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
    location: req.body.location || { type: "Point", coordinates: [0, 0] },
  };

  const post = await Post.create(postData);
  if (burnAfter24h) await scheduleBurn(post._id);

  // ─── Update user stats + streak ─────────────────────────────────────────────────────
  req.user.postCount += 1;
  req.user.karma += 5;

  // Streak logic — compare calendar dates only (ignore time) to avoid timezone drift
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!req.user.lastPostDate) {
    // Very first post ever
    req.user.streak = 1;
  } else {
    const lastPost = new Date(req.user.lastPostDate);
    lastPost.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today - lastPost) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Already posted today — keep streak as-is (don't double-increment)
    } else if (diffDays === 1) {
      // Posted yesterday — extend the streak
      req.user.streak = (req.user.streak || 0) + 1;
    } else {
      // Gap of 2+ days — reset
      req.user.streak = 1;
    }
  }

  req.user.lastPostDate = new Date();
  await req.user.save();

  // Award badges based on milestones
  const updatedBadges = req.user.badges || [];
  let badgesChanged = false;

  if (req.user.postCount === 1 && !updatedBadges.includes("✍️ First Post")) {
    req.user.badges.push("✍️ First Post");
    badgesChanged = true;
  }
  if (req.user.streak >= 7 && !updatedBadges.includes("🔥 Week Streak")) {
    req.user.badges.push("🔥 Week Streak");
    badgesChanged = true;
  }
  if (post.isHot && !updatedBadges.includes("🌶️ Hot Poster")) {
    req.user.badges.push("🌶️ Hot Poster");
    badgesChanged = true;
  }
  if (badgesChanged) await req.user.save();

  // Invalidate feed and leaderboard cache so new post/karma appears immediately
  invalidateCache("/api/posts");
  invalidateCache("/api/auth/leaderboard");

  const io = req.app.get("io");
  if (io) io.emit("leaderboardUpdate");

  res.status(201).json(post);
};

/* ---------------- GET ALL POSTS (lean for perf) ---------------- */
export const getPosts = async (req, res) => {
  const { campus, type, page = 1, limit = 10 } = req.query;
  let filter = { hidden: false };
  if (campus && campus !== "all") filter.campus = campus;
  if (type && type !== "all") filter.type = type;

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
    Post.countDocuments(filter),
  ]);

  // Batch check if current user has voted for these posts
  let postIdsWithVotes = new Set();
  if (req.user && posts.length > 0) {
    const userVotes = await Vote.find({
      userId: req.user._id,
      postId: { $in: posts.map(p => p._id) }
    }).select('postId').lean();
    postIdsWithVotes = new Set(userVotes.map(v => v.postId.toString()));
  }

  const formattedPosts = posts.map(p => ({
    ...p,
    hasVoted: postIdsWithVotes.has(p._id.toString())
  }));

  res.json({ posts: formattedPosts, total, page: parseInt(page), hasMore: total > page * limit });
};

/* ---------------- GET SINGLE POST (lean) ---------------- */
export const getPostById = async (req, res) => {
  const post = await Post.findById(req.params.id).lean();
  if (!post || post.hidden) return res.status(404).json({ error: "Post not found" });
  
  let hasVoted = false;
  if (req.user) {
    const vote = await Vote.findOne({ userId: req.user._id, postId: post._id }).lean();
    hasVoted = !!vote;
  }

  res.json({ ...post, hasVoted });
};

/* ---------------- VOTE POST (toggle vote) ---------------- */
export const votePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Not found" });

  const userId = req.user._id;
  const existingVote = await Vote.findOne({ postId: post._id, userId });

  if (existingVote) {
    // Unvote
    await Vote.deleteOne({ _id: existingVote._id });
    post.upvotes = Math.max(0, post.upvotes - 1);
  } else {
    // Vote
    await Vote.create({ postId: post._id, userId });
    post.upvotes += 1;
  }

  updatePostScore(post);
  await post.save();

  // Karma logic
  const postAuthor = await User.findByIdAndUpdate(
    post.author,
    { $inc: { karma: existingVote ? -1 : 1, upvotesReceived: existingVote ? -1 : 1 } },
    { new: true }
  );

  // Award Legend badge when author's karma crosses 100
  if (postAuthor && postAuthor.karma >= 100 && !postAuthor.badges.includes("🏆 Legend")) {
    postAuthor.badges.push("🏆 Legend");
    await postAuthor.save();
  }

  // Award Hot Poster badge to author when post becomes hot
  if (post.isHot && postAuthor && !postAuthor.badges.includes("🌶️ Hot Poster")) {
    postAuthor.badges.push("🌶️ Hot Poster");
    await postAuthor.save();
  }

  invalidateCache("/api/posts");
  invalidateCache("/api/auth/leaderboard");
  const io = req.app.get("io");
  if (io) io.emit("leaderboardUpdate");

  res.json({ upvotes: post.upvotes, score: post.score, hasVoted: !existingVote });
};

/* ---------------- VOTE BHANDARA (Yes/No verification) ---------------- */
export const voteBhandara = async (req, res) => {
  const { vote } = req.body; // 'yes' or 'no'
  if (!['yes', 'no'].includes(vote)) return res.status(400).json({ error: "Invalid vote" });

  const post = await Post.findById(req.params.id);
  if (!post || post.type !== 'bhandara') return res.status(404).json({ error: "Bhandara post not found" });

  const uid = req.user._id;

  const existingVote = await BhandaraVote.findOne({ postId: post._id, userId: uid });

  if (existingVote) {
    if (existingVote.vote === vote) {
      // Toggle off
      await BhandaraVote.deleteOne({ _id: existingVote._id });
      if (vote === 'yes') post.bhandaraCountYes = Math.max(0, post.bhandaraCountYes - 1);
      else post.bhandaraCountNo = Math.max(0, post.bhandaraCountNo - 1);
    } else {
      // Change vote
      const oldVote = existingVote.vote;
      existingVote.vote = vote;
      await existingVote.save();
      
      if (vote === 'yes') {
        post.bhandaraCountYes += 1;
        post.bhandaraCountNo = Math.max(0, post.bhandaraCountNo - 1);
      } else {
        post.bhandaraCountNo += 1;
        post.bhandaraCountYes = Math.max(0, post.bhandaraCountYes - 1);
      }
    }
  } else {
    // New vote
    await BhandaraVote.create({ postId: post._id, userId: uid, vote });
    if (vote === 'yes') post.bhandaraCountYes += 1;
    else post.bhandaraCountNo += 1;
  }

  await post.save();
  res.json({ bhandaraCountYes: post.bhandaraCountYes, bhandaraCountNo: post.bhandaraCountNo });
};

/* ---------------- STATS ---------------- */
export const getStats = async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [totalPosts, todayPosts, campusBreakdown] = await Promise.all([
    Post.countDocuments({ hidden: false }),
    Post.countDocuments({ createdAt: { $gte: startOfToday }, hidden: false }),
    Post.aggregate([
      { $match: { hidden: false } },
      { $group: { _id: "$campus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  res.json({ totalPosts, todayPosts, campusBreakdown });
};

/* ---------------- COMMENTS ---------------- */
export const addComment = async (req, res) => {
  const { content, image } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const moderation = checkContent(content);
  if (moderation.level === "bad") return res.status(400).json({ error: moderation.reason });

  const identity = generateAnonIdentity(req.user._id.toString(), post._id.toString());
  const comment = await Comment.create({
    postId: post._id, author: req.user._id,
    anonName: identity.name, 
    anonAvatar: req.user.avatar || identity.avatar,
    content, image,
  });

  post.commentCount += 1;
  updatePostScore(post);
  await post.save();
  await User.findByIdAndUpdate(req.user._id, { $inc: { commentsCount: 1, karma: 2 } });

  // Push notification to post author (non-blocking)
  if (post.author.toString() !== req.user._id.toString()) {
    const author = await User.findById(post.author).select("expoPushToken").lean();
    sendPush(
      author?.expoPushToken,
      "💬 New Comment",
      `Someone replied to your post: "${post.title.slice(0, 40)}"`,
      { type: "comment", postId: post._id.toString() }
    );
  }

  invalidateCache("/api/auth/leaderboard");
  const io = req.app.get("io");
  if (io) io.emit("leaderboardUpdate");

  res.status(201).json(comment);
};

export const getComments = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ postId: req.params.id })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Comment.countDocuments({ postId: req.params.id }),
  ]);

  res.json({ comments, total, hasMore: total > skip + comments.length });
};

export const deleteComment = async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ error: "Not found" });
  if (comment.author.toString() !== req.user._id.toString())
    return res.status(403).json({ error: "Unauthorized" });
  await comment.deleteOne();
  await Post.findByIdAndUpdate(req.params.id, { $inc: { commentCount: -1 } });
  res.json({ message: "Deleted" });
};

/* ---------------- DELETE POST ---------------- */
export const deletePost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Not found" });
  if (post.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    return res.status(403).json({ error: "Unauthorized" });
  await post.deleteOne();
  invalidateCache("/api/posts");
  res.json({ message: "Deleted" });
};

/* ---------------- REACT (duplicate-reaction guard) ---------------- */
export const reactPost = async (req, res) => {
  const { reaction } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Not found" });
  if (post.reactions[reaction] === undefined)
    return res.status(400).json({ error: "Invalid reaction", code: "INVALID_REACTION" });

  const userId = req.user._id.toString();
  const previousReaction = post.reactedBy.get(userId);

  if (previousReaction === reaction) {
    // Same reaction again — toggle off (remove)
    post.reactions[reaction] = Math.max(0, post.reactions[reaction] - 1);
    post.reactedBy.delete(userId);
  } else {
    // New or changed reaction
    if (previousReaction) {
      // Remove old reaction count first
      post.reactions[previousReaction] = Math.max(0, post.reactions[previousReaction] - 1);
    }
    post.reactions[reaction] += 1;
    post.reactedBy.set(userId, reaction);
  }

  updatePostScore(post);
  await post.save();
  invalidateCache("/api/posts");
  res.json({ reactions: post.reactions, userReaction: post.reactedBy.get(userId) ?? null });
};

/* ---------------- REPORT ---------------- */
export const reportPost = async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Not found" });

  // Prevent duplicate reports from same user
  const alreadyReported = post.reports.some(
    (r) => r.reporter?.toString() === req.user._id.toString()
  );
  if (alreadyReported) {
    return res.status(400).json({ error: "Already reported", code: "DUPLICATE_REPORT" });
  }

  const { reason } = req.body;
  post.reports.push({ reason, reporter: req.user._id });
  post.reportCount = (post.reportCount || 0) + 1;
  if (post.reportCount >= 3) post.hidden = true;
  await post.save();
  res.json({ message: "Reported" });
};

/* ---------------- MY POSTS ---------------- */
export const getMyPosts = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const [posts, total] = await Promise.all([
    Post.find({ author: req.user._id, hidden: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean(),
    Post.countDocuments({ author: req.user._id, hidden: false }),
  ]);
  res.json({ posts, total, page: parseInt(page), hasMore: total > page * limit });
};

/* ---------------- ADMIN MODERATION ---------------- */
export const getReportedPosts = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }
    const posts = await Post.find({ "reports.0": { $exists: true } }).sort({ reportCount: -1 }).lean();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const dismissReports = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post not found" });
    
    post.reports = [];
    post.reportCount = 0;
    post.hidden = false;
    await post.save();
    
    res.json({ message: "Reports dismissed" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};