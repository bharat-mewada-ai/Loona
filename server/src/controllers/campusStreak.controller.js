import { getStreakStats } from "../utils/streakHelper.js";

export const getStreakInfo = async (req, res) => {
  try {
    const stats = await getStreakStats();
    res.json({
      ...stats,
      multiplierValue: stats.multiplierActive ? 2 : 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
