import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Chat from '../src/models/chat.model.js';
import Message from '../src/models/message.model.js';
import jwt from 'jsonwebtoken';

describe('Chat Controller (Anonymity)', () => {
  let user1, user2, user1Token, user2Token, chat;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_secret';
    user1 = await User.create({ email: 'user1@loona.com', name: 'User 1', campus: 'ogi' });
    user2 = await User.create({ email: 'user2@loona.com', name: 'User 2', campus: 'ogi' });

    user1Token = jwt.sign({ id: user1._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    user2Token = jwt.sign({ id: user2._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    chat = await Chat.create({
      participants: [user1._id, user2._id],
      isAnonymous: true,
      anonAuthorId: user1._id, // user1 is the anonymous author
      isRevealed: false,
    });

    await Message.create({
      chatId: chat._id,
      senderId: user1._id,
      content: 'Hello from anon',
      readBy: [user1._id]
    });
  });

  it('should not leak anonAuthorId to the non-author participant in getMessages', async () => {
    // Non-author (user2) requesting messages
    const res = await request(app)
      .get(`/api/v1/chats/${chat._id}/messages`)
      .set('Authorization', `Bearer ${user2Token}`);

    expect(res.status).toBe(200);
    // User 2 should NOT see anonAuthorId
    expect(res.body.chat.anonAuthorId).toBeUndefined();
    // User 2 should NOT see the real ID of User 1
    expect(res.body.chat.identities.other.id).toBeNull();
  });

  it('should allow the author to see anonAuthorId in getMessages', async () => {
    // Author (user1) requesting messages
    const res = await request(app)
      .get(`/api/v1/chats/${chat._id}/messages`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    // User 1 SHOULD see anonAuthorId because they are the author
    expect(res.body.chat.anonAuthorId).toBe(user1._id.toString());
  });
});
