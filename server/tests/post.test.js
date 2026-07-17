import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Post from '../src/models/post.model.js';
import jwt from 'jsonwebtoken';

describe('Post Controller', () => {
  let token;
  let user;

  beforeEach(async () => {
    // Clear DB is already handled by afterEach in setup.js

    // Create a test user
    user = await User.create({
      googleId: 'test-voter-google-id',
      email: 'voter@loona.com',
      campus: 'lnct',
      name: 'VoterUser',
      avatar: '🦊',
      potato: 25,
    });

    // Generate token
    token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  describe('POST /api/v1/posts', () => {
    it('should successfully create a post', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'My test post',
          body: 'This is a test post body',
          type: 'discussion',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('_id');
      expect(res.body.title).toBe('My test post');
      expect(res.body.author.toString()).toBe(user._id.toString());
    });

    it('should fail to create post if title is missing for discussion', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          body: 'This is a test post body without title',
          type: 'discussion',
        });

      expect(res.status).toBe(422);
    });

    it('should successfully create a confession without title', async () => {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({
          body: 'This is an anonymous confession',
          type: 'confess',
        });

      expect(res.status).toBe(201);
      expect(res.body.type).toBe('confess');
      expect(res.body.title).toBe('');
    });
  });

  describe('POST /api/v1/posts/:id/vote', () => {
    it('should toggle vote successfully', async () => {
      // 1. Create a post
      const post = await Post.create({
        title: 'Post to vote on',
        body: 'Post body',
        campus: 'lnct',
        type: 'discussion',
        author: user._id,
        anonName: user.name,
        anonAvatar: user.avatar,
      });

      // 2. Vote on it
      const res = await request(app)
        .post(`/api/v1/posts/${post._id}/vote`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(res.status).toBe(200);
      expect(res.body.upvotes).toBe(1);
      expect(res.body.hasVoted).toBe(true);

      // Verify DB post upvotes count
      const updatedPost = await Post.findById(post._id);
      expect(updatedPost.upvotes).toBe(1);

      // 3. Unvote
      const resUnvote = await request(app)
        .post(`/api/v1/posts/${post._id}/vote`)
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(resUnvote.status).toBe(200);
      expect(resUnvote.body.upvotes).toBe(0);
      expect(resUnvote.body.hasVoted).toBe(false);

      const unvotedPost = await Post.findById(post._id);
      expect(unvotedPost.upvotes).toBe(0);
    });
  });
});
