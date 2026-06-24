import express from "express";
import { getTodayPoll, voteDailyPoll } from "../controllers/dailyPoll.controller.js";
import { requireAuth } from "../middlewares/auth.js";

const router = express.Router();

router.get("/today", requireAuth, getTodayPoll);
router.post("/today/vote", requireAuth, voteDailyPoll);

export default router;
