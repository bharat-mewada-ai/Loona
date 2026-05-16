import Redis from "ioredis";
import logger from "./logger.js";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Render/Upstash often require TLS (rediss://)
const isTls = redisUrl.startsWith("rediss://");

const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  tls: isTls ? { rejectUnauthorized: false } : undefined,
  retryStrategy: (times) => Math.min(times * 200, 5000),
  enableReadyCheck: false, // Faster connection
  connectTimeout: 5000,   // Fail fast
  commandTimeout: 3000,   // Don't hang the API
  keepAlive: 10000,
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
