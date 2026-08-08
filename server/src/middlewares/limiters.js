import { rateLimit, MemoryStore } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redis from "../utils/redis.js";
import logger from "../utils/logger.js";

const redisStore = process.env.REDIS_URL ? new RedisStore({
  sendCommand: (...args) => redis.call(...args),
}) : null;

import jwt from "jsonwebtoken";

const createDynamicStore = (prefix) => {
  const localMemoryStore = new MemoryStore();
  
  return {
    init: (options) => {
      if (typeof localMemoryStore.init === 'function') {
        localMemoryStore.init(options);
      }
      if (redisStore && typeof redisStore.init === 'function') {
        redisStore.init(options);
      }
    },
    increment: async (key) => {
      if (redis.status === 'ready' && redisStore) {
        try {
          return await redisStore.increment(`${prefix}:${key}`);
        } catch (e) {
          logger.warn(`⚠️ Redis increment failed for ${prefix}, falling back to memory`);
        }
      }
      return await localMemoryStore.increment(`${prefix}:${key}`);
    },
    decrement: async (key) => {
      if (redis.status === 'ready' && redisStore) {
        try {
          await redisStore.decrement(`${prefix}:${key}`);
          return;
        } catch (e) {}
      }
      await localMemoryStore.decrement(`${prefix}:${key}`);
    },
    resetKey: async (key) => {
      if (redis.status === 'ready' && redisStore) {
        try {
          await redisStore.resetKey(`${prefix}:${key}`);
          return;
        } catch (e) {}
      }
      await localMemoryStore.resetKey(`${prefix}:${key}`);
    }
  };
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 5000 : 3000,
  message: { error: "Too many requests from this IP, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  store: createDynamicStore('global'),
  keyGenerator: (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded && decoded.id) {
          return `user:${decoded.id}`;
        }
      } catch (e) {
        // Fall back to IP if token is invalid or expired
      }
    }
    return req.ip;
  },
});

export const refreshLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'development' ? 100 : 30, // 30 requests per hour per IP
  message: { error: "Too many refresh attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  store: createDynamicStore('refresh'),
  keyGenerator: (req) => req.ip,
});

export const reportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === 'development' ? 50 : 10, // 10 reports per 15 min per user/IP
  message: { error: "Too many reports submitted. Please wait before reporting again." },
  store: createDynamicStore('report'),
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
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
