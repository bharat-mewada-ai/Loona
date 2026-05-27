import express from "express";
import { requireAuth, requireAdmin, requireStaff } from "../middlewares/auth.js";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Chat from "../models/chat.model.js";
import AuditLog from "../models/auditLog.model.js";
import Analytics from "../models/analytics.model.js";
import Report from "../models/report.model.js";
import Message from "../models/message.model.js";
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
import { sendPushNotification } from "../utils/pushNotifications.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

/**
 * BROADCAST PUSH NOTIFICATION (Super Admin Only)
 */
/**
 * GET BROADCAST RECIPIENTS (Admin Only)
 */
router.get("/broadcast/recipients", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const users = await User.find({ expoPushToken: { $exists: true, $ne: "" } })
    .select("name email avatar")
    .lean();
  res.json(users);
}));

/**
 * GET BROADCAST HISTORY (Admin Only)
 */
router.get("/broadcast/history", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const history = await AuditLog.find({ action: "BROADCAST" })
    .populate("performedBy", "name")
    .sort({ createdAt: -1 })
    .lean();
  res.json(history);
}));

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

  // 1. Find target recipients with push tokens to save their names/emails in history
  const query = { expoPushToken: { $exists: true, $ne: "" } };
  if (target) {
    if (typeof target === 'string' && ['ogi', 'lnct', 'oriental'].includes(target)) {
       query.campus = target;
    } else if (target.userId) {
       query._id = target.userId;
    } else if (target.email) {
       query.email = target.email;
    } else if (target === 'all') {
       // all campuses - query stays the same
    }
  }

  const users = await User.find(query).select("name email avatar expoPushToken").lean();
  const count = users.length;

  // 2. Perform Broadcast
  if (count > 0) {
    const tokens = users.map(u => u.expoPushToken);
    // Send in chunks of 100 with throttling
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      await Promise.all(chunk.map(token => 
        sendPushNotification(token, title, body, { type: "admin_broadcast" }).catch(e => console.error(`[Push] Error: ${e.message}`))
      ));
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // 3. Create AuditLog with recipient list in metadata
  await AuditLog.create({
    action: "BROADCAST",
    performedBy: req.user._id,
    targetType: "System",
    details: `Broadcast: ${title}${targetId ? ' to user ' + targetId : ''}`,
    metadata: { 
      target, 
      count,
      title,
      body,
      recipients: users.map(u => ({ _id: u._id, name: u.name, email: u.email, avatar: u.avatar }))
    }
  });

  res.json({ message: `Successfully broadcasted to ${count || 0} users`, count });
}));

/**
 * ADJUST USER POTATOES (Admin Only)
 */
router.post("/users/:userId/adjust-potatoes", requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const { amount } = req.body;
  if (amount === undefined || isNaN(amount)) {
    return res.status(400).json({ error: "Amount must be a valid number" });
  }

  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const numericAmount = Number(amount);
  user.potato = Math.max(0, (user.potato || 0) + numericAmount);
  await user.save();

  // Create Audit Log
  await AuditLog.create({
    action: "POTATO_ADJUST",
    performedBy: req.user._id,
    targetId: user._id,
    targetType: "User",
    details: `Adjusted potatoes by ${numericAmount}. New balance: ${user.potato}`
  });

  // Create notification
  const { createNotification } = await import("../utils/notificationService.js");
  await createNotification({
    recipient: user._id,
    sender: req.user._id,
    type: "system",
    title: numericAmount > 0 ? "Potatoes Received! 🥔" : "Potatoes Deducted! 🥔",
    body: numericAmount > 0 
      ? `The admin has awarded you ${numericAmount} 🥔 Potatoes! Enjoy.` 
      : `The admin has deducted ${Math.abs(numericAmount)} 🥔 Potatoes from your account.`,
    data: { type: "potato_update", amount: numericAmount }
  });

  const io = req.app.get("io");
  if (io) {
    io.to(`user:${user._id}`).emit("potato_update", { potato: user.potato });
  }

  res.json({ message: "Potatoes adjusted successfully", potato: user.potato });
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
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.isVerified = true;
  
  // Award badge immediately so it updates user profile
  const { checkAndAwardBadges } = await import("../utils/badgeService.js");
  await checkAndAwardBadges(user);
  await user.save();

  await AuditLog.create({
    action: "USER_VERIFY",
    performedBy: req.user._id,
    targetId: user._id,
    targetType: "User"
  });

  res.json({ message: "User verified successfully", user });
}));

/**
 * UNVERIFY (Staff Access)
 */
router.post("/users/:userId/unverify", requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.isVerified = false;
  
  // Remove verified badge if present
  if (user.badges && Array.isArray(user.badges)) {
    user.badges = user.badges.filter(b => b.name !== "Verified");
  }
  await user.save();

  await AuditLog.create({
    action: "USER_UNVERIFY",
    performedBy: req.user._id,
    targetId: user._id,
    targetType: "User"
  });

  res.json({ message: "User verification removed successfully", user });
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
  // Lazy one-time migration for old reports if totalReportsCount is not populated
  const needsMigration = await User.exists({ totalReportsCount: { $exists: false } });
  if (needsMigration) {
    const reportedData = await Post.aggregate([
      { $match: { "reports.0": { $exists: true } } },
      { $group: { 
          _id: "$author", 
          totalReports: { $sum: "$reportCount" },
          reportedPosts: { $sum: 1 }
      } }
    ]);
    for (const data of reportedData) {
      if (data._id) {
        await User.findByIdAndUpdate(data._id, {
          $set: {
            totalReportsCount: data.totalReports,
            reportedPostsCount: data.reportedPosts
          }
        });
      }
    }
    await User.updateMany(
      { totalReportsCount: { $exists: false } },
      { $set: { totalReportsCount: 0, reportedPostsCount: 0 } }
    );
  }

  const criminals = await User.find({ totalReportsCount: { $gt: 0 } })
    .sort({ totalReportsCount: -1 })
    .limit(20)
    .select("_id name email avatar isBanned totalReportsCount reportedPostsCount")
    .lean();

  const formatted = criminals.map(c => ({
    _id: c._id,
    totalReports: c.totalReportsCount || 0,
    reportedPosts: c.reportedPostsCount || 0,
    name: c.name,
    email: c.email,
    avatar: c.avatar,
    isBanned: c.isBanned
  }));

  res.json(formatted);
}));

/**
 * GET REPORTED CHATS (Staff Access)
 */
router.get("/reported-chats", requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const reports = await Report.find({ targetType: "chat", status: "pending" })
    .populate("reporter", "name email")
    .sort({ createdAt: -1 })
    .lean();

  // For each report, attach participant info from Chat
  const enriched = await Promise.all(reports.map(async (rep) => {
    const chat = await Chat.findById(rep.targetId).populate("participants", "name email avatar").lean();
    return {
      ...rep,
      chat
    };
  }));

  res.json(enriched);
}));

/**
 * GET REPORTED CHAT MESSAGES (Staff Access, Audited)
 */
router.get("/reported-chats/:reportId/messages", requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.reportId);
  if (!report || report.targetType !== "chat") {
    return res.status(404).json({ error: "Chat report not found" });
  }

  // Verify the chat exists
  const chat = await Chat.findById(report.targetId).populate("participants", "name email avatar").lean();
  if (!chat) return res.status(404).json({ error: "Reported chat no longer exists" });

  // Fetch the last 30 messages from this chat as context
  const messages = await Message.find({ chatId: report.targetId })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate("senderId", "name email")
    .lean();

  // Log this access in AuditLog
  await AuditLog.create({
    action: "VIEW_REPORTED_CHAT_MESSAGES",
    performedBy: req.user._id,
    targetId: report.targetId,
    targetType: "Chat",
    details: `Viewed conversation history for chat report: ${report._id}`
  });

  res.json({
    report,
    chat,
    messages: messages.reverse() // reverse to show in chronological order
  });
}));

/**
 * RESOLVE REPORTED CHAT (Staff Access)
 */
router.post("/reported-chats/:reportId/resolve", requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.reportId);
  if (!report) return res.status(404).json({ error: "Report not found" });

  report.status = "resolved";
  await report.save();

  await AuditLog.create({
    action: "RESOLVE_REPORT",
    performedBy: req.user._id,
    targetId: report._id,
    targetType: "Report",
    details: `Resolved report: ${report._id}`
  });

  res.json({ message: "Report marked as resolved", report });
}));

/**
 * DISMISS REPORTED CHAT (Staff Access)
 */
router.post("/reported-chats/:reportId/dismiss", requireAuth, requireStaff, asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.reportId);
  if (!report) return res.status(404).json({ error: "Report not found" });

  report.status = "dismissed";
  await report.save();

  await AuditLog.create({
    action: "DISMISS_REPORT",
    performedBy: req.user._id,
    targetId: report._id,
    targetType: "Report",
    details: `Dismissed report: ${report._id}`
  });

  res.json({ message: "Report dismissed", report });
}));

export default router;
