/**
 * deleteExpiredAccounts.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs daily at 02:00 AM to permanently wipe accounts whose 30-day grace
 * period has expired.
 *
 * Registered in app.js via startCronJobs().
 */

import cron from "node-cron";
import { hardDeleteExpiredAccounts } from "../controllers/auth.controller.js";
import logger from "../utils/logger.js";

export function startDeleteExpiredAccountsJob() {
  // Runs every day at 02:00 AM server time
  cron.schedule("0 2 * * *", async () => {
    logger.info("[Cron] Running daily expired-account deletion job...");
    await hardDeleteExpiredAccounts();
  });

  logger.info("[Cron] Expired-account deletion job registered (runs daily at 02:00 AM).");
}
