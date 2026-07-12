import User from "../models/user.model.js";
import mongoose from "mongoose";

// Lazy-import redis to avoid circular deps — streakHelper is used by post.controller which already imports redis
let _redis = null;
const getRedis = async () => {
  if (!_redis) {
    const mod = await import("./redis.js");
    _redis = mod.default;
  }
  return _redis;
};

const dailyWinnerSchema = new mongoose.Schema({
  date: { type: String, unique: true }, // YYYY-MM-DD
  winner: { type: String }
});

// Avoid duplicate model compilation errors in Express hot reload
const DailyWinner = mongoose.models.DailyWinner || mongoose.model("DailyWinner", dailyWinnerSchema);

// ── getCampusMultiplier ──────────────────────────────────────────────────────
// Redis-cached (1 h TTL). Previously ran a full User.aggregate on every single
// vote/comment — under load that was N aggregates/second. Now hits cache first.
export const getCampusMultiplier = async (campus) => {
  try {
    const redis = await getRedis();
    const cacheKey = `multiplier:${campus}`;

    // Try Redis cache first
    if (redis && redis.status === "ready") {
      try {
        const cached = await redis.get(cacheKey);
        if (cached !== null) return parseInt(cached, 10);
      } catch (_) { /* Redis unavailable, fall through to DB */ }
    }

    // Compute multiplier from DB
    let multiplier = 1;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    let yesterdayRecord = await DailyWinner.findOne({ date: yesterdayStr });
    if (!yesterdayRecord) {
      const scores = await User.aggregate([
        { $group: { _id: "$campus", total: { $sum: "$potato" } } }
      ]);
      const ogi = scores.find(s => s._id === 'ogi')?.total || 0;
      const lnct = scores.find(s => s._id === 'lnct')?.total || 0;
      const winner = ogi > lnct ? 'ogi' : (lnct > ogi ? 'lnct' : 'draw');

      if (winner !== 'draw') {
        yesterdayRecord = await DailyWinner.create({ date: yesterdayStr, winner });
      }
    }

    const pastWinners = await DailyWinner.find().sort({ date: -1 }).limit(5).lean();
    if (pastWinners.length >= 3) {
      const currentLeader = pastWinners[0].winner;
      let streak = 0;
      for (const w of pastWinners) {
        if (w.winner === currentLeader) streak++;
        else break;
      }
      // If the campus is the leader and streak is at least 3, they get double potatoes!
      if (streak >= 3 && currentLeader === campus) {
        multiplier = 2;
      }
    }

    // Store in Redis for 1 hour — multiplier only changes daily
    if (redis && redis.status === "ready") {
      try {
        await redis.set(cacheKey, String(multiplier), "EX", 3600);
      } catch (_) { /* ignore Redis write failure */ }
    }

    return multiplier;
  } catch (err) {
    console.error("Streak multiplier check failed, fallback to 1:", err.message);
  }
  return 1;
};

export const getStreakStats = async () => {
  try {
    const pastWinners = await DailyWinner.find().sort({ date: -1 }).limit(10).lean();
    let currentLeader = null;
    let streakDays = 0;

    if (pastWinners.length > 0) {
      currentLeader = pastWinners[0].winner;
      for (const w of pastWinners) {
        if (w.winner === currentLeader) streakDays++;
        else break;
      }
    }

    return {
      currentLeader,
      streakDays,
      multiplierActive: streakDays >= 3
    };
  } catch (err) {
    return { currentLeader: null, streakDays: 0, multiplierActive: false };
  }
};
