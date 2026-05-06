import express from "express";
import { googleLogin, getMe, logout, getLeaderboard, updateProfile, registerPushToken, getCampuses, getPublicProfile, refresh, deleteAccount } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate, googleLoginRules, updateProfileRules } from "../middlewares/validate.js";

const router = express.Router();

// ─── Public routes ─────────────────────────────────────────────────────────────
router.post("/google",      googleLoginRules,    validate, asyncHandler(googleLogin));
router.post("/refresh",                                    asyncHandler(refresh));
router.get("/leaderboard",                                 asyncHandler(getLeaderboard));
router.get("/campuses",                                    asyncHandler(getCampuses));

// ─── Protected routes ──────────────────────────────────────────────────────────
router.get("/me",            requireAuth,                       asyncHandler(getMe));
router.get("/profile/:userId", requireAuth,                    asyncHandler(getPublicProfile));
router.patch("/update-profile", requireAuth, updateProfileRules, validate, asyncHandler(updateProfile));
router.patch("/push-token",  requireAuth,                       asyncHandler(registerPushToken));
router.post("/logout",       requireAuth,                       asyncHandler(logout));
router.delete("/delete-account", requireAuth,                    asyncHandler(deleteAccount));

export default router;