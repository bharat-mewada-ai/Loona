import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import logger from "../utils/logger.js";

/**
 * JWT Authentication Middleware
 * Verifies Bearer token and attaches req.user
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        error: "Authentication required", 
        code: "UNAUTHORIZED" 
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ 
        error: "Missing token", 
        code: "UNAUTHORIZED" 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ 
        error: "User no longer exists", 
        code: "USER_NOT_FOUND" 
      });
    }

    req.user = user;
    
    // ─── Analytics: Update lastActive (Throttled to once every 4h) ──────────
    const now = new Date();
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    if (!user.lastActive || user.lastActive < fourHoursAgo) {
    // Use atomic $set instead of user.save() to avoid overwriting concurrent potato changes.
    // user.save() would serialize and write ALL fields (including stale potato values),
    // potentially clobbering changes made by concurrent vote/comment requests.
    User.findByIdAndUpdate(user._id, { $set: { lastActive: now } })
      .catch(e => logger.error("Failed to update lastActive:", e.message));
    }
    
    // ─── Ban Check ─────────────────────────────────────────────────────────────
    if (user.isBanned) {
      return res.status(403).json({ 
        error: "Your account has been permanently banned for violating community guidelines.", 
        code: "USER_BANNED" 
      });
    }

    next();
  } catch (err) {
    logger.error("Auth Middleware Error:", err.message);
    return res.status(401).json({ 
      error: "Invalid or expired token", 
      code: "TOKEN_EXPIRED" 
    });
  }
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (user && !user.isBanned) {
        req.user = user;
      }
    }
    next();
  } catch (err) {
    // If token is invalid, just proceed as guest
    next();
  }
};

/**
 * Admin Role Guard Middleware
 * Must be used AFTER requireAuth
 */
export const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ 
      error: "Forbidden: Super Admin access only", 
      code: "FORBIDDEN" 
    });
  }
};

export const requireStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
    next();
  } else {
    res.status(403).json({ 
      error: "Forbidden: Staff access only", 
      code: "FORBIDDEN" 
    });
  }
};

/**
 * Owner Guard Middleware
 * Restricts access to the app owner only (set via OWNER_USER_ID env var).
 * Even other admins/moderators cannot access owner-only routes.
 * Must be used AFTER requireAuth.
 */
export const requireOwner = (req, res, next) => {
  const ownerIdEnv = process.env.OWNER_USER_ID;
  if (!ownerIdEnv || ownerIdEnv === 'REPLACE_WITH_YOUR_MONGODB_USER_ID') {
    return res.status(503).json({ 
      error: "Owner ID not configured on server", 
      code: "NOT_CONFIGURED" 
    });
  }
  const ownerIds = ownerIdEnv.split(',').map(id => id.trim());
  if (req.user && ownerIds.includes(req.user._id.toString())) {
    next();
  } else {
    res.status(403).json({ 
      error: "Forbidden: Owner access only", 
      code: "OWNER_ONLY" 
    });
  }
};
