import express from "express";
import {
  createPost, getPosts, getPostById, deletePost, votePost, voteBhandara, reportPost, getStats,
  reactPost, addComment, getComments, deleteComment, getReportedPosts, dismissReports,
  getMyPosts,
} from "../controllers/post.controller.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  validate,
  createPostRules, getPostsRules,
  reactRules, reportRules,
  addCommentRules, getCommentsRules,
} from "../middlewares/validate.js";

const router = express.Router();

// ─── Public / Feed routes ──────────────────────────────────────────────────────
router.get("/",          getPostsRules,    validate, asyncHandler(getPosts));
router.get("/stats",                                 asyncHandler(getStats));

// ─── My posts (must be before /:id to avoid "mine" being treated as a Mongo ID)
router.get("/mine",      requireAuth,                asyncHandler(getMyPosts));

router.get("/:id",                                   asyncHandler(getPostById));
router.get("/:id/comments", getCommentsRules, validate, asyncHandler(getComments));

// ─── Admin moderation ─────────
router.get("/reported",           requireAuth, requireAdmin, asyncHandler(getReportedPosts));
router.patch("/:id/dismiss-reports", requireAuth, requireAdmin, asyncHandler(dismissReports));

// ─── Protected write routes ────────────────────────────────────────────────────
router.post("/",               requireAuth, createPostRules, validate, asyncHandler(createPost));
router.post("/:id/vote",          requireAuth, asyncHandler(votePost));
router.post("/:id/bhandara-vote", requireAuth, asyncHandler(voteBhandara));
router.post("/:id/react",      requireAuth, reactRules,    validate,  asyncHandler(reactPost));
router.post("/:id/report",     requireAuth, reportRules,   validate,  asyncHandler(reportPost));
router.post("/:id/comments",   requireAuth, addCommentRules, validate, asyncHandler(addComment));
router.delete("/:id/comments/:commentId", requireAuth, asyncHandler(deleteComment));
router.delete("/:id",          requireAuth, requireAdmin, asyncHandler(deletePost));

export default router;