// ─── Imports MUST be at the top (ESM) ───────────────────────────────────────
import express from "express";
import * as Sentry from "@sentry/node";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import { sanitize as mongoSanitize } from "express-mongo-sanitize";
// NOTE: hpp removed — it writes to req.query which is read-only in Express 5
import { globalLimiter, authLimiter } from "./middlewares/limiters.js";
import morgan from "morgan";
import logger from "./utils/logger.js";
import authRoutes from "./routes/auth.routes.js";
import postRoutes from "./routes/postRoutes.js";
import chatRoutes from "./routes/chat.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import configRoutes from "./routes/config.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import errorRoutes from "./routes/error.routes.js";
import dailyPollRoutes from "./routes/dailyPoll.routes.js";
import campusStreakRoutes from "./routes/campusStreak.routes.js";
import shopRoutes from "./routes/shop.routes.js";
import busReportRoutes from "./routes/busReport.routes.js";
import redis from "./utils/redis.js";
import { optionalAuth } from "./middlewares/auth.js";
import { startDeleteExpiredAccountsJob } from "./jobs/deleteExpiredAccounts.js";

// ─── CORS allowlist ───────────────────────────────────────────────────────────
// In production set ALLOWED_ORIGINS to a comma-separated list, e.g.:
//   ALLOWED_ORIGINS=https://loona.app,https://admin.loona.app
// In development the Expo Metro / Expo Go localhost ports are allowed by default.
const DEV_ORIGINS = [
  "http://localhost:8081",   // Metro bundler (Expo)
  "http://localhost:19000",  // Expo Go (classic)
  "http://localhost:19001",  // Expo Go (newer)
  "http://localhost:19006",  // Expo web
  "http://localhost:3000",   // Admin dashboard dev
  "http://127.0.0.1:8081",
  "http://127.0.0.1:19000",
  "http://127.0.0.1:19001",
  "http://127.0.0.1:19006",
  "http://10.48.205.101:8081", // Current local IP (Metro)
  "http://10.48.205.101:5000", // Current local IP (API)
];

const PROD_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [];

const allowedOrigins = new Set([
  ...DEV_ORIGINS,
  ...PROD_ORIGINS,
]);

export const corsOptions = {
  origin: (origin, callback) => {
    // logger.info(`[CORS] Origin: ${origin}`);

    // Allow requests with no Origin header (native mobile apps, curl, internal server calls)
    if (!origin) return callback(null, true);

    // In development, we can be more lenient if needed, but we keep the whitelist check
    // to catch configuration issues early.
    if (process.env.NODE_ENV !== 'production') {
      if (allowedOrigins.has(origin)) return callback(null, true);
      // Fallback for dynamic local IPs in dev
      if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.')) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.has(origin)) return callback(null, true);

    logger.warn(`[CORS] Blocked request from unlisted origin: ${origin}`);
    callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  maxAge: 86400, // 24 hours
};

// Rate limiters moved to middlewares/limiters.js to avoid circular dependencies

// ─── App ─────────────────────────────────────────────────────────────────────
const app = express();

app.use((req, res, next) => {
  logger.info(`>>> INCOMING: ${req.method} ${req.url}`);
  next();
});

// --- TRUST PROXY ---
app.set("trust proxy", 1);

// ─── Body Logger (TOP of stack for debugging) ───────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// ─── Body Logger (DEV ONLY — never log bodies in production for security) ──────
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    logger.info(`--- [${req.method}] ${req.path} --- body: ${JSON.stringify(req.body)}`);
    next();
  });
}

// ─── Security & Perf middleware ───────────────────────────────────────────────
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
}));
// NoSQL injection prevention — only sanitize req.body (mutates in-place, safe in Express 5).
// DO NOT pass mongoSanitize() as middleware directly: it reassigns req.query which is
// a read-only getter in Express 5 and crashes every request with a TypeError.
app.use((req, res, next) => {
  if (req.body && typeof req.body === "object") mongoSanitize(req.body);
  next();
});
// HTTP Parameter Pollution (hpp) removed — incompatible with Express 5 (writes to req.query getter).
app.use(compression());
app.use(morgan("combined", { stream: logger.stream }));
app.use(cors(corsOptions));
app.use("/api", globalLimiter); // Apply global rate limit to all /api routes
// Strict auth limiter moved to specific routes (login/register) to allow profile/location updates


// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get("/api/v1/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v1/chats", chatRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/feedback", feedbackRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/config", configRoutes);
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/errors", errorRoutes);
app.use("/api/v1/polls", dailyPollRoutes);
app.use("/api/v1/streaks", campusStreakRoutes);
app.use("/api/v1/shop", shopRoutes);
app.use("/api/v1/bus-reports", busReportRoutes);

// ─── Start Cron Jobs ──────────────────────────────────────────────────────────
startDeleteExpiredAccountsJob();

import Analytics from "./models/analytics.model.js";
app.post("/api/v1/analytics/log", optionalAuth, async (req, res) => {
  try {
    const { event, screen, platform, metadata } = req.body;
    await Analytics.create({
      event,
      screen,
      platform,
      metadata,
      userId: req.user?._id
    });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Sentry Error Handler (must be AFTER routes but BEFORE other error handlers) ───
Sentry.setupExpressErrorHandler(app);

// ─── Global error handler (must be LAST, after all routes) ────────────────────
app.use((err, req, res, next) => {
  logger.error(`[${new Date().toISOString()}] ERROR:`, {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  Sentry.captureException(err);

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    code: err.code || "SERVER_ERROR",
  });
});

export default app;