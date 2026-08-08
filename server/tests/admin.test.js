import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import jwt from 'jsonwebtoken';

describe('Admin Routes (PII Scrubbing)', () => {
  let adminUser, normalUser, adminToken, ownerToken, ownerUser;

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test_secret';
    
    ownerUser = await User.create({ email: 'owner@loona.com', name: 'Owner', campus: 'ogi', role: 'admin' });
    adminUser = await User.create({ email: 'admin@loona.com', name: 'Admin', campus: 'ogi', role: 'admin' });
    
    // Normal user with sensitive PII
    normalUser = await User.create({ 
      email: 'user@loona.com', 
      name: 'Normal User', 
      campus: 'ogi', 
      password: 'hashed_password_123',
      refreshTokens: ['token1', 'token2'],
      location: { type: 'Point', coordinates: [77.2, 28.6] }
    });

    process.env.OWNER_USER_ID = ownerUser._id.toString();

    adminToken = jwt.sign({ id: adminUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    ownerToken = jwt.sign({ id: ownerUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  it('should scrub password and refreshTokens for a regular admin', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${normalUser._id}/details`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    const returnedUser = res.body.user;
    
    // Non-owner should not see these
    expect(returnedUser.password).toBeUndefined();
    expect(returnedUser.refreshTokens).toBeUndefined();
    expect(returnedUser.location).toBeUndefined();
    
    // Non-owner should see these
    expect(returnedUser.email).toBe('user@loona.com');
    expect(returnedUser.name).toBe('Normal User');
  });

  it('should include refreshTokens and location (but not password) for the owner', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/users/${normalUser._id}/details`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    const returnedUser = res.body.user;
    
    // Owner should see these
    expect(returnedUser.refreshTokens).toBeDefined();
    expect(returnedUser.location).toBeDefined();
    
    // Password should be scrubbed even for owner
    expect(returnedUser.password).toBeUndefined();
  });
});
