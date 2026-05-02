// ─── Imports MUST be at the top (ESM) ───────────────────────────────────────
import express from "express";
import * as Sentry from "@sentry/node";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import logger from "./utils/logger.js";
import authRoutes from "./routes/auth.routes.js";
import postRoutes from "./routes/postRoutes.js";
import chatRoutes from "./routes/chat.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";

// ─── CORS allowlist ───────────────────────────────────────────────────────────
// In production set ALLOWED_ORIGINS to a comma-separated list, e.g.:
//   ALLOWED_ORIGINS=https://loona.app,https://admin.loona.app
// In development the Expo Metro / Expo Go localhost ports are allowed by default.
const DEV_ORIGINS = [
  "http://localhost:8081",   // Metro bundler (Expo)
  "http://localhost:19000",  // Expo Go (classic)
  "http://localhost:19006",  // Expo web
  "http://localhost:3000",   // Admin dashboard dev
  "http://127.0.0.1:8081",
  "http://127.0.0.1:19000",
  "http://127.0.0.1:19006",
  "http://10.126.166.101:8081", // Current local IP (Metro)
  "http://10.126.166.101:5000", // Current local IP (API)
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
    // Allow requests with no Origin header (native mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    logger.warn(`[CORS] Blocked request from unlisted origin: ${origin}`);
    callback(new Error(`CORS policy: origin '${origin}' is not allowed`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ─── App ─────────────────────────────────────────────────────────────────────
const app = express();

// ─── Security & Perf middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(morgan("combined", { stream: logger.stream }));
app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), timestamp: Date.now() })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/feedback", feedbackRoutes);

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