// NOTE: Removed src/services/auth.service.js — used CommonJS require() in an
//   ESM project and contained a hardcoded test@loona.com mock that conflicted
//   with the real auth controller.
// NOTE: Removed src/services/post.service.js — registered a duplicate "Post"
//   Mongoose model causing OverwriteModelError on every startup.
// NOTE: Removed src/middlewares/auth.middleware.js — superseded by
//   src/middlewares/auth.js; the old file attached only { id } stub to
//   req.user, breaking all controllers that call req.user._id / req.user.save().

import "dotenv/config";
import logger from "./src/utils/logger.js";

// ─── CRASH HANDLERS ──────────────────────────────────────────────────────────
// Prevent the server from dying on unhandled errors (essential for production)
process.on('unhandledRejection', (reason, promise) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  logger.error('💥 Unhandled Rejection:', msg);
  if (reason instanceof Error && reason.stack) {
    logger.error(reason.stack);
  }
});

process.on('uncaughtException', (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error('☣️ Uncaught Exception:', msg);
  if (err instanceof Error && err.stack) {
    logger.error(err.stack);
  }
  // Optional: exit if the state is too corrupted
  // process.exit(1);
});

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Adjust sampling rates based on environment to save quota and reduce noise
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  environment: process.env.NODE_ENV || "development",
  release: "loona-server@1.0.0",
  
  // Custom filter to ignore noise
  beforeSend(event, hint) {
    const error = hint.originalException;
    
    // Ignore 401 (Expired/Missing Token) and 422 (Validation Failures) 
    // these are common client-side issues, not server crashes.
    if (error && (error.status === 401 || error.status === 422)) {
      return null;
    }
    
    return event;
  },
});

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import app, { corsOptions } from "./src/app.js";

// Startup env validation ───────────────────────────────────────────────────
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "GOOGLE_CLIENT_ID"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`❌ Missing required env vars: ${missing.join(", ")}`);
  process.exit(1);
}

const { MONGO_URI, PORT = 5000 } = process.env;

// (Middleware like rate limiting and caching is now handled in src/app.js)

// ─── MongoDB connection (pooled for 5k users) ─────────────────────────────────
mongoose
  .connect(MONGO_URI, {
    maxPoolSize: 50,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    logger.info("✅ MongoDB connected");
    
    // Start Marketing & Engagement Bot
    try {
      const { initMarketingBot } = await import("./src/utils/marketingNotifications.js");
      initMarketingBot();
    } catch (botErr) {
      logger.warn("⚠️ Marketing Bot failed to start:", botErr.message);
    }

    // Start Cron Jobs (Weekly Digest, etc.)
    try {
      const { initCronJobs } = await import("./src/services/cron.service.js");
      initCronJobs();
    } catch (cronErr) {
      logger.error("⚠️ Cron jobs failed to start:", cronErr.message);
    }

    const server = app.listen(PORT, "0.0.0.0", () => {
      logger.info(`🔥 Server running on http://0.0.0.0:${PORT}`);
    });

    const { Server } = await import("socket.io");
    const { createAdapter } = await import("@socket.io/redis-adapter");
    const { default: redisClient } = await import("./src/utils/redis.js");

    const io = new Server(server, {
      cors: corsOptions,
    });
    
    if (redisClient.status === 'ready' || redisClient.status === 'connecting') {
      const subClient = redisClient.duplicate();
      io.adapter(createAdapter(redisClient, subClient));
    }

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

      socket.on("joinChat", async (chatId) => {
        try {
          const { default: Chat } = await import("./src/models/chat.model.js");
          const chat = await Chat.findById(chatId).select("participants").lean();
          if (chat && chat.participants.map(p => p.toString()).includes(socket.data.userId)) {
            socket.join(chatId);
            logger.info(`[Socket] User ${socket.data.userId} joined chat ${chatId}`);
          } else {
            logger.warn(`[Socket] Unauthorized join attempt for chat ${chatId} by user ${socket.data.userId}`);
          }
        } catch (err) {
          logger.error(`[Socket] Error joining chat ${chatId}:`, err.message);
        }
      });
      socket.on("leaveChat", (chatId) => socket.leave(chatId));
      socket.on("disconnect", () =>
        logger.info(`[Socket] Disconnected: ${socket.id} (user: ${socket.data.userId})`)
      );
    });

    app.set("io", io);

    // ─── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal) => {
      logger.warn(`\n⚠️  ${signal} received — shutting down gracefully…`);
      try {
        const { default: redis } = await import("./src/utils/redis.js");
        if (redis.status !== 'end') await redis.quit();
        logger.info("✅ Redis connection closed.");
      } catch (e) {}

      server.close(async () => {
        await mongoose.connection.close();
        logger.info("✅ DB connection closed. Bye!");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));


  })
  .catch((err) => {
    logger.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });