import cron from "node-cron";
import User from "../models/user.model.js";
import { createNotification } from "../utils/notificationService.js";
import logger from "../utils/logger.js";

// Weekly Karma Digest - Every Monday at 9:00 AM
export const initCronJobs = () => {
  cron.schedule("0 9 * * 1", async () => {
    logger.info("Running Weekly Karma Digest...");
    try {
      const users = await User.find({ notificationsEnabled: true, potato: { $gt: 0 } });
      
      for (const user of users) {
        await createNotification({
          recipient: user._id,
          type: "system",
          title: "Weekly Karma Digest 🏆",
          body: `You have ${user.potato} total Potatoes! Keep up the great work on campus.`,
          data: { type: "leaderboard" }
        });
      }
      logger.info(`Weekly digest sent to ${users.length} users.`);
    } catch (error) {
      logger.error("Error in Weekly Karma Digest cron:", error.message);
    }
  });

  // Daily Streak Reset Check (Optional)
  // ...
};
