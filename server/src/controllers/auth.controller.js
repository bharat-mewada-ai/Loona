import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.model.js";
import Campus from "../models/campus.model.js";
import logger from "../utils/logger.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- GET CAMPUSES ---------------------------------------------------------
export const getCampuses = async (req, res) => {
  try {
    const campuses = await Campus.find({ isActive: true }).lean();
    // Fallback if DB is empty (initial state)
    if (campuses.length === 0) {
      return res.json([
        { id: "nit", name: "NIT Bhopal" },
        { id: "ogi", name: "OGI Bhopal" },
        { id: "lnct", name: "LNCT Bhopal" }
      ]);
    }
    res.json(campuses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const adjectives = ["Silent", "Ghost", "Neon", "Shadow", "Brave", "Lost", "Midnight", "Lunar", "Solar", "Cosmic"];
const nouns = ["Fox", "Tiger", "Owl", "Wolf", "Raven", "Hawk", "Panther", "Viper", "Bear", "Shark"];
const emojis = ["🦊", "🐯", "🦉", "🐺", "🐦‍⬛", "🦅", "🐆", "🐍", "🐻", "🦈"];

const generateAnonName = (campus) => {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj}${noun}_${campus.toUpperCase()}`;
};
const generateAvatar = () => emojis[Math.floor(Math.random() * emojis.length)];

// GOOGLE LOGIN
export const googleLogin = async (req, res) => {
  try {
    const { token, campus } = req.body;
    let email, name;

    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: [
          process.env.GOOGLE_CLIENT_ID,
          "612057986452-8ov2v6ouhqk1bsktvl2je8mj0j9nrc7r.apps.googleusercontent.com"
        ],
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
    } catch (idError) {
      logger.info("[Google Auth] verifyIdToken failed:", idError.message);
      try {
        const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const errText = await response.text();
          logger.info("[Google Auth] fetch userinfo failed:", response.status, errText);
          throw new Error("Token invalid");
        }
        const payload = await response.json();
        email = payload.email;
        name = payload.name;
      } catch (fetchErr) {
        logger.error("[Google Auth] final fetch error:", fetchErr.message);
        return res.status(400).json({ error: "Invalid Google token: " + fetchErr.message });
      }
    }

    if (!email) return res.status(400).json({ error: "No email from Google" });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: generateAnonName(campus || "all"),
        email, password: "google_oauth",
        campus: campus || "all",
        avatar: generateAvatar(),
      });
    }

    const jwtToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    const userObj = user.toObject();
    delete userObj.password;
    res.json({ user: userObj, token: jwtToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ME
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").lean();
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LOGOUT
export const logout = async (req, res) => {
  res.json({ message: "Logged out" });
};

// GET LEADERBOARD — includes nit, ogi, lnct
export const getLeaderboard = async (req, res) => {
  try {
    const campuses = ["ogi", "lnct", "nit"];
    const [campusWarData, topUsersData] = await Promise.all([
      User.aggregate([
        { $match: { campus: { $in: campuses } } },
        { $group: { _id: "$campus", karma: { $sum: "$karma" } } },
        { $sort: { karma: -1 } },
      ]),
      User.find({ campus: { $in: campuses } })
        .sort({ karma: -1 })
        .limit(10)
        .select("name campus avatar karma streak badges")
        .lean(),
    ]);
    res.json({ campusWar: campusWarData, topUsers: topUsersData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { avatar, name } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (avatar) user.avatar = avatar;
    if (name) user.name = name;
    await user.save();

    const userObj = user.toObject();
    delete userObj.password;
    res.json(userObj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// --- REGISTER EXPO PUSH TOKEN ---------------------------------------------
export const registerPushToken = async (req, res) => {
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
};
