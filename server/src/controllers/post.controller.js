import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import User from "../models/user.model.js";
import Chat from "../models/chat.model.js";
import { getCampusMultiplier } from "../utils/streakHelper.js";
import Vote from "../models/vote.model.js";
import Report from "../models/report.model.js";
import BhandaraVote from "../models/bhandaraVote.model.js";
import AuditLog from "../models/auditLog.model.js";
import redis from "../utils/redis.js";
import { checkContent } from "../utils/moderation.js";
import { generateAnonIdentity } from "../utils/anonIdentity.js";
import { scheduleBurn } from "../utils/burnQueue.js";
import { sendPushNotification } from "../utils/pushNotifications.js";
import { invalidateCache } from "../utils/cache.js";
import { createNotification } from "../utils/notificationService.js";
import { isCloudinaryUrl } from "../utils/uploadImage.js";
import { checkAndAwardBadges } from "../utils/badgeService.js";
import logger from "../utils/logger.js";

// Helper to update post score (hot algorithm)
const updatePostScore = (post) => {
  const hours = (Date.now() - new Date(post.createdAt)) / (1000 * 60 * 60);
  const reactionCount = Object.values(post.reactions || {}).reduce((a, b) => a + b, 0);
  post.score = post.upvotes * 2 + post.commentCount * 1.5 + reactionCount - hours * 0.5;
  if (post.score > 50) post.isHot = true;
};

/* ---------------- CREATE POST ---------------- */
export const createPost = async (req, res) => {
  const {
    title, body, type, burnAfter24h, image, images,
    eventDate, eventLocation, offerBrand, offerDiscount, externalLink, isExclusive,
    isPoll, pollOptions
  } = req.body;

  // Always use the authenticated user's campus from the DB — never trust the client-sent value.
  // This prevents 403 campus-mismatch errors caused by stale client state.
  const campus = req.user.campus;

  const hasAnyImage = !!image || (images && images.length > 0);
  const isPhotoStory = type === 'stories' && hasAnyImage;
  const isConfession = type === 'confess';
  // Confessions are body-only — no title required
  if (!title && !isPhotoStory && !isConfession) return res.status(400).json({ error: "Title is required" });
  if (isConfession && !body) return res.status(400).json({ error: "Confession body is required" });
  const safeTitle = title || '';

  if (!campus) return res.status(400).json({ error: "Your account has no campus set. Please log out and log in again." });

  // ─── Double-Post Lock (Idempotency) ──────────────────────────────────────────
  const lockKey = `lock:post:${req.user._id}`;
  if (redis && redis.status === "ready") {
    try {
      const existing = await redis.set(lockKey, '1', 'EX', 5, 'NX');
      if (!existing) {
        return res.status(429).json({ error: 'Please wait a moment before posting again.' });
      }
    } catch (err) {
      // If Redis fails, still allow the post
    }
  }

  // Reject base64 images — clients must upload to Cloudinary first and send the CDN URL
  if (image && image.startsWith("data:")) {
    return res.status(400).json({ error: "Base64 images are not accepted. Upload to Cloudinary and send the URL.", code: "BASE64_REJECTED" });
  }
  // CDN Whitelist — Only allow images from our Cloudinary
  if (image && !isCloudinaryUrl(image)) {
    return res.status(400).json({
      error: "Untrusted image source. Only Cloudinary images are allowed.",
      code: "UNTRUSTED_IMAGE_SOURCE"
    });
  }
  if (images && Array.isArray(images)) {
    for (const img of images) {
      if (img && img.startsWith("data:")) {
        return res.status(400).json({ error: "Base64 images are not accepted. Upload to Cloudinary and send the URL.", code: "BASE64_REJECTED" });
      }
      if (img && !isCloudinaryUrl(img)) {
        return res.status(400).json({
          error: "Untrusted image source. Only Cloudinary images are allowed.",
          code: "UNTRUSTED_IMAGE_SOURCE"
        });
      }
    }
  }

  const moderation = checkContent(`${safeTitle} ${body || ""}`);
  if (moderation.level === "bad") return res.status(400).json({ error: moderation.reason });

  let anonName = req.user.name;
  let anonAvatar = req.user.avatar;

  // ─── Anonymity: For confessions, use a fixed "Confession" identity ──────────────
  // No random IDs — confessions are always shown as "Confession" with 🕳️ avatar
  if (type === "confess") {
    anonName = "Confession";
    anonAvatar = "🕳️";
  }

  const cleanImages = images || (image ? [image] : []);
  const postData = {
    title: safeTitle, body, campus, type: type || "all",
    author: req.user._id,
    anonName,
    anonAvatar,
    image: image || (cleanImages.length > 0 ? cleanImages[0] : undefined),
    images: cleanImages,
    eventDate, eventLocation,
    offerBrand, offerDiscount, externalLink, isExclusive,
    burnAfter24h: burnAfter24h || false,
    burnAt: burnAfter24h ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
    location: req.body.location || { type: "Point", coordinates: [0, 0] },
    isPoll: isPoll || false,
    pollOptions: isPoll && pollOptions ? pollOptions.map(opt => ({ text: opt, votes: 0 })) : [],
    hashtags: `${safeTitle} ${body || ""}`.match(/#[a-zA-Z0-9_]+/g) 
      ? [...new Set(`${safeTitle} ${body || ""}`.match(/#[a-zA-Z0-9_]+/g).map(t => t.toLowerCase()))] 
      : [],
  };

  const post = await Post.create(postData);

  res.status(201).json(post);

  // ─── Background Tasks ──────────────────────────────────────────────────────
  // These are important but shouldn't block the user's response
  (async () => {
    try {
      // ── Streak & Badge Logic (Background) ──
      const user = await User.findById(req.user._id);
      if (user) {
        // Update user stats
        user.postCount = (user.postCount || 0) + 1;

        // Apply campus multiplier to post potato payout
        const multiplier = await getCampusMultiplier(user.campus);
        user.potato = (user.potato || 0) + (5 * multiplier);

        // Daily Quest: Create 1 post
        const todayStr = new Date().toISOString().split("T")[0];
        if (user.lastQuestResetDate !== todayStr) {
          user.dailyUpvotesCount = 0;
          user.dailyPostsCount = 0;
          user.questsCompletedToday = false;
          user.lastQuestResetDate = todayStr;
        }

        user.dailyPostsCount = (user.dailyPostsCount || 0) + 1;

        let questCompletedJustNow = false;
        if (user.dailyPostsCount >= 1 && user.dailyUpvotesCount >= 3 && !user.questsCompletedToday) {
          user.questsCompletedToday = true;
          user.potato += 5; // Reward +5 potatoes
          questCompletedJustNow = true;
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        if (!user.lastPostDate) {
          user.streak = 1;
        } else {
          const lastPost = new Date(user.lastPostDate);
          lastPost.setUTCHours(0, 0, 0, 0);
          const diffDays = Math.round((today.getTime() - lastPost.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) user.streak = (user.streak || 0) + 1;
          else if (diffDays > 1) user.streak = 1;
        }
        user.lastPostDate = new Date();
        await checkAndAwardBadges(user);
        await user.save();

        if (questCompletedJustNow) {
          await createNotification({
            recipient: user._id,
            sender: user._id,
            type: "system",
            title: "⚡ Daily Quest Completed!",
            body: "You created a post today and earned +5 Potatoes! 🥔",
            data: { type: "potato_update" }
          });
        }

        if (redis && redis.status === "ready") {
          try {
            await redis.del(`campusRank:${user._id}`);
          } catch (err) {
            logger.error("Rank invalidation failed in createPost:", err.message);
          }
        }
      }

      if (burnAfter24h) await scheduleBurn(post._id);

      // Mentions parsing
      const textToParse = `${title} ${body || ""}`;
      const mentions = textToParse.match(/@[a-zA-Z0-9_]+/g);
      if (mentions) {
        const usernames = [...new Set(mentions.map(m => m.slice(1)))].slice(0, 5);
        const mentionedUsers = await User.find({ name: { $in: usernames } }).select('_id');
        for (const u of mentionedUsers) {
          if (u._id.toString() !== req.user._id.toString()) {
            createNotification({
              recipient: u._id,
              sender: req.user._id,
              type: "mention",
              title: "You were mentioned! 🏷️",
              body: `Someone mentioned you in a new post.`,
              data: { postId: post._id }
            });
          }
        }
      }

      invalidateCache("/api/v1/posts");
      invalidateCache("/api/v1/auth/leaderboard");

      const io = req.app.get("io");
      if (io) io.emit("leaderboardUpdate");
    } catch (bgErr) {
      logger.error("[Post] Background task error:", bgErr.message);
    }
  })();
};

/* ---------------- GET ALL POSTS (lean for perf) ---------------- */
export const getPosts = async (req, res) => {
  const { campus, type, cursor, limit = 10 } = req.query;
  let filter = { hidden: false };
  if (campus && campus !== "all") filter.campus = campus;
  if (type && type !== "all") {
    if (type.includes(",")) {
      filter.type = { $in: type.split(",") };
    } else {
      filter.type = type;
    }
  }
  if (cursor) {
    filter._id = { $lt: cursor };
  }

  if (req.user) {
    try {
      const blockKey = `blocks:${req.user._id}`;
      let blockedIds;
      let cachedBlocks = null;
      if (redis && redis.status === "ready") {
        try {
          cachedBlocks = await redis.get(blockKey);
        } catch (err) {
          logger.error('Error fetching blocks from Redis:', err.message);
        }
      }
      
      if (cachedBlocks) {
        blockedIds = JSON.parse(cachedBlocks);
      } else {
        const { default: Block } = await import("../models/block.model.js");
        const blocks = await Block.find({ blocker: req.user._id }).select('blocked').lean();
        blockedIds = blocks.map(b => b.blocked);
        if (redis && redis.status === "ready") {
          try {
            await redis.set(blockKey, JSON.stringify(blockedIds), 'EX', 300);
          } catch (err) {
            logger.error('Error setting blocks in Redis:', err.message);
          }
        }
      }

      if (blockedIds.length > 0) {
        filter.author = { $nin: blockedIds };
      }
    } catch (err) {
      logger.error('Error fetching blocks for feed:', err.message);
    }
  }

  const posts = await Post.find(filter)
      .hint(filter.campus ? { campus: 1, hidden: 1, _id: -1 } : { hidden: 1, _id: -1 })
      .populate("author", "bio isVerified tags name avatar isPremium badges")
      .select("-reports")
      .sort({ _id: -1 })
      .limit(parseInt(limit) + 1) // Fetch one extra to determine hasMore
      .lean();

  // Fetch top 3 contributors for campus
  let topUserIds = [];
  try {
    const topKey = `top3:${filter.campus || 'all'}`;
    let cachedTop = null;
    if (redis && redis.status === "ready") {
      cachedTop = await redis.get(topKey);
    }
    if (cachedTop) {
      topUserIds = JSON.parse(cachedTop);
    } else {
      const topUsersQuery = filter.campus ? { campus: filter.campus } : {};
      const topUsers = await User.find(topUsersQuery).sort({ potato: -1 }).limit(3).select("_id").lean();
      topUserIds = topUsers.map(u => u._id.toString());
      if (redis && redis.status === "ready") {
        await redis.set(topKey, JSON.stringify(topUserIds), 'EX', 3600); // cache 1 hour
      }
    }
  } catch(e) {}

  // Batch check if current user has voted for these posts
  let postIdsWithVotes = new Set();
  if (req.user && posts.length > 0) {
    const userVotes = await Vote.find({
      userId: req.user._id,
      postId: { $in: posts.map(p => p._id) }
    }).select('postId').lean();
    postIdsWithVotes = new Set(userVotes.map(v => v.postId.toString()));
  }

  const hasMore = posts.length > parseInt(limit);
  if (hasMore) posts.pop(); // Remove the extra post
  const nextCursor = hasMore ? posts[posts.length - 1]._id : null;

  const formattedPosts = posts.map(p => {
    const userId = req.user?._id?.toString();
    const userVote = p.isPoll && userId && p.pollVoters ? (p.pollVoters[userId] ?? null) : null;
    const isSaved = req.user ? req.user.savedPosts.some(sid => sid.toString() === p._id.toString()) : false;
    const hasGone = req.user && p.goingBy ? p.goingBy.some(gid => gid.toString() === userId) : false;

    // Cleanup internal maps before sending to client
    const { pollVoters, reactedBy, reports, goingBy, ...rest } = p;
    
    if (p.type === 'confess') {
      rest.author = null;
    }

    const authorId = rest.author?._id?.toString();
    const isTopContributor = p.type !== 'confess' && topUserIds.includes(authorId);
    if (rest.author) {
      rest.author.isTopContributor = isTopContributor;
    }

    return {
      ...rest,
      hasVoted: postIdsWithVotes.has(p._id.toString()),
      userVote,
      isSaved,
      hasGone,
      isTopContributor: p.type !== 'confess' ? isTopContributor : false
    };
  });

  res.json({ posts: formattedPosts, total: -1, nextCursor, hasMore });
};

/* ---------------- GET SINGLE POST (lean) ---------------- */
export const getPostById = async (req, res) => {
  const post = await Post.findById(req.params.id)
    .populate("author", "bio isVerified tags name avatar isPremium badges")
    .select("-reports")
    .lean();
  if (!post || post.hidden) return res.status(404).json({ error: "Post not found" });

  let hasVoted = false;
  if (req.user) {
    const vote = await Vote.findOne({ userId: req.user._id, postId: post._id }).lean();
    hasVoted = !!vote;
  }

  const userId = req.user?._id?.toString();
  const userVote = post.isPoll && userId && post.pollVoters ? (post.pollVoters[userId] ?? null) : null;
  const isSaved = req.user ? req.user.savedPosts.some(sid => sid.toString() === post._id.toString()) : false;

  // Cleanup - Keep author to allow profile navigation
  const { pollVoters, reactedBy, reports, ...rest } = post;

  if (rest.type === 'confess') {
    rest.author = null;
  }

  res.json({ ...rest, hasVoted, userVote, isSaved });
};

/* ---------------- VIEW POST ---------------- */
export const viewPost = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true }).select("views");
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json({ views: post.views });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

  // Karma logic for author (adjusted with campus multiplier)
  const multiplier = await getCampusMultiplier(post.campus);
  const potatoChange = existingVote ? -(3 * multiplier) : (3 * multiplier);

  let postAuthor;
  if (post.author.toString() === req.user._id.toString()) {
    // If the voter is the author themselves, update req.user directly to avoid stale document writes
    req.user.potato = (req.user.potato || 0) + potatoChange;
    req.user.upvotesReceived = (req.user.upvotesReceived || 0) + (existingVote ? -1 : 1);
    postAuthor = req.user;

    await checkAndAwardBadges(postAuthor);
    // Always save — previously this was conditional and skipped new upvotes with no badge
    await req.user.save();
  } else {
    // If different users, update the author in the DB atomically
    postAuthor = await User.findByIdAndUpdate(
      post.author,
      { $inc: { potato: potatoChange, upvotesReceived: existingVote ? -1 : 1 } },
      { new: true }
    );

    if (postAuthor) {
      const badgeAwarded = await checkAndAwardBadges(postAuthor);
      if (badgeAwarded) {
        await postAuthor.save();
      }
      if (redis && redis.status === "ready") {
        try {
          await redis.del(`campusRank:${post.author}`);
        } catch (err) {
          logger.error("Rank invalidation failed in votePost:", err.message);
        }
      }
    }
  }

  // Track voter stats & Daily Quest: Upvote 3 posts
  if (!existingVote) {
    req.user.upvotesGiven += 1;

    const todayStr = new Date().toISOString().split("T")[0];
    if (req.user.lastQuestResetDate !== todayStr) {
      req.user.dailyUpvotesCount = 0;
      req.user.dailyPostsCount = 0;
      req.user.questsCompletedToday = false;
      req.user.lastQuestResetDate = todayStr;
    }

    req.user.dailyUpvotesCount = (req.user.dailyUpvotesCount || 0) + 1;

    let voterQuestCompletedJustNow = false;
    if (req.user.dailyUpvotesCount >= 3 && req.user.dailyPostsCount >= 1 && !req.user.questsCompletedToday) {
      req.user.questsCompletedToday = true;
      req.user.potato += 5; // Reward +5 potatoes
      voterQuestCompletedJustNow = true;
    }

    // Save voter — applies upvotesGiven, dailyUpvotesCount, and any quest potato bonus.
    // For self-voters this also persists changes made in the author block above.
    await req.user.save();

    if (voterQuestCompletedJustNow) {
      await createNotification({
        recipient: req.user._id,
        sender: req.user._id,
        type: "system",
        title: "⚡ Daily Quest Completed!",
        body: "You upvoted 3 posts today and earned +5 Potatoes! 🥔",
        data: { type: "potato_update" }
      });
    }
  }

  // ─── Trigger Notification (High-Dopamine Template Randomization) ──────────────────────────────────────────────────
  if (!existingVote && post.author.toString() !== req.user._id.toString()) {
    const postSnippet = `"${post.title.substring(0, 20)}${post.title.length > 20 ? '...' : ''}"`;
    const templates = [
      { title: "New Potato! 🥔", body: `Someone upvoted your post ${postSnippet}` },
      { title: "🔥 Going Hot!", body: `Your post ${postSnippet} just received an upvote! Keep it up.` },
      { title: "✨ Sweet Validation!", body: `A peer upvoted your post ${postSnippet}!` },
      { title: "📈 Potato Alert!", body: `Your stats are rising! Someone upvoted your post.` }
    ];
    const picked = templates[Math.floor(Math.random() * templates.length)];

    await createNotification({
      recipient: post.author,
      sender: req.user._id,
      type: "upvote",
      title: picked.title,
      body: picked.body,
      data: { postId: post._id, type: "potato_update" }
    });
  }

  await invalidateCache("/api/v1/posts");
  await invalidateCache("/api/v1/auth/leaderboard");
  const io = req.app.get("io");
  if (io) {
    io.emit("leaderboardUpdate");
    // Emit to post author so their balance updates in real-time
    if (postAuthor) {
      io.to(`user:${post.author}`).emit("potato_update", { potato: postAuthor.potato });
    }
    // Also emit to the voter so their own balance pill updates instantly.
    // (Only emit separately if voter is NOT the author — author event already sent above)
    if (post.author.toString() !== req.user._id.toString()) {
      io.to(`user:${req.user._id}`).emit("potato_update", { potato: req.user.potato });
    }
  }

  // Return voterPotato so client can patch authStore.user.potato immediately
  res.json({ upvotes: post.upvotes, score: post.score, hasVoted: !existingVote, voterPotato: req.user.potato });
};

/* ---------------- VOTE POLL (Atomic) ---------------- */
export const votePoll = async (req, res) => {
  const { optionIndex } = req.body;
  const postId = req.params.id;
  const userId = req.user._id.toString();

  if (optionIndex === undefined || optionIndex < 0) {
    return res.status(400).json({ error: "Invalid option index" });
  }

  try {
    // 1. Check if post exists and is a poll
    const post = await Post.findById(postId).select('isPoll pollVoters pollOptions');
    if (!post || !post.isPoll) return res.status(404).json({ error: "Poll not found" });

    // 2. Check if user already voted
    if (post.pollVoters.has(userId)) {
      return res.status(400).json({ error: "You have already voted in this poll" });
    }

    if (optionIndex >= post.pollOptions.length) {
      return res.status(400).json({ error: "Invalid option index" });
    }

    // 3. Atomic update: increment votes[index] and set pollVoters[userId]
    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId, [`pollVoters.${userId}`]: { $exists: false } },
      {
        $inc: { [`pollOptions.${optionIndex}.votes`]: 1 },
        $set: { [`pollVoters.${userId}`]: optionIndex }
      },
      { new: true, runValidators: true }
    );

    if (!updatedPost) {
      return res.status(400).json({ error: "Voting failed (maybe you already voted?)" });
    }

    await invalidateCache("/api/v1/posts");
    res.json({ pollOptions: updatedPost.pollOptions, userVote: optionIndex });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

export const getStats = async (req, res) => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalPosts, todayPosts, totalUsers, dau, campusBreakdown, moodStats] = await Promise.all([
    Post.countDocuments({ hidden: false }),
    Post.countDocuments({ createdAt: { $gte: startOfToday }, hidden: false }),
    User.countDocuments(),
    User.countDocuments({ lastActive: { $gte: twentyFourHoursAgo } }),
    Post.aggregate([
      { $match: { hidden: false } },
      { $group: { _id: "$campus", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    // Campus Mood
    Post.aggregate([
      { $match: { hidden: false } },
      { $group: {
          _id: null,
          wow: { $sum: "$reactions.wow" },
          fire: { $sum: "$reactions.fire" },
          same: { $sum: "$reactions.same" },
          skull: { $sum: "$reactions.skull" },
          spicy: { $sum: "$reactions.spicy" },
          lit: { $sum: "$reactions.lit" },
          wholesome: { $sum: "$reactions.wholesome" },
          hmm: { $sum: "$reactions.hmm" },
          lmao: { $sum: "$reactions.lmao" }
      }}
    ])
  ]);

  res.json({ 
    totalPosts, 
    todayPosts, 
    totalUsers, 
    dau, 
    campusBreakdown, 
    mood: moodStats[0] || {} 
  });
};

export const getDetailedStats = async (req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [topPosts, activityData] = await Promise.all([
    // Top 5 posts by score in last 7 days
    Post.find({ createdAt: { $gte: sevenDaysAgo }, hidden: false })
      .sort({ upvotes: -1, commentCount: -1 })
      .limit(5)
      .populate("author", "name email avatar")
      .lean(),

    // Activity by hour for last 24 hours
    Post.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, hidden: false } },
      {
        $group: {
          _id: { $hour: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ])
  ]);

  // Format activity data to ensure all hours are represented
  const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
    const hourData = activityData.find(d => d._id === i);
    return { hour: `${i}:00`, count: hourData ? hourData.count : 0 };
  });

  res.json({ topPosts, hourlyActivity });
};

export const toggleSavePost = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    const isSaved = user.savedPosts.some(p => p.toString() === id);
    if (isSaved) {
      user.savedPosts = user.savedPosts.filter(p => p.toString() !== id);
    } else {
      user.savedPosts.push(id);
    }
    await user.save();
    res.json({ saved: !isSaved });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

export const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "savedPosts",
      match: { hidden: false },
      populate: { path: "author", select: "name avatar isVerified" }
    });

    // Sort by latest first (reverse order of array if needed, or we can just return)
    const posts = user.savedPosts.reverse().map(p => {
      if (p && p.type === 'confess') {
        const postObj = p.toObject ? p.toObject() : p;
        postObj.author = null;
        return postObj;
      }
      return p;
    });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------- COMMENTS ---------------- */
export const addComment = async (req, res) => {
  const { content, image, parentId } = req.body;
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });

  const moderation = checkContent(content);
  if (moderation.level === "bad") return res.status(400).json({ error: moderation.reason });

  // CDN Whitelist for comments
  if (image && !isCloudinaryUrl(image)) {
    return res.status(400).json({ error: "Untrusted image source.", code: "UNTRUSTED_IMAGE_SOURCE" });
  }

  const comment = await Comment.create({
    postId: post._id,
    author: req.user._id,
    anonName: req.user.name,
    anonAvatar: req.user.avatar,
    content,
    image,
    parentId: parentId || null
  });

  // ─── Parse Mentions (Max 5) ────────────────────────────────────────────────
  const mentions = content.match(/@[a-zA-Z0-9_]+/g);
  if (mentions) {
    const usernames = [...new Set(mentions.map(m => m.slice(1)))].slice(0, 5);
    const mentionedUsers = await User.find({ name: { $in: usernames } }).select('_id');
    for (const u of mentionedUsers) {
      if (u._id.toString() !== req.user._id.toString()) {
        createNotification({
          recipient: u._id,
          sender: req.user._id,
          type: "mention",
          title: "You were mentioned! 🏷️",
          body: `Someone mentioned you in a comment.`,
          data: { postId: post._id }
        });
      }
    }
  }

  post.commentCount += 1;
  updatePostScore(post);
  await post.save();

  // Update user stats (adjusted with campus multiplier)
  req.user.commentsCount = (req.user.commentsCount || 0) + 1;
  const multiplierVal = await getCampusMultiplier(req.user.campus);
  req.user.potato += (2 * multiplierVal);

  await checkAndAwardBadges(req.user);
  await req.user.save();
  if (redis && redis.status === "ready") {
    try {
      await redis.del(`campusRank:${req.user._id}`);
    } catch (err) {
      logger.error("Rank invalidation failed in addComment:", err.message);
    }
  }

  // ─── Trigger Notification (High-Dopamine Randomization) ──────────────────────────────────────────────────
  if (post.author.toString() !== req.user._id.toString()) {
    const postSnippet = `"${post.title.substring(0, 20)}${post.title.length > 20 ? '...' : ''}"`;
    const templates = [
      { title: "New Comment! 💬", body: `Someone replied to your post: ${postSnippet}` },
      { title: "🤫 Gossip Alert!", body: `Someone just replied to your anonymous post: ${postSnippet}` },
      { title: "👀 Read the reply!", body: `A peer is sharing their thoughts on your post: ${postSnippet}` },
      { title: "💬 Fresh Feedback!", body: `Your post ${postSnippet} has a new comment thread active.` }
    ];
    const picked = templates[Math.floor(Math.random() * templates.length)];

    await createNotification({
      recipient: post.author,
      sender: req.user._id,
      type: "comment",
      title: "New Comment! 💬",
      body: `Someone replied to your post: "${post.title.substring(0, 30)}${post.title.length > 30 ? '...' : ''}"`,
      data: { postId: post._id }
    });
  }

  await invalidateCache("/api/v1/posts");
  await invalidateCache("/api/v1/auth/leaderboard");
  const io = req.app.get("io");
  if (io) io.emit("leaderboardUpdate");

  res.status(201).json(comment);
};

export const getComments = async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const [comments, total] = await Promise.all([
    Comment.find({ postId: req.params.id })
      .populate('author', 'isVerified')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Comment.countDocuments({ postId: req.params.id }),
  ]);

  const formattedComments = comments.map(c => {
    const authorIsVerified = c.author?.isVerified || false;
    const { author, ...rest } = c;
    return { ...rest, authorIsVerified, author: author?._id }; // Still return author ID for ownership checks
  });

  res.json({ comments: formattedComments, total, hasMore: total > skip + comments.length });
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

  // ─── Trigger Notification ──────────────────────────────────────────────────
  if (!previousReaction && post.author.toString() !== req.user._id.toString()) {
    const icons = { spicy: "🌶️", lit: "🔥", lmao: "🤣", skull: "💀", wholesome: "🥺", hmm: "🤔" };
    createNotification({
      recipient: post.author,
      sender: req.user._id,
      type: "reaction",
      title: "New Vibe! ✨",
      body: `Someone reacted ${icons[reaction] || ""} to your post: "${post.title.substring(0, 30)}${post.title.length > 30 ? '...' : ''}"`,
      data: { postId: post._id }
    });
  }

  await invalidateCache("/api/v1/posts");
  if (redis && redis.status === "ready") {
    try {
      await redis.del(`campusRank:${post.author}`);
    } catch (err) {
      logger.error("Rank invalidation failed in reactPost:", err.message);
    }
  }
  res.json({ reactions: post.reactions, userReaction: post.reactedBy.get(userId) ?? null });
};

/* ---------------- REPORT ---------------- */
export const reportPost = async (req, res) => {
  const { reason } = req.body;
  const postId = req.params.id;
  const userId = req.user._id;

  if (!reason) return res.status(400).json({ error: "Reason is required" });

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: "Post not found" });

    // 1. Create report
    await Report.create({
      targetType: "post",
      targetId: postId,
      reporter: userId,
      reason
    });

    // 2. Increment count (Threshold is now 3, but NO auto-hide per user request)
    post.reportCount = (post.reportCount || 0) + 1;
    
    // Threshold check for internal flagging (not hiding)
    if (post.reportCount >= 3) {
      // We could set a 'isFlagged' flag if we want, but user wants it visible until mod deletes.
    }

    post.reports.push({ reason, reporter: userId });
    await post.save();

    // Increment criminal count for the author
    if (post.author) {
      const isFirstReport = post.reportCount === 1;
      await User.findByIdAndUpdate(post.author, {
        $inc: {
          totalReportsCount: 1,
          reportedPostsCount: isFirstReport ? 1 : 0
        }
      });
    }

    res.json({ message: "Reported successfully. Moderators will review it." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------------- DELETE ---------------- */
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });

    // Allow author OR staff (Admin/Mod) to delete
    const isStaff = ['admin', 'moderator', 'super-admin'].includes(req.user.role);
    if (post.author.toString() !== req.user._id.toString() && !isStaff) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const authorId = post.author;
    const postTitle = post.title || "your post";

    await Post.findByIdAndDelete(req.params.id);

    // ─── Audit Log (staff actions only) ────────────────────────────────────────
    if (isStaff) {
      try {
        await AuditLog.create({
          action: "POST_DELETE",
          performedBy: req.user._id,
          targetId: req.params.id,
          targetType: "Post",
          details: `Deleted post by ${authorId}. Content: "${(postTitle).substring(0, 40)}..."`
        });
      } catch (auditErr) {
        logger.error("[deletePost] AuditLog failed:", auditErr.message);
      }
    }

    // ─── Notify Author if deleted by Staff & Deduct Potatoes if reported ───
    if (isStaff && authorId.toString() !== req.user._id.toString()) {
      let penaltyApplied = false;
      let updatedAuthor = null;
      if (post.reportCount > 0) {
        updatedAuthor = await User.findByIdAndUpdate(authorId, { $inc: { potato: -20 } }, { new: true });
        penaltyApplied = true;
      }

      createNotification({
        recipient: authorId,
        sender: req.user._id,
        type: "system",
        title: "Post Removed 🚫",
        body: `Your post "${postTitle.substring(0, 30)}..." was removed for violating community guidelines.${penaltyApplied ? ' 20 Potatoes have been deducted as a penalty.' : ''}`,
        data: { action: 'delete', type: penaltyApplied ? 'potato_update' : undefined }
      });

      if (penaltyApplied && updatedAuthor) {
        const io = req.app.get("io");
        if (io) {
          io.to(`user:${authorId}`).emit("potato_update", { potato: updatedAuthor.potato });
        }
      }
    }

    await invalidateCache("/api/v1/posts");
    res.json({ message: "Deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------------- MY POSTS ---------------- */
export const getMyPosts = async (req, res) => {
  const { cursor, limit = 10 } = req.query;
  const filter = { author: req.user._id, hidden: false };
  if (cursor) filter._id = { $lt: cursor };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .select("-reports -reactedBy") // Keep author ID for profile navigation
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .lean(),
    Post.countDocuments({ author: req.user._id, hidden: false }),
  ]);
  const hasMore = posts.length === parseInt(limit);
  const nextCursor = hasMore ? posts[posts.length - 1]._id : null;
  
  res.json({ posts, total, nextCursor, hasMore });
};

/* ---------------- SEARCH ---------------- */
export const searchPosts = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const posts = await Post.find({
      $text: { $search: q },
      hidden: false
    }, {
      score: { $meta: "textScore" }
    })
      .sort({ score: { $meta: "textScore" } })
      .populate("author", "bio isVerified name avatar")
      .select("-reports -reactedBy")
      .limit(20)
      .lean();

    const formattedPosts = posts.map(p => {
      if (p.type === 'confess') {
        p.author = null;
      }
      return p;
    });

    res.json(formattedPosts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const searchUsers = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  try {
    const users = await User.find({
      name: { $regex: q, $options: "i" },
      // Only show public users or whatever logic
    })
      .select("name avatar campus potato")
      .limit(10)
      .lean();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------------- ADMIN MODERATION ---------------- */
export const getReportedPosts = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: "Forbidden: Staff access only" });
    }
    const posts = await Post.find({ "reports.0": { $exists: true } })
      .populate("author", "name email avatar")
      .populate("reports.reporter", "name email")
      .sort({ reportCount: -1 })
      .lean();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const dismissReports = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
      return res.status(403).json({ error: "Forbidden: Staff access only" });
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
export const getUserPosts = async (req, res) => {
  const { userId } = req.params;
  const { cursor, limit = 10 } = req.query;

  const targetUser = await User.findById(userId).select("isPrivate").lean();
  if (!targetUser) return res.status(404).json({ error: "User not found" });

  if (targetUser.isPrivate && req.user._id.toString() !== userId) {
    return res.json({ posts: [], total: 0, isPrivate: true });
  }

  const filter = { author: userId, hidden: false };
  if (cursor) filter._id = { $lt: cursor };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .select("-reports -reactedBy")
      .sort({ _id: -1 })
      .limit(parseInt(limit))
      .lean(),
    Post.countDocuments({ author: userId, hidden: false }),
  ]);
  
  const hasMore = posts.length === parseInt(limit);
  const nextCursor = hasMore ? posts[posts.length - 1]._id : null;

  res.json({ posts, total, nextCursor, hasMore, isPrivate: false });
};

export const toggleGoing = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);
    if (!post) return res.status(404).json({ error: "Post not found" });

    const hasGone = post.goingBy ? post.goingBy.some(uid => uid.toString() === req.user._id.toString()) : false;

    if (hasGone) {
      post.goingBy = post.goingBy.filter(uid => uid.toString() !== req.user._id.toString());
      post.goingCount = Math.max(0, post.goingCount - 1);
    } else {
      if (!post.goingBy) post.goingBy = [];
      post.goingBy.push(req.user._id);
      post.goingCount = (post.goingCount || 0) + 1;
    }

    await post.save();
    res.json({ hasGone: !hasGone, goingCount: post.goingCount });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
};

/* ---------------- TRENDING TAGS ---------------- */
export const getTrendingTags = async (req, res) => {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tags = await Post.aggregate([
      { $match: { createdAt: { $gte: twentyFourHoursAgo }, hidden: false } },
      { $unwind: "$hashtags" },
      { $group: { _id: "$hashtags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json(tags.map(t => ({ tag: t._id, count: t.count })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
