import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import { generateAnonIdentity } from "../utils/anonIdentity.js";
import { sendPushNotification } from "../utils/pushNotifications.js";
import { checkContent } from "../utils/moderation.js";
import { createNotification } from "../utils/notificationService.js";
import mongoose from "mongoose";

// Get all chats for the current user
export const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate("participants", "name avatar")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 })
      .lean();

    // Format for the client
    const formattedChats = chats.map((chat) => {
      const otherUser = chat.participants.find((p) => p._id.toString() !== req.user._id.toString());
      
      let name = otherUser?.name || "Anonymous";
      let avatar = otherUser?.avatar || "👤";

      // If the chat is anonymous and not yet revealed:
      if (chat.isAnonymous && !chat.isRevealed) {
        // If the other user is the anonymous author, mask their real details from the reader!
        if (otherUser && chat.anonAuthorId && otherUser._id.toString() === chat.anonAuthorId.toString()) {
          name = "Anonymous Confessor";
          avatar = "🕳️";
        }
      }

      return {
        _id: chat._id,
        avatar,
        name,
        preview: chat.lastMessage ? chat.lastMessage.content : "No messages yet",
        time: chat.lastMessageAt,
        unread: chat.unreadCounts ? (chat.unreadCounts[req.user._id.toString()] || 0) : 0,
      };
    });

    res.json(formattedChats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const activeStartChats = new Map();

// Start a chat from a post
export const startChat = async (req, res) => {
  try {
    const { targetUserId, postId } = req.body;
    if (!targetUserId) return res.status(400).json({ error: "Missing targetUserId" });
    if (targetUserId === req.user._id.toString()) return res.status(400).json({ error: "Cannot chat with yourself" });

    // Determine if this is an anonymous confession chat
    let isAnon = false;
    let anonAuthor = null;
    
    if (postId && mongoose.isValidObjectId(postId)) {
      const post = await Post.findById(postId).select('type');
      if (post && post.type === 'confess') {
        isAnon = true;
        anonAuthor = targetUserId;
      }
    }

    const lockKey = [req.user._id.toString(), targetUserId.toString()].sort().join(":") + `:${isAnon}`;

    if (activeStartChats.has(lockKey)) {
      const existingPromise = activeStartChats.get(lockKey);
      const resultChat = await existingPromise;
      return res.json(resultChat);
    }

    const startPromise = (async () => {
      // Check if chat already exists
      let chat = await Chat.findOne({
        participants: { $all: [req.user._id, targetUserId] },
        isAnonymous: isAnon,
        isRevealed: false
      });

      if (!chat) {
        // Check if user has enough potato currency to initiate a new chat (e.g. 10 potatoes)
        // Only deduct potatoes if the chat is started from Nearby tab
        if (postId === 'nearby') {
          const CHAT_COST = 10;
          const initiator = await User.findById(req.user._id);
          if (initiator.potato < CHAT_COST) {
            throw new Error(`POTATO_LIMIT:You need at least ${CHAT_COST} 🥔 Potatoes to start a chat! You currently have ${initiator.potato} 🥔.`);
          }

          // Deduct potato
          initiator.potato -= CHAT_COST;
          await initiator.save();

          // Emit a socket event to update the initiator's potato count on their UI immediately
          const io = req.app.get("io");
          if (io) {
            io.to(`user:${req.user._id}`).emit("potato_update", { potato: initiator.potato });
          }
        }
        // Get real names and avatars for both participants
        const [u1, u2] = await Promise.all([
          User.findById(req.user._id).select('name avatar'),
          User.findById(targetUserId).select('name avatar')
        ]);

        if (!u1 || !u2) {
          throw new Error("NOT_FOUND:One or both users not found.");
        }

        chat = await Chat.create({
          participants: [req.user._id, targetUserId],
          isAnonymous: isAnon,
          anonAuthorId: anonAuthor,
          isRevealed: false,
          anonIdentities: {
            [req.user._id.toString()]: { name: u1.name, avatar: u1.avatar },
            [targetUserId.toString()]: { name: u2.name, avatar: u2.avatar },
          },
          unreadCounts: {
            [req.user._id.toString()]: 0,
            [targetUserId.toString()]: 0,
          },
        });
      }

      // If started/opened from nearby, send a wave/chat request notification to target user
      if (postId === 'nearby') {
        await createNotification({
          recipient: targetUserId,
          sender: req.user._id,
          type: "wave",
          title: "👋 Someone wants to chat!",
          body: `${req.user.name} found you nearby and wants to chat. Say hi!`,
          data: { senderId: req.user._id.toString() }
        });
      }

      return chat;
    })();

    activeStartChats.set(lockKey, startPromise);

    try {
      const resultChat = await startPromise;
      res.json(resultChat);
    } catch (err) {
      if (err.message.startsWith("POTATO_LIMIT:")) {
        return res.status(400).json({ error: err.message.substring(13) });
      }
      if (err.message.startsWith("NOT_FOUND:")) {
        return res.status(404).json({ error: err.message.substring(10) });
      }
      throw err;
    } finally {
      activeStartChats.delete(lockKey);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get messages for a chat
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id }).populate("participants", "name avatar lastActive");
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // Mark messages as read by adding the current user to the readBy array
    await Message.updateMany(
      { chatId, senderId: { $ne: req.user._id }, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id } }
    );

    // Mark unread counts as 0
    if (chat.unreadCounts && chat.unreadCounts.get(req.user._id.toString()) > 0) {
      chat.unreadCounts.set(req.user._id.toString(), 0);
      await chat.save();
    }

    const messages = await Message.find({ chatId })
      .sort({ createdAt: 1 })
      .lean();

    // Map senderId to an opaque 'senderType' and attach identity
    const formattedMessages = messages.map(msg => {
      const sender = chat.participants.find(p => p._id.toString() === msg.senderId.toString());
      
      let name = sender?.name || "Anonymous";
      let avatar = sender?.avatar || "👤";

      if (chat.isAnonymous && !chat.isRevealed) {
        if (sender && chat.anonAuthorId && sender._id.toString() === chat.anonAuthorId.toString()) {
          name = "Anonymous Confessor";
          avatar = "🕳️";
        }
      }

      return {
        ...msg,
        senderType: msg.senderId.toString() === req.user._id.toString() ? "me" : "other",
        senderName: name,
        senderAvatar: avatar,
        senderId: undefined,
      };
    });

    // Mask identities to use 'me'/'other' keys
    const otherUser = chat.participants.find(p => p._id.toString() !== req.user._id.toString());
    const meUser = chat.participants.find(p => p._id.toString() === req.user._id.toString());

    let otherName = otherUser?.name || "Anonymous";
    let otherAvatar = otherUser?.avatar || "👤";
    let otherRealId = otherUser?._id;
    let otherLastActive = otherUser?.lastActive;

    let myName = meUser?.name || "Anonymous";
    let myAvatar = meUser?.avatar || "👤";

    if (chat.isAnonymous && !chat.isRevealed) {
      if (otherUser && chat.anonAuthorId && otherUser._id.toString() === chat.anonAuthorId.toString()) {
        otherName = "Anonymous Confessor";
        otherAvatar = "🕳️";
        otherRealId = null; // Do not send their real ID to the client!
        otherLastActive = null; // Hide lastActive for anonymous confessor
      }
    }

    const identities = {
      me: { name: myName, avatar: myAvatar, id: meUser?._id },
      other: { 
        name: otherName, 
        avatar: otherAvatar, 
        id: otherRealId,
        lastActive: otherLastActive
      }
    };

    res.json({
      chat: {
        _id: chat._id,
        isAnonymous: chat.isAnonymous,
        anonAuthorId: chat.anonAuthorId,
        isRevealed: chat.isRevealed,
        identities
      },
      messages: formattedMessages,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, image } = req.body;
    if (!content && !image) return res.status(400).json({ error: "Message content or image is required" });

    // Content moderation check on messages
    if (content) {
      const moderation = checkContent(content);
      if (moderation.level === 'bad') {
        return res.status(400).json({ error: 'Message violates community guidelines.' });
      }
    }

    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    const message = await Message.create({
      chatId,
      senderId: req.user._id,
      content: content || (image ? "Sent an image" : ""),
      image,
      readBy: [req.user._id],
    });

    // Fetch user info for socket emission
    const user = await User.findById(req.user._id).select("name avatar");

    // Update chat
    chat.lastMessage = message._id;
    chat.lastMessageAt = Date.now();
    
    // Increment unread count for other participant
    const otherId = chat.participants.find(p => p.toString() !== req.user._id.toString()).toString();
    if (chat.unreadCounts) {
      chat.unreadCounts.set(otherId, (chat.unreadCounts.get(otherId) || 0) + 1);
    } else {
      chat.unreadCounts = { [otherId]: 1, [req.user._id.toString()]: 0 };
    }
    
    await chat.save();

    // Emit via socket
    const io = req.app.get("io");
    if (io) {
      // 1. Emit to the specific chat room (for users currently in the conversation)
      io.to(chatId).emit("newMessage", message);
      
      // 2. Emit to the other user's global room (for unread count updates/notifications across the app)
      io.to(`user:${otherId}`).emit("newNotification", {
        type: "message",
        chatId,
        content: content ? content.slice(0, 50) : "Sent a photo"
      });
    }

    // Create in-app notification for the other user
    let notifTitle = title; // reuse the title computed for push
    createNotification({
      recipient: otherId,
      sender: req.user._id,
      type: "message",
      title: notifTitle,
      body: image && !content ? "Sent a photo 📷" : `${content.slice(0, 60)}${content.length > 60 ? '...' : ''}`,
      data: { chatId: chatId.toString() }
    });

    // Send Push Notification (non-blocking)
    const targetUser = await User.findById(otherId).select("expoPushToken").lean();
    
    let title = "New Message";
    if (chat.isAnonymous && !chat.isRevealed) {
      if (chat.anonAuthorId && req.user._id.toString() === chat.anonAuthorId.toString()) {
        title = "🕳️ Anonymous Confessor";
      } else {
        const senderIdentity = chat.anonIdentities.get(req.user._id.toString()) || { name: "Someone", avatar: "👤" };
        title = `${senderIdentity.avatar} ${senderIdentity.name}`;
      }
    } else {
      const senderIdentity = chat.anonIdentities.get(req.user._id.toString()) || { name: "Someone", avatar: "👤" };
      title = `${senderIdentity.avatar} ${senderIdentity.name}`;
    }

    sendPushNotification(
      targetUser?.expoPushToken,
      title,
      image && !content ? "Sent a photo 📷" : `${content.slice(0, 60)}${content.length > 60 ? '...' : ''}`,
      { type: "message", chatId: chatId.toString() }
    );

    let responseName = user.name;
    let responseAvatar = user.avatar;

    if (chat.isAnonymous && !chat.isRevealed) {
      if (chat.anonAuthorId && req.user._id.toString() === chat.anonAuthorId.toString()) {
        responseName = "Anonymous Confessor";
        responseAvatar = "🕳️";
      }
    }

    // Return message with senderType instead of real ID
    const formattedMessage = {
      ...message.toObject(),
      senderType: "me",
      senderName: responseName,
      senderAvatar: responseAvatar,
      senderId: undefined
    };

    res.status(201).json(formattedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Reveal anonymous identity in a chat
export const revealIdentity = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // Only the anonymous author is allowed to reveal
    if (!chat.isAnonymous || !chat.anonAuthorId || chat.anonAuthorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Only the anonymous confessor can reveal their identity." });
    }

    chat.isRevealed = true;
    await chat.save();

    // Fetch real details to emit via socket
    const user = await User.findById(req.user._id).select("name avatar");

    // Emit socket event to notify other participant that identity is revealed
    const io = req.app.get("io");
    if (io) {
      io.to(chatId).emit("identityRevealed", {
        chatId,
        revealedUserId: req.user._id,
        name: user.name,
        avatar: user.avatar
      });
    }

    res.json({ success: true, message: "Identity revealed successfully!", chat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
