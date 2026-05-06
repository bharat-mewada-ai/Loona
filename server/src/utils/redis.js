import Redis from "ioredis";
import logger from "./logger.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Render/Upstash often require TLS (rediss://)
const isTls = redisUrl.startsWith("rediss://");

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  tls: isTls ? { rejectUnauthorized: false } : undefined, // Essential for most cloud Redis providers
  retryStrategy: (times) => {
    if (redis?._hitClientLimit) return null; 
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
  enableReadyCheck: true,
  connectTimeout: 10000, // Increase timeout for cloud connections
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
