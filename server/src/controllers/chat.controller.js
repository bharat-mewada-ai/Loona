import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import User from "../models/user.model.js";
import { generateAnonIdentity } from "../utils/anonIdentity.js";
import { sendPushNotification } from "../utils/pushNotifications.js";
import { checkContent } from "../utils/moderation.js";

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
      
      return {
        _id: chat._id,
        avatar: otherUser?.avatar || "👤",
        name: otherUser?.name || "Anonymous",
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

// Start a chat from a post
export const startChat = async (req, res) => {
  try {
    const { targetUserId, postId } = req.body;
    if (!targetUserId || !postId) return res.status(400).json({ error: "Missing required fields" });
    if (targetUserId === req.user._id.toString()) return res.status(400).json({ error: "Cannot chat with yourself" });

    // Check if chat already exists
    let chat = await Chat.findOne({
      participants: { $all: [req.user._id, targetUserId] },
    });

    if (!chat) {
      // Get real names and avatars for both participants
      const [u1, u2] = await Promise.all([
        User.findById(req.user._id).select('name avatar'),
        User.findById(targetUserId).select('name avatar')
      ]);

      chat = await Chat.create({
        participants: [req.user._id, targetUserId],
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

    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get messages for a chat
export const getMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id }).populate("participants", "name avatar");
    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // Mark messages as read
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
      return {
        ...msg,
        senderType: msg.senderId.toString() === req.user._id.toString() ? "me" : "other",
        senderName: sender?.name || "Anonymous",
        senderAvatar: sender?.avatar || "👤",
        senderId: undefined,
      };
    });

    // Mask identities to use 'me'/'other' keys
    const otherUser = chat.participants.find(p => p._id.toString() !== req.user._id.toString());
    const meUser = chat.participants.find(p => p._id.toString() === req.user._id.toString());
    const identities = {
      me: { name: meUser?.name, avatar: meUser?.avatar, id: meUser?._id },
      other: { name: otherUser?.name, avatar: otherUser?.avatar, id: otherUser?._id }
    };

    res.json({
      chat: {
        _id: chat._id,
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
        content: content.slice(0, 50)
      });
    }

    // Send Push Notification (non-blocking)
    const targetUser = await User.findById(otherId).select("expoPushToken").lean();
    const senderIdentity = chat.anonIdentities.get(req.user._id.toString()) || { name: "Someone", avatar: "👤" };
    
    sendPushNotification(
      targetUser?.expoPushToken,
      `${senderIdentity.avatar} New Message`,
      image && !content ? "Sent a photo 📷" : `${content.slice(0, 60)}${content.length > 60 ? '...' : ''}`,
      { type: "message", chatId: chatId.toString() }
    );

    // Return message with senderType instead of real ID
    const formattedMessage = {
      ...message.toObject(),
      senderType: "me",
      senderName: user.name,
      senderAvatar: user.avatar,
      senderId: undefined
    };

    res.status(201).json(formattedMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
