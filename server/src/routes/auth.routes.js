import express from "express";
import { googleLogin, login, getMe, logout, getLeaderboard, updateProfile, registerPushToken, getCampuses, getPublicProfile, refresh, deleteAccount, blockUser, unblockUser, getBlockedUsers } from "../controllers/auth.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validate, googleLoginRules, updateProfileRules } from "../middlewares/validate.js";

const router = express.Router();

// ─── Public routes ─────────────────────────────────────────────────────────────
router.post("/google",      googleLoginRules,    validate, asyncHandler(googleLogin));
router.post("/login",                                      asyncHandler(login));
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

// Blocking
router.post("/block/:userId",    requireAuth,                    asyncHandler(blockUser));
router.delete("/unblock/:userId", requireAuth,                   asyncHandler(unblockUser));
router.get("/blocks",            requireAuth,                    asyncHandler(getBlockedUsers));

export default router;