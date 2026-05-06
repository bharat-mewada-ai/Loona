import Redis from "ioredis";
import logger from "./logger.js";

const REDIS_URL = process.env.REDIS_URL;
let redisClient = null;

if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null
    });
    redisClient.on("error", (err) => logger.warn("⚠️ Redis not available (caching disabled):", err.message));
    redisClient.on("connect", () => logger.info("✅ Redis connected"));
  } catch (err) {
    logger.warn("⚠️ Redis initialization failed:", err.message);
  }
}

export const cacheMiddleware = (ttlSeconds) => async (req, res, next) => {
  if (!redisClient || redisClient.status !== "ready") return next();

  const key = `cache:${req.originalUrl}`;
  try {
    const cached = await redisClient.get(key);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    logger.error("Redis Cache GET Error:", err.message);
  }

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    try {
      if (redisClient && redisClient.status === "ready") {
        redisClient.setex(key, ttlSeconds, JSON.stringify(data));
      }
    } catch (err) {
      logger.error("Redis Cache SET Error:", err.message);
    }
    res.setHeader("X-Cache", "MISS");
    return originalJson(data);
  };
  next();
};

export const invalidateCache = async (prefix) => {
  if (!redisClient || redisClient.status !== "ready") return;
  try {
    const keys = await redisClient.keys(`cache:${prefix}*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    logger.error("Redis Cache Invalidate Error:", err.message);
  }
};
