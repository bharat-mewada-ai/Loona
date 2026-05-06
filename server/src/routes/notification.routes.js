import express from "express";
import { getNotifications, markAsRead, deleteNotification } from "../controllers/notification.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.get("/", requireAuth, asyncHandler(getNotifications));
router.patch("/read", requireAuth, asyncHandler(markAsRead));
router.delete("/:id", requireAuth, asyncHandler(deleteNotification));

export default router;
