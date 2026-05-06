import express from "express";
import {
  createPost, getPosts, getPostById, deletePost, votePost, votePoll, voteBhandara, reportPost, getStats,
  reactPost, addComment, getComments, deleteComment, getReportedPosts, dismissReports,
  getMyPosts, getUserPosts, searchPosts, searchUsers,
} from "../controllers/post.controller.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { postLimiter } from "../middlewares/limiters.js";
import {
  validate,
  createPostRules, getPostsRules,
  reactRules, reportRules,
  addCommentRules, getCommentsRules,
} from "../middlewares/validate.js";
import { cacheMiddleware } from "../utils/cache.js";

const router = express.Router();

// ─── Public / Feed routes ──────────────────────────────────────────────────────
router.get("/",          getPostsRules,    validate, cacheMiddleware(60),  asyncHandler(getPosts));
router.get("/stats",                                 cacheMiddleware(300), asyncHandler(getStats));
router.get("/search/posts",                          asyncHandler(searchPosts));
router.get("/search/users",                          asyncHandler(searchUsers));

// ─── My posts (must be before /:id to avoid "mine" being treated as a Mongo ID)
router.get("/mine",      requireAuth,                asyncHandler(getMyPosts));
router.get("/user/:userId", requireAuth,             asyncHandler(getUserPosts));

// ─── Admin moderation (must be before /:id to avoid "reported" being cast as ObjectId)
router.get("/reported",           requireAuth, requireAdmin, asyncHandler(getReportedPosts));

router.get("/:id",                                   asyncHandler(getPostById));
router.get("/:id/comments", getCommentsRules, validate, asyncHandler(getComments));
router.patch("/:id/dismiss-reports", requireAuth, requireAdmin, asyncHandler(dismissReports));

// ─── Protected write routes ────────────────────────────────────────────────────
router.post("/",               requireAuth, postLimiter, createPostRules, validate, asyncHandler(createPost));
router.post("/:id/vote",          requireAuth, asyncHandler(votePost));
router.post("/:id/poll-vote",      requireAuth, asyncHandler(votePoll));
router.post("/:id/bhandara-vote", requireAuth, asyncHandler(voteBhandara));
router.post("/:id/react",      requireAuth, reactRules,    validate,  asyncHandler(reactPost));
router.post("/:id/report",     requireAuth, reportRules,   validate,  asyncHandler(reportPost));
router.post("/:id/comments",   requireAuth, addCommentRules, validate, asyncHandler(addComment));
router.delete("/:id/comments/:commentId", requireAuth, asyncHandler(deleteComment));
router.delete("/:id",          requireAuth, asyncHandler(deletePost));

export default router;