// NOTE: Removed src/services/auth.service.js — used CommonJS require() in an
//   ESM project and contained a hardcoded test@loona.com mock that conflicted
//   with the real auth controller.
// NOTE: Removed src/services/post.service.js — registered a duplicate "Post"
//   Mongoose model causing OverwriteModelError on every startup.
// NOTE: Removed src/middlewares/auth.middleware.js — superseded by
//   src/middlewares/auth.js; the old file attached only { id } stub to
//   req.user, breaking all controllers that call req.user._id / req.user.save().

import dotenv from "dotenv";
dotenv.config();

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
  ],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import Redis from "ioredis";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import app, { corsOptions } from "./src/app.js";
import logger from "./src/utils/logger.js";
import { initMarketingBot } from "./src/utils/marketingNotifications.js";

// Start Marketing & Engagement Bot
initMarketingBot();

// ─── Startup env validation ───────────────────────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "GOOGLE_CLIENT_ID"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`❌ Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const { MONGO_URI, PORT = 5000, REDIS_URL } = process.env;

// ─── Redis Setup (Optional for MVP) ──────────────────────────────────────────
let redisClient = null;
if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null // Don't retry indefinitely
    });
    redisClient.on("error", (err) => logger.warn("⚠️ Redis not available (caching disabled):", err.message));
    redisClient.on("connect", () => logger.info("✅ Redis connected"));
  } catch (err) {
    logger.warn("⚠️ Redis initialization failed:", err.message);
  }
} else {
  logger.warn("⚠️ REDIS_URL not provided, running without cache/external store.");
}

// ─── Redis Cache Middleware ───────────────────────────────────────────────────
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

// ─── Rate limiters ────────────────────────────────────────────────────────────
const createLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message,
  store: redisClient?.status === "ready" 
    ? new RedisStore({ sendCommand: (...args) => redisClient.call(...args) })
    : undefined, // Falls back to default MemoryStore
});

const authLimiter = createLimiter(
  15 * 60 * 1000,
  50, // Increased for smoother sign in
  { error: "Too many auth attempts, try later.", code: "RATE_LIMIT" }
);

const postCreateLimiter = createLimiter(
  60 * 1000,
  20,
  { error: "Slow down! Max 20 posts/min.", code: "RATE_LIMIT" }
);

const globalLimiter = createLimiter(
  60 * 1000,
  200,
  { error: "Too many requests.", code: "RATE_LIMIT" }
);

// Attach rate limiters to app routes
app.use(globalLimiter);
app.use("/api/auth", authLimiter);

// For POST /api/posts only we inject the stricter limiter via a custom handler:
// (postRoutes already exist in app.js; we patch via a pre-middleware here)
app.use("/api/posts", (req, res, next) => {
  if (req.method === "POST" && req.path === "/") return postCreateLimiter(req, res, next);
  next();
});

// ─── Cache GET /api/posts/stats for 5 min ─────────────────────────────────────
app.use("/api/posts/stats", cacheMiddleware(300));
// ─── Cache GET feed for 30 seconds ───────────────────────────────────────────
app.use("/api/posts", (req, res, next) => {
  if (req.method === "GET" && req.path === "/") return cacheMiddleware(30)(req, res, next);
  next();
});

// Cache Leaderboard for 60 seconds
app.use("/api/auth/leaderboard", cacheMiddleware(60));

// ─── MongoDB connection (pooled for 5k users) ─────────────────────────────────
mongoose
  .connect(MONGO_URI, {
    maxPoolSize: 20,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    logger.info("✅ MongoDB connected");
    const server = app.listen(PORT, "0.0.0.0", () => {
      logger.info(`🔥 Server running on http://0.0.0.0:${PORT}`);
    });

    const io = new Server(server, {
      cors: corsOptions,
    });

    // ─── Socket.IO JWT authentication middleware ────────────────────────────────────
    // Runs before the "connection" event for every incoming socket.
    // Clients must pass { auth: { token: '<jwt>' } } in the Socket.IO options.
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) {
        logger.warn(`[Socket] Rejected unauthenticated connection from ${socket.handshake.address}`);
        return next(new Error("Authentication required"));
      }
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Attach userId to socket so event handlers can use it
        socket.data.userId = decoded.id;
        next();
      } catch (err) {
        logger.warn(`[Socket] Rejected invalid token: ${err.message}`);
        next(new Error("Invalid or expired token"));
      }
    });

    io.on("connection", (socket) => {
      logger.info(`[Socket] Connected: ${socket.id} (user: ${socket.data.userId})`);

      // Join the user's own notification room so DMs reach them anywhere in the app
      socket.join(`user:${socket.data.userId}`);

      socket.on("joinChat", (chatId) => socket.join(chatId));
      socket.on("leaveChat", (chatId) => socket.leave(chatId));
      socket.on("disconnect", () =>
        logger.info(`[Socket] Disconnected: ${socket.id} (user: ${socket.data.userId})`)
      );
    });

    app.set("io", io);

    // ─── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal) => {
      logger.warn(`\n⚠️  ${signal} received — shutting down gracefully…`);
      server.close(async () => {
        await mongoose.connection.close();
        logger.info("✅ DB connection closed. Bye!");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  })
  .catch((err) => {
    logger.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });