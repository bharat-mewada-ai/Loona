import User from "../models/user.model.js";
import mongoose from "mongoose";

const dailyWinnerSchema = new mongoose.Schema({
  date: { type: String, unique: true }, // YYYY-MM-DD
  winner: { type: String }
});

// Avoid duplicate model compilation errors in Express hot reload
const DailyWinner = mongoose.models.DailyWinner || mongoose.model("DailyWinner", dailyWinnerSchema);

export const getCampusMultiplier = async (campus) => {
  try {
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
        return 2;
      }
    }
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
