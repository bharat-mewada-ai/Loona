import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import axios from "axios";
import { OAuth2Client } from "google-auth-library";
import { checkContent } from "../utils/moderation.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- GOOGLE OAUTH LOGIN -----------------------------------------------------
export const googleLogin = async (req, res) => {
  try {
    const { token, campus } = req.body;
    if (!token) return res.status(400).json({ error: "Google token is required" });

    // ─── Verify Google Token ──────────────────────────────────────────────────
    let payload;
    try {
      // Try verifying as ID Token first
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      // Fallback: Try verifying as Access Token (common on Web)
      try {
        const { data } = await axios.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`);
        if (data.aud !== process.env.GOOGLE_CLIENT_ID && data.azp !== process.env.GOOGLE_CLIENT_ID) {
          throw new Error("Token audience mismatch");
        }
        payload = {
          sub: data.sub,
          email: data.email,
        };
      } catch (accessErr) {
        return res.status(401).json({ error: "Invalid Google token (ID or Access)" });
      }
    }

    const { sub: googleId, email } = payload;

    let user = await User.findOne({ googleId });

    if (!user) {
      // Check if user exists with the same email but no googleId (or different one)
      user = await User.findOne({ email });
      
      if (user) {
        // Link the existing account to this googleId
        user.googleId = googleId;
        await user.save();
      } else {
        // Truly new user
        if (!campus) return res.status(400).json({ error: "Campus is required for new users" });
        
        const anonName = "Potato_" + Math.floor(Math.random() * 9000 + 1000);
        user = await User.create({
          googleId,
          email,
          campus,
          name: anonName,
          avatar: "🦊",
        });
      }
    }

    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "30d" });

    // Store refresh token in user document
    user.refreshTokens.push(refreshToken);
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
    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    
    res.json({ token: newAccessToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- GET ME ------------------------------------------------------------------
export const getMe = async (req, res) => {
  const userObj = req.user.toObject();
  if (!userObj.tags) userObj.tags = [];
  res.json(userObj);
};

// --- LOGOUT ------------------------------------------------------------------
export const logout = async (req, res) => {
  // Stateless JWT doesn't need server-side logout, but we can invalidate if needed
  res.json({ message: "Logged out" });
};

// --- CAMPUS LIST -------------------------------------------------------------
export const getCampuses = async (req, res) => {
  res.json(["nit", "ogi", "lnct"]);
};

// --- LEADERBOARD -------------------------------------------------------------
export const getLeaderboard = async (req, res) => {
  try {
    const [campusWarData, topUsersData] = await Promise.all([
      User.aggregate([
        { $group: { _id: "$campus", karma: { $sum: "$karma" } } },
        { $sort: { karma: -1 } },
      ]),
      User.find().sort({ karma: -1 }).limit(10).select("name avatar karma campus").lean(),
    ]);
    res.json({ campusWar: campusWarData, topUsers: topUsersData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- UPDATE PROFILE ----------------------------------------------------------
export const updateProfile = async (req, res) => {
  try {
    const { avatar, name, bio, isPrivate, tags } = req.body;
    
    // Check name availability if it's being changed
    if (name) {
      const existing = await User.findOne({ name, _id: { $ne: req.user._id } });
      if (existing) return res.status(400).json({ error: "This name is already taken. Try another one!" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (avatar) user.avatar = avatar;
    if (name) user.name = name;
    if (bio !== undefined) user.bio = bio;
    if (isPrivate !== undefined) user.isPrivate = isPrivate;
    if (tags !== undefined) user.tags = tags;
    if (req.body.notificationsEnabled !== undefined) user.notificationsEnabled = req.body.notificationsEnabled;

    console.log('--- SAVING USER WITH TAGS ---', user.tags);
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    if (!userObj.tags) userObj.tags = [];
    
    console.log('--- PROFILE UPDATED ---', { email: userObj.email, tags: userObj.tags });
    res.json(userObj);
  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ error: err.message });
  }
};

// --- DELETE ACCOUNT ---------------------------------------------------------
export const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // In a production app, you might want to also delete their posts/comments
    // or at least anonymize them. For this implementation, we'll just delete the user.
    await User.findByIdAndDelete(userId);
    
    res.json({ message: "Account deleted successfully" });
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
    const user = await User.findById(req.params.userId).select("name avatar karma streak bio tags campus isPrivate postCount").lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
