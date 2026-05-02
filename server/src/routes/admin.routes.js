import express from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { broadcastNotification } from "../utils/marketingNotifications.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

/**
 * BROADCAST PUSH NOTIFICATION
 * POST /api/admin/broadcast
 */
router.post("/broadcast", requireAuth, requireAdmin, asyncHandler(async (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required" });
  }

  const count = await broadcastNotification(title, body, { type: "admin_broadcast" });
  res.json({ message: `Successfully broadcasted to ${count || 0} users`, count });
}));

export default router;
