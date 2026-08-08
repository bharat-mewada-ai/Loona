import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Chat from "../models/chat.model.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { checkContent } from "../utils/moderation.js";
import logger from "../utils/logger.js";
import redis from "../utils/redis.js";
import mongoose from "mongoose";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- GOOGLE OAUTH LOGIN -----------------------------------------------------
export const googleLogin = async (req, res) => {
  const { token, campus, expoPushToken } = req.body;
  logger.info(`[GoogleLogin] Start - Token exists: ${!!token}, Campus: ${campus}`);

  try {
    if (!token) {
      logger.warn('[GoogleLogin] No token provided');
      return res.status(400).json({ error: "Google token is required" });
    }

    // ─── Verify Google Token ──────────────────────────────────────────────────
    let payload;
    try {
      logger.info('[GoogleLogin] Verifying ID Token...');
      
      // DEBUG: Log the actual audience from the token
      const decoded = jwt.decode(token);
      logger.info(`[GoogleLogin] DEBUG - Token Audience (aud): ${decoded?.aud}`);

      // Support multiple client IDs via environment variables (comma separated)
      const extraClientIds = (process.env.GOOGLE_EXTRA_CLIENT_IDS || "").split(',').map(id => id.trim());
      const webClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
      const allowedAudiences = [webClientId, ...extraClientIds].filter(Boolean);

      logger.info(`[GoogleLogin] Comparing token aud [${decoded?.aud}] with allowed audiences: ${JSON.stringify(allowedAudiences)}`);

      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: allowedAudiences, 
      });
      payload = ticket.getPayload();
      logger.info(`[GoogleLogin] ID Token Verified. Email: ${payload.email}, Audience: ${payload.aud}`);
    } catch (err) {
      logger.warn(`[GoogleLogin] ID Token verify failed: ${err.message}. Trying access token fallback...`);
      // Fallback: Try verifying as Access Token (common on Web)
      try {
        const { data } = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
        const allowedIds = [process.env.GOOGLE_CLIENT_ID, "329290971821-kh0a91v046d91hfauv9u6fk4k5nvmj96.apps.googleusercontent.com", "329290971821-116b0s90hp4dfr5aii772hk5cbs0t457.apps.googleusercontent.com"].filter(Boolean);
        if (!allowedIds.includes(data.aud) && !allowedIds.includes(data.azp)) {
          logger.error(`[GoogleLogin] Access Token aud mismatch: ${data.aud} / ${data.azp} vs ${JSON.stringify(allowedIds)}`);
          throw new Error("Token audience mismatch");
        }
        payload = {
          sub: data.sub,
          email: data.email,
        };
        logger.info(`[GoogleLogin] Access Token Verified. Email: ${payload.email}`);
      } catch (accessErr) {
        logger.error(`[GoogleLogin] Auth failed (both ID and Access): ${accessErr.message}`);
        return res.status(401).json({ error: "Invalid Google token (ID or Access)" });
      }
    }

    const { sub: googleId, email } = payload;
    logger.info(`[GoogleLogin] Looking for user with googleId: ${googleId}`);

    let user = await User.findOne({ googleId });


    if (!user) {
      // Check if user exists with the same email but no googleId (or different one)
      user = await User.findOne({ email });
      
      if (user) {
        // Link the existing account to this googleId
        user.googleId = googleId;
        try {
          await user.save();
        } catch (saveErr) {
          // If save fails due to race condition (googleId already exists on another doc), fetch that doc
          if (saveErr.code === 11000) {
            user = await User.findOne({ googleId });
          } else {
            throw saveErr;
          }
        }
      } else {
        // Truly new user
        if (!campus) return res.status(400).json({ error: "Campus is required for new users" });
        
        const prefixes = ["Bindaas", "Jugaadi", "Toofani", "Dhasu", "Gabru", "Dabang", "Shana", "Chulbuli", "Sanskari", "Bakar", "Masala", "Desi", "Tikka", "Naan", "Chai", "Samosa", "Jalebi"];
        const suffixes = ["Panda", "Ninja", "Ghost", "Pirate", "Ranger", "Pilot", "Guru", "Beast", "Knight", "King", "Queen", "Hero", "Wizard", "Professor", "Tiger", "Fox", "Hawk", "Lover", "Idol"];
        const randomPref = prefixes[Math.floor(Math.random() * prefixes.length)];
        const randomSuff = suffixes[Math.floor(Math.random() * suffixes.length)];
        const anonName = `${randomPref}_${randomSuff}_${Math.floor(Math.random() * 900 + 100)}`;
        try {
          user = await User.create({
            googleId,
            email,
            campus,
            name: anonName,
            avatar: "🦊",
          });
        } catch (createErr) {
          // If creation fails due to race condition, fetch the user who won the race
          if (createErr.code === 11000) {
            user = await User.findOne({ googleId });
          } else {
            throw createErr;
          }
        }
      }
    }

    // ─── Reactivate if account was scheduled for deletion ─────────────────────
    let reactivated = false;
    if (user && user.scheduledForDeletion) {
      const daysSinceDeletion = (Date.now() - new Date(user.deletionScheduledAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDeletion <= 30) {
        // Still within grace period — reactivate!
        user.scheduledForDeletion = false;
        user.deletionScheduledAt = null;
        reactivated = true;
        logger.info(`[GoogleLogin] Reactivated account for user ${user._id}`);
      } else {
        // Past 30 days — account should have been cleaned up by cron, but handle edge case
        return res.status(403).json({ error: "This account has been permanently deleted. Please create a new account." });
      }
    }

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });

    // Store refresh token and push token in user document
    user.refreshTokens.push(refreshToken);
    if (expoPushToken && expoPushToken.startsWith("ExponentPushToken[")) {
      user.expoPushToken = expoPushToken;
    }
    // Keep only last 5 tokens (limit devices)
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();
    await user.save();
    
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshTokens;
    
    res.json({ token: accessToken, refreshToken, user: userObj, reactivated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- STANDARD LOGIN (FOR ADMIN) ----------------------------------------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    // Explicitly select password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });

    user.refreshTokens.push(refreshToken);
    if (user.refreshTokens.length > 5) user.refreshTokens.shift();
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshTokens;

    res.json({ token: accessToken, refreshToken, user: userObj });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// --- REFRESH TOKEN -----------------------------------------------------------
export const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "Refresh token is required" });

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(401).json({ error: "Refresh token revoked or invalid" });
    }

    // Generate new access token
    const newAccessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    res.json({ token: newAccessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- GET ME ------------------------------------------------------------------
export const getMe = async (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];
  // Redis lock: Only do quest reset DB write ONCE per user per day
  const resetKey = `quest_reset:${req.user._id}:${todayStr}`;
  try {
    const alreadyReset = await redis.get(resetKey);
    if (!alreadyReset && req.user.lastQuestResetDate !== todayStr) {
      // Use targeted $set — NEVER call req.user.save() here because
      // getMe is called frequently and a full save would overwrite concurrent
      // potato changes from votes/comments happening at the same time.
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          dailyUpvotesCount: 0,
          dailyPostsCount: 0,
          questsCompletedToday: false,
          lastQuestResetDate: todayStr
        }
      });
      // Also patch req.user in memory so the response reflects reset state
      req.user.dailyUpvotesCount = 0;
      req.user.dailyPostsCount = 0;
      req.user.questsCompletedToday = false;
      req.user.lastQuestResetDate = todayStr;
      await redis.set(resetKey, '1', 'EX', 86400); // lock for 24h
    }
  } catch (e) {
    // Redis fail: fallback — still use targeted $set, not full save
    if (req.user.lastQuestResetDate !== todayStr) {
      await User.findByIdAndUpdate(req.user._id, {
        $set: {
          dailyUpvotesCount: 0,
          dailyPostsCount: 0,
          questsCompletedToday: false,
          lastQuestResetDate: todayStr
        }
      }).catch(() => {});
      req.user.dailyUpvotesCount = 0;
      req.user.dailyPostsCount = 0;
      req.user.questsCompletedToday = false;
      req.user.lastQuestResetDate = todayStr;
    }
  }

  const userObj = req.user.toObject();
  if (!userObj.tags) userObj.tags = [];

  // Calculate campusRank with 1 min Redis Cache for near-real-time updates
  const rankKey = `campusRank:${req.user._id}`;
  let rank = null;

  try {
    const cachedRank = await redis.get(rankKey);
    if (cachedRank) {
      rank = parseInt(cachedRank, 10);
    }
  } catch (err) {
    logger.warn(`[Redis] Get rank failed for user ${req.user._id}: ${err.message}`);
  }

  if (!rank) {
    try {
      rank = await User.countDocuments({
        campus: req.user.campus,
        potato: { $gt: req.user.potato }
      }) + 1;

      try {
        await redis.set(rankKey, rank, "EX", 60); // 1 min cache
      } catch (err) {
        // Safe to ignore Redis set failures
      }
    } catch (dbErr) {
      logger.error(`[getMe] Database rank count failed: ${dbErr.message}`);
      rank = null;
    }
  }

  userObj.campusRank = rank;
  res.json(userObj);
};

// --- LOGOUT ------------------------------------------------------------------
export const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) {
      req.user.refreshTokens = req.user.refreshTokens.filter(t => t !== refreshToken);
      await req.user.save();
    }
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- CAMPUS LIST -------------------------------------------------------------
export const getCampuses = async (req, res) => {
  res.json(["ogi", "lnct", "manit", "rgpv"]);
};

// --- LEADERBOARD -------------------------------------------------------------
export const getLeaderboard = async (req, res) => {
  const LEADERBOARD_CACHE_KEY = 'cache:leaderboard';
  const LEADERBOARD_TTL = 300; // 5 minutes

  let cached = null;
  try {
    cached = await redis.get(LEADERBOARD_CACHE_KEY);
  } catch (redisErr) {
    logger.warn(`[Redis] Leaderboard get failed: ${redisErr.message}`);
  }

  if (cached) {
    try {
      return res.json(JSON.parse(cached));
    } catch (parseErr) {
      logger.error(`[Redis] Leaderboard parse failed: ${parseErr.message}`);
    }
  }

  try {
    const [rawCampusWarData, topUsersData] = await Promise.all([
      User.aggregate([
        { $group: { _id: "$campus", potato: { $sum: "$potato" } } },
      ]),
      User.find().sort({ potato: -1 }).limit(10).select("name avatar potato campus").lean(),
    ]);

    // Ensure all 4 campuses are present even if they have 0 users/potatoes in the db
    const campusMap = new Map(rawCampusWarData.map(c => [c._id, c.potato]));
    const ALL_CAMPUSES = ["ogi", "lnct", "manit", "rgpv"];
    const campusWarData = ALL_CAMPUSES.map(campus => ({
      _id: campus,
      potato: campusMap.get(campus) || 0
    }));

    // Sort by potato count descending
    campusWarData.sort((a, b) => b.potato - a.potato);

    const payload = { campusWar: campusWarData, topUsers: topUsersData };

    try {
      await redis.set(LEADERBOARD_CACHE_KEY, JSON.stringify(payload), 'EX', LEADERBOARD_TTL);
    } catch (redisSetErr) {
      logger.warn(`[Redis] Leaderboard set failed: ${redisSetErr.message}`);
    }

    res.json(payload);
  } catch (err) {
    logger.error(`[getLeaderboard] Database query failed: ${err.message}`);
    res.status(500).json({ error: "Failed to fetch leaderboard data" });
  }
};

// --- UPDATE PROFILE ----------------------------------------------------------
export const updateProfile = async (req, res) => {
  const userId = req.user._id;
  try {
    const { avatar, name, bio, isPrivate, tags, notificationsEnabled, campus } = req.body;
    logger.info(`[UpdateProfile] Start for user ${userId}`);

    const updateData = {};
    if (avatar) updateData.avatar = avatar;
    if (name) {
      const existing = await User.findOne({ name, _id: { $ne: userId } });
      if (existing) return res.status(400).json({ error: "This name is already taken!" });
      updateData.name = name;
    }
    if (bio !== undefined) updateData.bio = bio;
    if (isPrivate !== undefined) updateData.isPrivate = isPrivate;
    if (tags !== undefined) updateData.tags = tags;
    if (notificationsEnabled !== undefined) updateData.notificationsEnabled = notificationsEnabled;
    if (campus !== undefined) updateData.campus = campus;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    // Background Cascade (Identity update across posts/comments)
    if (name || avatar) {
      (async () => {
        try {
          const cascadeUpdate = {};
          if (name) cascadeUpdate.anonName = name;
          if (avatar) cascadeUpdate.anonAvatar = avatar;

          await Promise.all([
            // Exclude confession posts — they always show as "Confession" / 🕳️
            Post.updateMany({ author: userId, type: { $ne: 'confess' } }, { $set: cascadeUpdate }),
            Comment.updateMany({ author: userId }, { $set: cascadeUpdate })
          ]);
          logger.info(`[UpdateProfile] Cascade identity update successful for ${userId}`);
        } catch (e) {
          console.error(`[UpdateProfile] Cascade error:`, e.message);
        }
      })();
    }

    const userObj = { ...updatedUser };
    delete userObj.password;
    if (!userObj.tags) userObj.tags = [];

    logger.info(`[UpdateProfile] Success for user ${userId}`);
    res.json(userObj);
  } catch (err) {
    logger.error(`[UpdateProfile] FATAL ERROR for user ${userId}:`, err.message);
    res.status(500).json({ 
      error: err.message, 
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    });
  }
};

// --- DELETE ACCOUNT (30-day soft delete) ------------------------------------
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Soft delete: schedule for deletion after 30 days
    req.user.scheduledForDeletion = true;
    req.user.deletionScheduledAt = new Date();
    // Revoke ALL refresh tokens — force logout on all devices
    req.user.refreshTokens = [];
    await req.user.save();

    logger.info('Account scheduled for deletion (30-day grace)', { userId });
    res.json({ 
      message: "Your account has been scheduled for deletion. All your data will be permanently deleted in 30 days. You can cancel by logging back in within 30 days.",
      scheduledForDeletion: true,
      deletionScheduledAt: req.user.deletionScheduledAt,
    });
  } catch (err) {
    logger.error('Delete Account Error:', { message: err.message });
    res.status(500).json({ error: err.message });
  }
};

// --- CANCEL DELETION --------------------------------------------------------
export const cancelDeletion = async (req, res) => {
  try {
    if (!req.user.scheduledForDeletion) {
      return res.status(400).json({ error: "Your account is not scheduled for deletion." });
    }
    req.user.scheduledForDeletion = false;
    req.user.deletionScheduledAt = null;
    await req.user.save();
    logger.info('Account deletion cancelled', { userId: req.user._id });
    res.json({ message: "Account deletion has been cancelled. Your account is fully restored." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- HARD DELETE (called by cron job only) ----------------------------------
export const hardDeleteExpiredAccounts = async () => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const expiredUsers = await User.find({
      scheduledForDeletion: true,
      deletionScheduledAt: { $lte: thirtyDaysAgo },
    }).select('_id').lean();

    if (expiredUsers.length === 0) {
      logger.info('[Cron] No expired accounts to delete.');
      return;
    }

    const userIds = expiredUsers.map(u => u._id);

    const [
      { default: Post },
      { default: Comment },
      { default: Chat },
      { default: BhandaraVote },
      { default: Notification },
    ] = await Promise.all([
      import('../models/post.model.js'),
      import('../models/comment.model.js'),
      import('../models/chat.model.js'),
      import('../models/bhandaraVote.model.js'),
      import('../models/notification.model.js'),
    ]);

    await Promise.all([
      Post.deleteMany({ author: { $in: userIds } }),
      Comment.deleteMany({ author: { $in: userIds } }),
      Chat.deleteMany({ participants: { $in: userIds } }),
      BhandaraVote.deleteMany({ userId: { $in: userIds } }),
      Notification.deleteMany({ recipient: { $in: userIds } }),
      User.deleteMany({ _id: { $in: userIds } }),
    ]);

    logger.info(`[Cron] Hard-deleted ${userIds.length} expired accounts.`, { userIds });
  } catch (err) {
    logger.error('[Cron] Hard delete cron error:', err.message);
  }
};

// --- BLOCK USER -------------------------------------------------------------
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot block yourself." });
    }

    const { default: Block } = await import("../models/block.model.js");
    const { default: redis } = await import("../utils/redis.js");
    
    // Use upsert-like logic to avoid duplicate errors
    await Block.findOneAndUpdate(
      { blocker: req.user._id, blocked: userId },
      { blocker: req.user._id, blocked: userId },
      { upsert: true }
    );

    // Invalidate blocks cache
    if (redis) await redis.del(`blocks:${req.user._id}`);

    res.json({ message: "User blocked successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- UNBLOCK USER -----------------------------------------------------------
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { default: Block } = await import("../models/block.model.js");
    
    await Block.findOneAndDelete({ blocker: req.user._id, blocked: userId });
    // Invalidate blocks cache
    const { default: redis } = await import("../utils/redis.js");
    if (redis) await redis.del(`blocks:${req.user._id}`);

    res.json({ message: "User unblocked successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- GET BLOCKED USERS ------------------------------------------------------
export const getBlockedUsers = async (req, res) => {
  try {
    const { default: Block } = await import("../models/block.model.js");
    const blocks = await Block.find({ blocker: req.user._id })
      .populate("blocked", "name avatar campus")
      .lean();
    
    res.json(blocks.map(b => b.blocked));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- REGISTER EXPO PUSH TOKEN ---------------------------------------------
export const registerPushToken = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token is required' });
    }
    if (!token.startsWith('ExponentPushToken[')) {
      return res.status(400).json({ error: 'Invalid Expo push token format' });
    }
    req.user.expoPushToken = token;
    await req.user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- GET PUBLIC PROFILE ------------------------------------------------------
export const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Fallback: If it's a name (string) instead of a 24-character hex ObjectId, search by name
    if (!mongoose.isValidObjectId(userId)) {
      const userByName = await User.findOne({ name: userId })
        .select("name avatar potato streak bio tags campus isPrivate postCount")
        .lean();
      
      if (!userByName) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.json(userByName);
    }

    const user = await User.findById(userId).select("name avatar potato streak bio tags campus isPrivate postCount").lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- UPDATE LOCATION --------------------------------------------------------
export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    req.user.location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
    // Bump lastActive so this user remains visible in Nearby (24h filter)
    req.user.lastActive = new Date();
    await req.user.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// --- GET NEARBY USERS -------------------------------------------------------
export const getNearbyUsers = async (req, res) => {
  try {
    const [longitude, latitude] = req.user.location.coordinates;
    if (longitude === 0 && latitude === 0) {
      return res.status(400).json({ error: "Your location is not set. Please update it first." });
    }

    // Exclude blocked users from the nearby list (both blocker & blocked)
    let blockedUserIds = [];
    try {
      const { default: Block } = await import("../models/block.model.js");
      const blocks = await Block.find({
        $or: [{ blocker: req.user._id }, { blocked: req.user._id }]
      }).lean();
      blockedUserIds = blocks.map(b => b.blocker.toString() === req.user._id.toString() ? b.blocked : b.blocker);
    } catch (blockErr) {
      // Non-blocking log
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const nearbyUsers = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "dist.calculated",
          maxDistance: 5000, // 5km limit
          query: { 
            _id: { $ne: req.user._id, $nin: blockedUserIds }, 
            campus: req.user.campus, 
            isBanned: false,
            isPrivate: { $ne: true }, // Exclude private/ghosted profiles
            lastActive: { $gte: twentyFourHoursAgo }
          },
          spherical: true,
        },
      },
      { $limit: 20 },
      { $project: { name: 1, avatar: 1, campus: 1, bio: 1, isVerified: 1, "dist.calculated": 1 } },
    ]);

    const formatted = nearbyUsers.map(u => {
      const d = u.dist.calculated;
      let vague = "On campus";
      if (d < 50) vague = "Very Close";
      else if (d < 200) vague = "Nearby";
      else if (d < 1000) vague = "On Campus";
      else vague = "Away";

      return {
        _id: u._id,
        name: u.name,
        avatar: u.avatar,
        bio: u.bio,
        isVerified: u.isVerified,
        vagueDistance: vague,
        distance: d
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- WAVE AT USER -----------------------------------------------------------
export const waveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ error: "You cannot wave at yourself." });
    }

    const WAVE_COST = 5;
    if (req.user.potato < WAVE_COST) {
      return res.status(400).json({
        error: `You need at least ${WAVE_COST} 🥔 Potatoes to wave! You currently have ${req.user.potato} 🥔.`
      });
    }

    // Atomically deduct potato only if the user still has enough.
    // Using findOneAndUpdate with a balance check prevents double-charges
    // on rapid retries / network glitches (wave tapped twice quickly).
    const afterWave = await User.findOneAndUpdate(
      { _id: req.user._id, potato: { $gte: WAVE_COST } },
      { $inc: { potato: -WAVE_COST } },
      { new: true }
    );
    if (!afterWave) {
      return res.status(400).json({
        error: `You need at least ${WAVE_COST} 🥔 Potatoes to wave! You currently have ${req.user.potato} 🥔.`
      });
    }
    req.user.potato = afterWave.potato; // sync for response

    try {
      await redis.del(`campusRank:${req.user._id}`);
    } catch (err) {
      logger.error("Rank invalidation failed in waveUser:", err.message);
    }

    const { createNotification } = await import("../utils/notificationService.js");
    const { default: NotificationModel } = await import("../models/notification.model.js");

    // Check if target user has already waved at us
    const hasReciprocalWave = await NotificationModel.findOne({
      recipient: req.user._id,
      sender: userId,
      type: "wave"
    }).lean();

    if (hasReciprocalWave) {
      const { default: Chat } = await import("../models/chat.model.js");
      let chat = await Chat.findOne({
        participants: { $all: [req.user._id, userId] },
        isGroup: false
      });

      if (!chat) {
        chat = await Chat.create({
          participants: [req.user._id, userId],
          isGroup: false,
          isAnonymous: true,
          anonAuthorId: req.user._id
        });
      }

      await Promise.all([
        createNotification({
          recipient: req.user._id,
          sender: userId,
          type: "system",
          title: "⚡ It's a Mutual Match!",
          body: "You and someone nearby waved at each other! Tap to chat for 0 Potatoes.",
          data: { chatId: chat._id.toString() }
        }),
        createNotification({
          recipient: userId,
          sender: req.user._id,
          type: "system",
          title: "⚡ It's a Mutual Match!",
          body: "You and someone nearby waved at each other! Tap to chat for 0 Potatoes.",
          data: { chatId: chat._id.toString() }
        })
      ]);

      return res.json({ ok: true, matched: true, chatId: chat._id });
    }

    // regular wave
    await createNotification({
      recipient: userId,
      sender: req.user._id,
      type: "wave",
      title: `👋 ${req.user.name} waved!`,
      body: `${req.user.name} is nearby and just waved at you. Tap to check their profile!`,
      data: { senderId: req.user._id.toString() }
    });

    res.json({ ok: true, matched: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
