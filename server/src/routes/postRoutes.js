import express from "express";
import {
  createPost, getPosts, getPostById, deletePost, votePost, votePoll, voteBhandara, reportPost, getStats, getDetailedStats,
  reactPost, addComment, getComments, deleteComment, getReportedPosts, dismissReports,
  getMyPosts, getUserPosts, searchPosts, searchUsers,
  toggleSavePost, getSavedPosts, toggleGoing, viewPost, getTrendingTags
} from "../controllers/post.controller.js";
import { requireAuth, requireAdmin, requireStaff, optionalAuth } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { postLimiter, voteLimiter } from "../middlewares/limiters.js";
import {
  validate,
  createPostRules, getPostsRules,
  reactRules, reportRules,
  addCommentRules, getCommentsRules,
} from "../middlewares/validate.js";
import { cacheMiddleware } from "../utils/cache.js";

const router = express.Router();

// ─── Public / Feed routes ──────────────────────────────────────────────────────
router.get("/",          getPostsRules,    validate, optionalAuth, asyncHandler(getPosts));
router.get("/stats",                                 cacheMiddleware(300), asyncHandler(getStats));
router.get("/trending-tags",                         cacheMiddleware(300), asyncHandler(getTrendingTags));
router.get("/search/posts",                          asyncHandler(searchPosts));
router.get("/search/users",                          asyncHandler(searchUsers));

// ─── My posts (must be before /:id to avoid "mine" being treated as a Mongo ID)
router.get("/mine",      requireAuth,                asyncHandler(getMyPosts));
router.get("/saved",     requireAuth,                asyncHandler(getSavedPosts));
router.get("/user/:userId", requireAuth,             asyncHandler(getUserPosts));

// ─── Admin moderation (must be before /:id to avoid "reported" being cast as ObjectId)
router.get("/reported",           requireAuth, requireStaff, asyncHandler(getReportedPosts));
router.get("/stats/detailed",     requireAuth, requireStaff, asyncHandler(getDetailedStats));

router.get("/:id",                                   optionalAuth, asyncHandler(getPostById));
router.get("/:id/comments", getCommentsRules, validate, asyncHandler(getComments));
router.patch("/:id/dismiss-reports", requireAuth, requireAdmin, asyncHandler(dismissReports));

// ─── Protected write routes ────────────────────────────────────────────────────
router.post("/",               requireAuth, postLimiter, createPostRules, validate, asyncHandler(createPost));
router.post("/:id/view",       optionalAuth, asyncHandler(viewPost));
router.post("/:id/vote",          requireAuth, voteLimiter, asyncHandler(votePost));
router.post("/:id/poll-vote",      requireAuth, voteLimiter, asyncHandler(votePoll));
router.post("/:id/bhandara-vote", requireAuth, voteLimiter, asyncHandler(voteBhandara));
router.post("/:id/react",      requireAuth, voteLimiter, reactRules,    validate,  asyncHandler(reactPost));
router.post("/:id/report",     requireAuth, reportRules,   validate,  asyncHandler(reportPost));
router.post("/:id/comments",   requireAuth, addCommentRules, validate, asyncHandler(addComment));
router.post("/:id/save",       requireAuth, asyncHandler(toggleSavePost));
router.post("/:id/going",      requireAuth, asyncHandler(toggleGoing));
router.delete("/:id/comments/:commentId", requireAuth, asyncHandler(deleteComment));
router.delete("/:id",          requireAuth, asyncHandler(deletePost));

export default router;