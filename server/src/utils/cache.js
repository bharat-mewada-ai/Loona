import redisClient from "./redis.js";
import logger from "./logger.js";

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
  
  // ─── Non-Blocking Invalidation ──────────────────────────────────────────────
  // We fire-and-forget the invalidation so it doesn't slow down the user's response.
  (async () => {
    try {
      let cursor = '0';
      const pattern = `cache:${prefix}*`;
      
      do {
        // SCAN is much safer than KEYS in production as it doesn't block Redis
        const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        
        if (keys.length > 0) {
          await redisClient.del(...keys);
        }
      } while (cursor !== '0');
      
    } catch (err) {
      logger.error("Redis Cache Invalidate Error:", err.message);
    }
  })();
};
