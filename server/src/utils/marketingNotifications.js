import cron from "node-cron";
import User from "../models/user.model.js";
import { sendPush } from "./pushNotifications.js";
import logger from "./logger.js";

const SPICY_MESSAGES = [
  { title: "👀 Sshhh... Kisi ne kuch kaha!", body: "Campus confessions mein ek nayi spicy entry aayi hai. Kahin ye aapke baare mein toh nahi? Check karo!" },
  { title: "🍛 Bhandara Alert!", body: "Garma-garam khana wait kar raha hai! Kya aapne abhi tak location check ki?" },
  { title: "🏆 Campus War Update", body: "Aapka college peeche reh raha hai! Karma badhao aur apne campus ko top par lao!" },
  { title: "🔥 Trending Now", body: "Ek post poore campus mein aag laga rahi hai. Miss mat karo!" },
  { title: "💔 Single? Ya Mingled?", body: "Relationship status par nayi debate shuru ho gayi hai. Aapka kya kehna hai?" },
];

/**
 * Send a notification to ALL users who have a push token
 */
export const broadcastNotification = async (title, body, data = {}) => {
  try {
    const users = await User.find({ expoPushToken: { $exists: true, $ne: "" } }).select("expoPushToken");
    const tokens = users.map(u => u.expoPushToken);
    
    if (tokens.length === 0) return;

    logger.info(`[Marketing] Broadcasting to ${tokens.length} users: ${title}`);
    
    // Send in chunks of 100 to avoid Expo limits
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      chunk.forEach(token => sendPush(token, title, body, data));
    }
    
    return tokens.length;
  } catch (err) {
    logger.error("[Marketing] Broadcast error:", err.message);
  }
};

/**
 * Scheduled Jobs (The "Campus Bot")
 */
export const initMarketingBot = () => {
  // 1. Every Day at 7:00 PM (Spicy Evening Gossip)
  cron.schedule("0 19 * * *", async () => {
    const msg = SPICY_MESSAGES[Math.floor(Math.random() * SPICY_MESSAGES.length)];
    await broadcastNotification(msg.title, msg.body, { type: "marketing" });
    logger.info("[Marketing Bot] Daily spicy notification sent.");
  });

  // 2. Inactivity Check (Check every hour for users inactive for 24h)
  // This is a placeholder - for 5k users, you'd want a more optimized query
  cron.schedule("0 * * * *", async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const inactiveUsers = await User.find({
      lastPostDate: { $lt: twentyFourHoursAgo },
      expoPushToken: { $exists: true, $ne: "" }
    }).limit(50); // Small chunks to avoid spam

    inactiveUsers.forEach(user => {
      sendPush(
        user.expoPushToken, 
        "🏃‍♂️ Kahan chale gaye?", 
        "Campus mein bohot kuch ho gaya aapke bina. Wapas aao!",
        { type: "re-engagement" }
      );
    });
  });
};
