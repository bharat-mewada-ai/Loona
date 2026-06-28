import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getChats, startChat, getMessages, sendMessage, revealIdentity, deleteChat, reportChat, reactToMessage } from "../controllers/chat.controller.js";
import { validate, startChatRules, sendMessageRules } from "../middlewares/validate.js";

import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

router.use(requireAuth); // All chat routes require authentication

router.get("/",                                               getChats);
router.post("/start",      startChatRules,   validate,       startChat);
router.get("/:chatId/messages",                              getMessages);
router.post("/:chatId/messages", sendMessageRules, validate, sendMessage);
router.post("/:chatId/messages/:messageId/react",            asyncHandler(reactToMessage));
router.post("/:chatId/reveal",                               revealIdentity);
router.post("/:chatId/report",                               asyncHandler(reportChat));
router.delete("/:chatId",                                    deleteChat);

export default router;
