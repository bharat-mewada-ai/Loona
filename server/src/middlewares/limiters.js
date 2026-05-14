import { rateLimit, MemoryStore } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../utils/redis.js";
import logger from "../utils/logger.js";

const redisStore = process.env.REDIS_URL ? new RedisStore({
  sendCommand: (...args) => redis.call(...args),
}) : null;

const memoryStore = new MemoryStore();

const createDynamicStore = (prefix) => ({
  increment: async (key) => {
    if (redis.status === 'ready' && redisStore) {
      try {
        return await redisStore.increment(`${prefix}:${key}`);
      } catch (e) {
        logger.warn(`⚠️ Redis increment failed for ${prefix}, falling back to memory`);
      }
    }
    return await memoryStore.increment(`${prefix}:${key}`);
  },
  decrement: async (key) => {
    if (redis.status === 'ready' && redisStore) {
      try {
        await redisStore.decrement(`${prefix}:${key}`);
        return;
      } catch (e) {}
    }
    await memoryStore.decrement(`${prefix}:${key}`);
  },
  resetKey: async (key) => {
    if (redis.status === 'ready' && redisStore) {
      try {
        await redisStore.resetKey(`${prefix}:${key}`);
        return;
      } catch (e) {}
    }
    await memoryStore.resetKey(`${prefix}:${key}`);
  }
});

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 2000 : 1000,
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  store: createDynamicStore('global'),
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 200 : 50,
  message: { error: "Too many login/register attempts, please try again in an hour." },
  standardHeaders: true,
  legacyHeaders: false,
  store: createDynamicStore('auth'),
});

export const postLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 20 : 10,
  message: { error: "Slow down! You can only post 10 times per minute." },
  store: createDynamicStore('post'),
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  skip: (req) => req.method !== "POST",
});

export const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 50 : 20,
  message: { error: "Slow down! You are voting/reacting too fast." },
  store: createDynamicStore('vote'),
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
});
