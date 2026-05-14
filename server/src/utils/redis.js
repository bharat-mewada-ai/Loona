import Redis from "ioredis";
import logger from "./logger.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Render/Upstash often require TLS (rediss://)
const isTls = redisUrl.startsWith("rediss://");

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null, // Essential for retryStrategy to work
  lazyConnect: true,
  tls: isTls ? { rejectUnauthorized: false } : undefined,
  retryStrategy: (times) => {
    // Exponential backoff: 100ms, 400ms, 900ms... up to 10 seconds
    const delay = Math.min(times * 100, 10000);
    return delay;
  },
  enableReadyCheck: true,
  connectTimeout: 20000,
  keepAlive: 5000, // Ping every 5s to keep connection active
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
