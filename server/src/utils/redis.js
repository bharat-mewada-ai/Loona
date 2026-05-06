import Redis from "ioredis";
import logger from "./logger.js";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: 1,
  lazyConnect: true, // Don't connect immediately
  retryStrategy: (times) => {
    // If we've already logged a client limit error, stop retrying for a while
    if (redis?._hitClientLimit) return null; 
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
  enableReadyCheck: true,
  connectTimeout: 5000,
});

// Explicitly handle AUTH errors or other fatal errors during connection
redis.on("error", (err) => {
  if (err.message.includes("max number of clients")) {
    if (!redis._hitClientLimit) {
      logger.warn("⚠️ Redis: Connection limit reached. Caching/Rate-limiting disabled.");
      redis._hitClientLimit = true;
    }
  } else {
    logger.error("❌ Redis error:", err.message);
  }
});

// Start connection manually so we can catch potential sync errors
redis.connect().catch(err => {
  logger.warn("⚠️ Redis initial connection failed:", err.message);
});

redis.on("ready", () => logger.info("✅ Redis connected and ready"));
redis.on("end", () => logger.warn("⚠️ Redis connection closed"));

export default redis;
