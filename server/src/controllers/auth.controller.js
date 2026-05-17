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

      // On Android, the audience can sometimes be the Android Client ID instead of the Web Client ID
      const androidClientId = "329290971821-kh0a91v046d91hfauv9u6fk4k5nvmj96.apps.googleusercontent.com";
      const webClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();

      logger.info(`[GoogleLogin] Comparing token aud [${decoded?.aud}] with required audiences [${webClientId}] and [${androidClientId}]`);

      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: [webClientId, androidClientId], 
      });
      payload = ticket.getPayload();
      logger.info(`[GoogleLogin] ID Token Verified. Email: ${payload.email}, Audience: ${payload.aud}`);
    } catch (err) {
      logger.warn(`[GoogleLogin] ID Token verify failed: ${err.message}. Trying access token fallback...`);
      // Fallback: Try verifying as Access Token (common on Web)
      try {
        const { data } = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
        if (data.aud !== process.env.GOOGLE_CLIENT_ID && data.azp !== process.env.GOOGLE_CLIENT_ID) {
          logger.error(`[GoogleLogin] Access Token aud mismatch: ${data.aud} vs ${process.env.GOOGLE_CLIENT_ID}`);
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
        
        const anonName = "Potato_" + Math.floor(Math.random() * 9000 + 1000);
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
    
    res.json({ token: accessToken, refreshToken, user: userObj });
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
  const userObj = req.user.toObject();
  if (!userObj.tags) userObj.tags = [];

  // Calculate globalRank with 5 min Redis Cache
  const { default: redis } = await import("../utils/redis.js");
  const rankKey = `globalRank:${req.user._id}`;
  let rank = await redis.get(rankKey);
  if (!rank) {
    // Optimization: Only count if potato is non-zero, otherwise rank is just "Low" or ignored
    if (req.user.potato > 0) {
      rank = await User.countDocuments({
        potato: { $gt: req.user.potato }
      }) + 1;
      await redis.set(rankKey, rank, 'EX', 600); // 10 min cache
    } else {
      rank = "N/A";
    }
  } else {
    rank = parseInt(rank, 10);
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
  res.json(["ogi", "lnct"]);
};

// --- LEADERBOARD -------------------------------------------------------------
export const getLeaderboard = async (req, res) => {
  try {
    const [campusWarData, topUsersData] = await Promise.all([
      User.aggregate([
        { $group: { _id: "$campus", karma: { $sum: "$potato" } } },
        { $sort: { karma: -1 } },
      ]),
      User.find().sort({ potato: -1 }).limit(10).select("name avatar potato campus").lean(),
    ]);

    res.json({ campusWar: campusWarData, topUsers: topUsersData });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
            Post.updateMany({ author: userId }, { $set: cascadeUpdate }),
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

// --- DELETE ACCOUNT ---------------------------------------------------------
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Import models needed for cascade delete
    const [
      { default: Post },
      { default: Comment },
      { default: Chat },
      { default: Vote },
      { default: BhandaraVote },
      { default: Notification },
    ] = await Promise.all([
      import('../models/post.model.js'),
      import('../models/comment.model.js'),
      import('../models/chat.model.js'),
      import('../models/vote.model.js'),
      import('../models/bhandaraVote.model.js'),
      import('../models/notification.model.js'),
    ]);

    // Cascade delete all user-generated content
    await Promise.all([
      Post.deleteMany({ author: userId }),
      Comment.deleteMany({ author: userId }),
      Chat.deleteMany({ participants: userId }),
      Vote.deleteMany({ userId }),
      BhandaraVote.deleteMany({ userId }),
      Notification.deleteMany({ recipient: userId }),
      User.findByIdAndDelete(userId),
    ]);

    logger.info('Account deleted with full cascade', { userId });
    res.json({ message: "Account and all associated data deleted successfully." });
  } catch (err) {
    logger.error('Delete Account Error:', { message: err.message });
    res.status(500).json({ error: err.message });
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
    const user = await User.findById(req.params.userId).select("name avatar potato streak bio tags campus isPrivate postCount").lean();
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

    const nearbyUsers = await User.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [longitude, latitude] },
          distanceField: "dist.calculated",
          maxDistance: 5000, // 5km limit
          query: { _id: { $ne: req.user._id }, campus: req.user.campus, isBanned: false },
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

    const { default: Notification } = await import("../models/notification.model.js");
    const { sendPushNotification } = await import("../utils/pushNotifications.js");

    // Create notification
    await Notification.create({
      recipient: userId,
      sender: req.user._id,
      type: "wave",
      title: "👋 Someone waved!",
      body: "A user nearby just waved at you. Say hi back!",
    });

    // Send push
    const { default: User } = await import("../models/user.model.js");
    const targetUser = await User.findById(userId).select("expoPushToken").lean();
    if (targetUser?.expoPushToken) {
      sendPushNotification(
        targetUser.expoPushToken,
        "👋 Someone waved!",
        "A user nearby just waved at you.",
        { type: "wave", senderId: req.user._id.toString() }
      );
    }

 res.json({ ok: true });
 } catch (err) {
 res.status(500).json({ error: err.message });
 }
};
