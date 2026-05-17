import express from "express";
import { requireAuth, requireAdmin, requireStaff } from "../middlewares/auth.js";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Chat from "../models/chat.model.js";
import AuditLog from "../models/auditLog.model.js";
import Analytics from "../models/analytics.model.js";
import os from "os";
import mongoose from "mongoose";
import redis from "../utils/redis.js";
import { v2 as cloudinary } from "cloudinary";

// Configure cloudinary once for admin usage stats
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
import { broadcastNotification } from "../utils/marketingNotifications.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

/**
 * BROADCAST PUSH NOTIFICATION (Super Admin Only)
 */
router.post("/broadcast", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { title, body, campus, targetId, targetEmail } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required" });
  }

  let target = campus;
  if (targetId) target = { userId: targetId };
  else if (targetEmail) target = { email: targetEmail };

  const count = await broadcastNotification(title, body, { type: "admin_broadcast" }, target);
  
  await AuditLog.create({
    action: "BROADCAST",
    performedBy: req.user._id,
    targetType: "System",
    details: `Broadcast: ${title}${targetId ? ' to user ' + targetId : ''}`,
    metadata: { target, count }
  });

  res.json({ message: `Successfully broadcasted to ${count || 0} users`, count });
}));

/**
 * USER SEARCH & DEEP DIVE (Staff Access)
 */
router.get("/users/search", requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json([]);

  const filter = {
    $or: [
      { email: { $regex: q, $options: "i" } },
      { name: { $regex: q, $options: "i" } }
    ]
  };

  // If query is valid ObjectId
  if (q.match(/^[0-9a-fA-F]{24}$/i)) {
    filter.$or.push({ _id: q });
  }

  const users = await User.find(filter)
    .select("name email avatar campus role potato isBanned isVerified lastActive createdAt")
    .limit(10)
    .lean();

  res.json(users);
}));

router.get("/users/:userId/details", requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const [user, chatsCount, auditLogs] = await Promise.all([
    User.findById(req.params.userId).lean(),
    Chat.countDocuments({ participants: req.params.userId }),
    AuditLog.find({ targetId: req.params.userId }).populate("performedBy", "name").sort({ createdAt: -1 }).lean()
  ]);

  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    user,
    stats: { chatsCount },
    logs: auditLogs
  });
}));

/**
 * BAN/UNBAN (Super Admin Only for safety)
 */
router.post("/users/:userId/ban", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isBanned: true }, { new: true });
  if (!user) return res.status(404).json({ error: "User not found" });

  await AuditLog.create({
    action: "USER_BAN",
    performedBy: req.user._id,
    targetId: user._id,
    targetType: "User",
    details: `Banned user: ${user.email}`
  });

  res.json({ message: "User banned permanently", user });
}));

router.post("/users/:userId/unban", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isBanned: false }, { new: true });
  if (!user) return res.status(404).json({ error: "User not found" });

  await AuditLog.create({
    action: "USER_UNBAN",
    performedBy: req.user._id,
    targetId: user._id,
    targetType: "User",
    details: `Unbanned user: ${user.email}`
  });

  res.json({ message: "User unbanned successfully", user });
}));

/**
 * VERIFY (Staff Access)
 */
router.post("/users/:userId/verify", requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isVerified: true }, { new: true });
  if (!user) return res.status(404).json({ error: "User not found" });

  await AuditLog.create({
    action: "USER_VERIFY",
    performedBy: req.user._id,
    targetId: user._id,
    targetType: "User"
  });

  res.json({ message: "User verified successfully", user });
}));

/**
 * DEVELOPER CONSOLE: SERVER HEALTH & ANALYTICS
 */
router.get("/health", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const uptime = process.uptime();
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  const usageMem = ((totalMem - freeMem) / totalMem * 100).toFixed(2);

  const dbStatus = mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";
  
  // Get storage stats
  let cloudinaryStats = { usage: 0, limit: 0, percent: 0 };
  let mongodbStats = { dataSize: 0, storageSize: 0 };

  try {
    const cloudUsage = await cloudinary.api.usage();
    // storage.usage is bytes; credits may be undefined on free tier
    const storageBytes = Number(cloudUsage?.storage?.usage ?? 0);
    const storageGB = (storageBytes / (1024 * 1024 * 1024)).toFixed(3);
    const creditsLimit = Number(cloudUsage?.credits?.limit ?? 25);
    const usedPercent = Number(cloudUsage?.credits?.used_percent ?? 0);
    // Also extract bandwidth and transformations for fuller picture
    const bandwidthBytes = Number(cloudUsage?.bandwidth?.usage ?? 0);
    const bandwidthMB = (bandwidthBytes / (1024 * 1024)).toFixed(2);
    const requests = Number(cloudUsage?.requests ?? 0);
    const resources = Number(cloudUsage?.resources ?? 0);
    
    cloudinaryStats = {
      usage: storageGB,   // GB
      limit: creditsLimit.toFixed(2),
      percent: usedPercent.toFixed(2),
      bandwidthMB,
      requests,
      resources
    };
  } catch (e) { console.error("Cloudinary stats failed", e.message); }

  try {
    const dbStats = await mongoose.connection.db.stats();
    mongodbStats = {
      dataSize: (dbStats.dataSize / (1024 * 1024)).toFixed(2), // MB
      storageSize: (dbStats.storageSize / (1024 * 1024)).toFixed(2) // MB
    };
  } catch (e) { console.error("Mongo stats failed", e.message); }

  // Get recent logs
  const recentLogs = await AuditLog.find().sort({ createdAt: -1 }).limit(20).populate("performedBy", "name").lean();

  res.json({
    system: {
      uptime: Math.floor(uptime),
      memoryUsage: usageMem,
      cpuLoad: os.loadavg(),
      platform: os.platform(),
      cpus: os.cpus().length
    },
    storage: {
      cloudinary: cloudinaryStats,
      mongodb: mongodbStats
    },
    database: {
      mongodb: dbStatus,
      redis: redis.status || "Ready"
    },
    recentLogs
  });
}));

router.get("/analytics/summary", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const screenViews = await Analytics.aggregate([
    { $match: { event: "SCREEN_VIEW" } },
    { $group: { _id: "$screen", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const activityLast24h = await Analytics.countDocuments({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  res.json({
    screenViews: screenViews.map(sv => ({ screen: sv._id, count: sv.count })),
    activityLast24h
  });
}));

import ErrorLog from "../models/errorLog.model.js";

router.get("/errors", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const errors = await ErrorLog.find()
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("userId", "name email")
    .lean();
  res.json(errors);
}));

router.get("/criminals", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const criminals = await Post.aggregate([
    { $match: { "reports.0": { $exists: true } } },
    { $group: { 
        _id: "$author", 
        totalReports: { $sum: "$reportCount" },
        reportedPosts: { $sum: 1 }
    } },
    { $sort: { totalReports: -1 } },
    { $limit: 20 },
    { $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user"
    } },
    { $unwind: "$user" },
    { $project: {
        _id: 1,
        totalReports: 1,
        reportedPosts: 1,
        name: "$user.name",
        email: "$user.email",
        avatar: "$user.avatar",
        isBanned: "$user.isBanned"
    } }
  ]);

  res.json(criminals);
}));

export default router;
