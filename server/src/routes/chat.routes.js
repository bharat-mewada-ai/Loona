import express from "express";
import { requireAuth } from "../middlewares/auth.js";
import { getChats, startChat, getMessages, sendMessage, revealIdentity } from "../controllers/chat.controller.js";
import { validate, startChatRules, sendMessageRules } from "../middlewares/validate.js";

const router = express.Router();

router.use(requireAuth); // All chat routes require authentication

router.get("/",                                               getChats);
router.post("/start",      startChatRules,   validate,       startChat);
router.get("/:chatId/messages",                              getMessages);
router.post("/:chatId/messages", sendMessageRules, validate, sendMessage);
router.post("/:chatId/reveal",                               revealIdentity);

export default router;
