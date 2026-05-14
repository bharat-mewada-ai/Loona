import { describe, it, expect, vi } from 'vitest';
import { checkAndAwardBadges } from '../src/utils/badgeService.js';

describe('BadgeService', () => {
  it('should award Trailblazer badge on first post', async () => {
    const mockUser = {
      _id: 'user123',
      postCount: 1,
      badges: [],
      karma: 0,
      streak: 0,
      save: vi.fn()
    };

    const awarded = await checkAndAwardBadges(mockUser);
    
    expect(awarded).toBe(true);
    expect(mockUser.badges).toContainEqual(expect.objectContaining({ name: 'Trailblazer' }));
  });

  it('should award Legend badge when karma hits 100', async () => {
    const mockUser = {
      _id: 'user123',
      postCount: 10,
      badges: [{ name: 'Trailblazer', icon: '🚀' }],
      karma: 105,
      streak: 0,
      save: vi.fn()
    };

    const awarded = await checkAndAwardBadges(mockUser);
    
    expect(awarded).toBe(true);
    expect(mockUser.badges).toContainEqual(expect.objectContaining({ name: 'Legend' }));
  });

  it('should not award duplicate badges', async () => {
    const mockUser = {
      _id: 'user123',
      postCount: 5,
      badges: [{ name: 'Trailblazer', icon: '🚀' }],
      karma: 10,
      streak: 0,
      save: vi.fn()
    };

    const awarded = await checkAndAwardBadges(mockUser);
    
    expect(awarded).toBe(false);
    expect(mockUser.badges.length).toBe(1);
  });

  it('should award Consistent badge for 7-day streak', async () => {
    const mockUser = {
      _id: 'user123',
      postCount: 10,
      badges: [],
      karma: 50,
      streak: 7,
      save: vi.fn()
    };

    const awarded = await checkAndAwardBadges(mockUser);
    
    expect(awarded).toBe(true);
    expect(mockUser.badges).toContainEqual(expect.objectContaining({ name: 'Consistent' }));
  });
});
