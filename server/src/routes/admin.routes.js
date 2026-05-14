import express from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import User from "../models/user.model.js";
import { broadcastNotification } from "../utils/marketingNotifications.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

/**
 * BROADCAST PUSH NOTIFICATION
 * POST /api/admin/broadcast
 */
router.post("/broadcast", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { title, body, campus } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required" });
  }

  const count = await broadcastNotification(title, body, { type: "admin_broadcast" }, campus);
  res.json({ message: `Successfully broadcasted to ${count || 0} users`, count });
}));

/**
 * BAN USER
 * POST /api/admin/users/:userId/ban
 */
router.post("/users/:userId/ban", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isBanned: true }, { new: true });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User banned permanently", user });
}));

/**
 * UNBAN USER
 * POST /api/admin/users/:userId/unban
 */
router.post("/users/:userId/unban", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isBanned: false }, { new: true });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User unbanned successfully", user });
}));

router.post("/users/:userId/verify", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isVerified: true }, { new: true });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User verified successfully", user });
}));

router.post("/users/:userId/unverify", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.userId, { isVerified: false }, { new: true });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ message: "User unverified", user });
}));

export default router;
