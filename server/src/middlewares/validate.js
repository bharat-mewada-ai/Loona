/**
 * server/src/middlewares/validate.js
 *
 * Centralised express-validator helper.
 *
 * Usage in route files:
 *   import { validate, postRules, commentRules, ... } from '../middlewares/validate.js';
 *   router.post('/', requireAuth, postRules, validate, asyncHandler(createPost));
 */

import { body, param, query, validationResult } from "express-validator";

// ─── Valid enum values ────────────────────────────────────────────────────────
const VALID_CAMPUSES  = ["ogi", "lnct", "all"];
const VALID_TYPES     = ["thought", "confess", "events", "offers", "rumours", "bhandara", "place", "stories", "discussion", "all"];
const VALID_REACTIONS = ["wow", "fire", "same", "skull", "spicy", "lit", "wholesome", "hmm", "lmao"];

// ─── validate() — reads validationResult and short-circuits with 422 ──────────
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      // Return the first error message per field for a clean mobile UX
      fields: errors.array({ onlyFirstError: true }).map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

// ─── Auth rules ───────────────────────────────────────────────────────────────

/** POST /api/auth/google */
export const googleLoginRules = [
  body("token")
    .trim()
    .notEmpty().withMessage("Google token is required"),
  body("campus")
    .optional()
    .trim()
    .isIn(VALID_CAMPUSES).withMessage(`campus must be one of: ${VALID_CAMPUSES.join(", ")}`),
];

/** POST /api/auth/login */
export const loginRules = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required")
    .isEmail().withMessage("Must be a valid email address"),
  body("password")
    .notEmpty().withMessage("Password is required"),
];

/** PATCH /api/auth/update-profile */
export const updateProfileRules = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 30 }).withMessage("Name must be 2–30 characters")
    .matches(/^[^<>{}[\]]*$/).withMessage("Name contains invalid characters"),
  body("avatar")
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage("Avatar must be a single emoji (max 10 chars)"),
  body("bio")
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage("Bio must be at most 150 characters"),
  body("isPrivate")
    .optional()
    .isBoolean().withMessage("isPrivate must be a boolean"),
  body("tags")
    .optional()
    .isArray({ max: 5 }).withMessage("You can have at most 5 tags")
    .custom((tags) => Array.isArray(tags) && tags.every(t => typeof t === 'string' && t.length <= 15))
    .withMessage("Each tag must be a string of at most 15 characters"),
  body("notificationsEnabled")
    .optional()
    .isBoolean().withMessage("notificationsEnabled must be a boolean"),
];

// ─── Post rules ───────────────────────────────────────────────────────────────

/** POST /api/posts */
export const createPostRules = [
  body("title")
    .trim()
    .notEmpty().withMessage("Title is required")
    .isLength({ max: 120 }).withMessage("Title must be at most 120 characters"),
  body("body")
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage("Body must be at most 5000 characters"),
  body("campus")
    .optional()   // server uses req.user.campus — this field is accepted but ignored
    .trim()
    .isIn(VALID_CAMPUSES).withMessage(`campus must be one of: ${VALID_CAMPUSES.join(", ")}`),
  body("type")
    .optional()
    .trim()
    .isIn(VALID_TYPES).withMessage(`type must be one of: ${VALID_TYPES.join(", ")}`),
  body("image")
    .optional()
    .trim()
    // Reject base64 at the validation layer (belt-and-suspenders over controller guard)
    .not().matches(/^data:/i).withMessage("Base64 images are not accepted — upload to Cloudinary first")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("image must be a valid http/https URL"),
  body("eventDate")
    .optional()
    .isISO8601().withMessage("eventDate must be a valid ISO 8601 date"),
  body("eventLocation")
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage("eventLocation must be at most 200 characters")
    .matches(/^[^<>{}]*$/).withMessage("eventLocation contains invalid characters"),
  body("burnAfter24h")
    .optional()
    .isBoolean().withMessage("burnAfter24h must be a boolean"),
];

/** GET /api/posts — feed pagination */
export const getPostsRules = [
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("limit must be between 1 and 50"),
  query("campus")
    .optional()
    .isIn(VALID_CAMPUSES).withMessage(`campus must be one of: ${VALID_CAMPUSES.join(", ")}`),
  query("type")
    .optional()
    .custom((val) => {
      const types = val.split(",");
      return types.every(t => VALID_TYPES.includes(t));
    }).withMessage(`type must be one or more of: ${VALID_TYPES.join(", ")}`),
];

/** POST /api/posts/:id/react */
export const reactRules = [
  param("id")
    .isMongoId().withMessage("Invalid post ID"),
  body("reaction")
    .trim()
    .notEmpty().withMessage("reaction is required")
    .isIn(VALID_REACTIONS).withMessage(`reaction must be one of: ${VALID_REACTIONS.join(", ")}`),
];

/** POST /api/posts/:id/report */
export const reportRules = [
  param("id")
    .isMongoId().withMessage("Invalid post ID"),
  body("reason")
    .trim()
    .notEmpty().withMessage("reason is required")
    .isLength({ max: 300 }).withMessage("reason must be at most 300 characters")
    .matches(/^[^<>{}[\]]*$/).withMessage("reason contains invalid characters"),
];

/** GET /api/posts/:id/comments */
export const getCommentsRules = [
  param("id")
    .isMongoId().withMessage("Invalid post ID"),
  query("page")
    .optional()
    .isInt({ min: 1 }).withMessage("page must be a positive integer"),
];

// ─── Comment rules ────────────────────────────────────────────────────────────

/** POST /api/posts/:id/comments */
export const addCommentRules = [
  param("id")
    .isMongoId().withMessage("Invalid post ID"),
  body("content")
    .trim()
    .notEmpty().withMessage("Comment content is required")
    .isLength({ max: 500 }).withMessage("Comment must be at most 500 characters"),
  body("image")
    .optional()
    .trim()
    .not().matches(/^data:/i).withMessage("Base64 images are not accepted")
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("image must be a valid http/https URL"),
];

// ─── Chat rules ───────────────────────────────────────────────────────────────

/** POST /api/chats/start */
export const startChatRules = [
  body("targetUserId")
    .trim()
    .notEmpty().withMessage("targetUserId is required")
    .isMongoId().withMessage("targetUserId must be a valid user ID"),
  body("postId")
    .optional({ checkFalsy: true })
    .custom((value) => {
      if (value === undefined || value === null || value === "") return true;
      const str = String(value).trim();
      return str === "nearby" || /^[0-9a-fA-F]{24}$/.test(str);
    })
    .withMessage("postId must be 'nearby' or a valid post ID"),
];

/** POST /api/chats/:chatId/messages */
export const sendMessageRules = [
  param("chatId")
    .isMongoId().withMessage("Invalid chat ID"),
  body("content")
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage("Message must be at most 1000 characters")
    .matches(/^[^<>]*$/).withMessage("Message contains invalid characters"),
  body("image")
    .optional()
    .trim()
    .isURL({ protocols: ["http", "https"], require_protocol: true })
    .withMessage("image must be a valid http/https URL"),
];

// ─── Feedback rules ───────────────────────────────────────────────────────────

/** POST /api/feedback */
export const feedbackRules = [
  body("content")
    .trim()
    .notEmpty().withMessage("Feedback content is required")
    .isLength({ min: 10, max: 1000 }).withMessage("Feedback must be 10–1000 characters"),
  body("category")
    .optional()
    .trim()
    .isIn(["bug", "feature", "improvement", "general", "other"]).withMessage("category must be: bug, feature, improvement, general, or other"),
];
