import express from "express";
import { getStreakInfo } from "../controllers/campusStreak.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.get("/status", requireAuth, getStreakInfo);

export default router;
