import redisClient from "./redis.js";
import logger from "./logger.js";

export const cacheMiddleware = (ttlSeconds, options = {}) => async (req, res, next) => {
  if (!redisClient || redisClient.status !== "ready") return next();

  if (options.firstPageOnly && req.query.cursor) {
    return next();
  }

  const userId = req.user?._id || req.user?.id || 'anon';
  const key = `cache:${req.originalUrl}:${userId}`;
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
  if (!redisClient || redisClient.status !== "ready") {
    logger.warn(`Redis client not ready, skipping cache invalidation for prefix: ${prefix}`);
    return;
  }
  
  try {
    let cursor = '0';
    const pattern = `cache:${prefix}*`;
    let deletedCount = 0;
    
    logger.info(`[Cache] Invalidating cache for pattern: ${pattern}`);
    do {
      const [nextCursor, keys] = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      
      if (keys.length > 0) {
        logger.info(`[Cache] Deleting keys: ${keys.join(", ")}`);
        const numDeleted = await redisClient.del(...keys);
        deletedCount += numDeleted;
      }
    } while (cursor !== '0');
    
    logger.info(`[Cache] Cache invalidation complete. Total keys deleted: ${deletedCount}`);
  } catch (err) {
    logger.error("Redis Cache Invalidate Error:", err.message);
  }
};
