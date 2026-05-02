import express from "express";
import { submitFeedback, getFeedbacks } from "../controllers/feedback.controller.js";
import { requireAuth } from "../middlewares/auth.js";
import { validate, feedbackRules } from "../middlewares/validate.js";

const router = express.Router();

router.post("/", requireAuth, feedbackRules, validate, submitFeedback);
router.get("/",  requireAuth,                          getFeedbacks);

export default router;
