import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

// Mock Google Library
vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(function() {
      return {
        verifyIdToken: vi.fn().mockResolvedValue({
          getPayload: () => ({
            sub: 'test-google-id',
            email: 'test@loona.com',
            name: 'Test User',
          }),
        }),
      };
    }),
  };
});

describe('Auth Controller', () => {
  describe('POST /api/auth/google', () => {
    it('should create a new user and return tokens on first login', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          token: 'fake-valid-token',
          campus: 'ogi',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe('test@loona.com');
      expect(res.body.user.campus).toBe('ogi');

      const user = await User.findOne({ email: 'test@loona.com' });
      expect(user).toBeTruthy();
      expect(user.googleId).toBe('test-google-id');
    });

    it('should login existing user without requiring campus', async () => {
      // Pre-create user
      await User.create({
        googleId: 'test-google-id',
        email: 'test@loona.com',
        campus: 'ogi',
        name: 'Existing User',
      });

      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({
          token: 'fake-valid-token',
        });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('test@loona.com');
    });

    it('should fail if token is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/google')
        .send({ campus: 'ogi' });

      expect(res.status).toBe(422);
    });
  });
});
