import cron from "node-cron";
import User from "../models/user.model.js";
import { sendPushNotification } from "./pushNotifications.js";
import logger from "./logger.js";

const SPICY_MESSAGES = [
  { title: "👀 Sshhh... Kisi ne kuch kaha!", body: "Campus confessions mein ek nayi spicy entry aayi hai. Kahin ye aapke baare mein toh nahi? Check karo!" },
  { title: "🍛 Bhandara Alert!", body: "Garma-garam khana wait kar raha hai! Kya aapne abhi tak location check ki?" },
  { title: "🏆 Campus War Update", body: "Aapka college peeche reh raha hai! Karma badhao aur apne campus ko top par lao!" },
  { title: "🔥 Trending Now", body: "Ek post poore campus mein aag laga rahi hai. Miss mat karo!" },
  { title: "💔 Single? Ya Mingled?", body: "Relationship status par nayi debate shuru ho gayi hai. Aapka kya kehna hai?" },
  { title: "🤫 Internal Secrets Leaked?", body: "Kuch aisi baatein jo class group mein nahi, sirf Loona par share ho sakti hain. Dekho kya chal raha hai!" },
  { title: "☕ Canteen Chronicles", body: "Canteen ki chai aur doston ki bakchodi miss ho rahi hai? Check out what others are talking about right now." },
  { title: "🚶‍♂️ Mass Bunk Plan?", body: "Kya aaj sach mein mass bunk ho raha hai? Apne batchmates se confirm karo aur trend check karo!" },
  { title: "🎓 Placement & Exam Stress?", body: "Exam ki taiyari ya stress release? Loona par aao aur dekho baaki sab kaise jugad kar rahe hain." },
  { title: "🔍 Crush Detection Mode: ON", body: "Kisi ne aapke campus se ek sweet confession post kiya hai. Kahin wo aapke liye toh nahi?" },
  { title: "🎭 Backbenchers Unite!", body: "Last bench ki talks ab direct Loona par feed mein aa rahi hain. Read the most hilarious posts of today." },
  { title: "🤔 Unpopular Opinion Alert", body: "Humare campus ka sabse overrated department kaunsa hai? Debate join karo aur apna opinion do!" },
  { title: "🎒 Lost & Found: Dil?", body: "Ek cheez jo poore campus se gayab hai... acchi attendance! Aao thoda rona-dhona aur masti share karein." },
  { title: "🍕 Treat Time!", body: "Bina kisi reason ke doston se treat maangni hai? Aise hi crazy ideas ke liye campus feed check karo." },
  { title: "⭐ Secret Admirer Post", body: "Suno! Koi chupke se kisi ko admire kar raha hai campus mein. Aao guessing game shuru karein!" }
];

/**
 * Send a notification to ALL users (or specific campus) who have a push token
 */
export const broadcastNotification = async (title, body, data = {}, target = null) => {
  try {
    const query = { expoPushToken: { $exists: true, $ne: "" } };
    
    // Check if target is campus or specific user
    if (target) {
      if (typeof target === 'string' && ['ogi', 'lnct', 'oriental'].includes(target)) {
         query.campus = target;
      } else if (target.userId) {
         query._id = target.userId;
      } else if (target.email) {
         query.email = target.email;
      }
    }
    
    const users = await User.find(query).select("expoPushToken");
    const tokens = users.map(u => u.expoPushToken);
    
    if (tokens.length === 0) return 0;

    logger.info(`[Marketing] Broadcasting to ${tokens.length} users: ${title}`);
    
    // Send in chunks of 100 with throttling to prevent server crash/network saturation
    for (let i = 0; i < tokens.length; i += 100) {
      const chunk = tokens.slice(i, i + 100);
      await Promise.all(chunk.map(token => 
        sendPushNotification(token, title, body, data).catch(e => logger.error(`[Push] Error: ${e.message}`))
      ));
      
      // Small pause between batches to allow the event loop to breathe
      await new Promise(resolve => setTimeout(resolve, 500));
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

  // 2. Inactivity Check (Check every hour for users who became inactive exactly 24 hours ago)
  cron.schedule("0 * * * *", async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    
    const inactiveUsers = await User.find({
      lastPostDate: { $gt: twentyFiveHoursAgo, $lt: twentyFourHoursAgo },
      expoPushToken: { $exists: true, $ne: "" }
    }).limit(50); // Small chunks to avoid spam

    inactiveUsers.forEach(user => {
      sendPushNotification(
        user.expoPushToken, 
        "🏃‍♂️ Kahan chale gaye?", 
        "Campus mein bohot kuch ho gaya aapke bina. Wapas aao!",
        { type: "re-engagement" }
      );
    });
  });
};
