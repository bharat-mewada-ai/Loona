import logger from './logger.js';

const BADGE_DEFINITIONS = [
  { id: 'first_post', name: 'Trailblazer', icon: '🚀', description: 'Posted your first Loona' },
  { id: 'hot_poster', name: 'Spicy', icon: '🔥', description: 'Had a post go trending' },
  { id: 'legend', name: 'Legend', icon: '👑', description: 'Reached 100 Potatoes' },
  { id: 'streak_7', name: 'Consistent', icon: '⚡', description: 'Maintained a 7-day streak' },
  { id: 'verified', name: 'Verified', icon: '✅', description: 'Verified account' },
  { id: 'top_contributor', name: 'Top Contributor', icon: '🏆', description: 'Top 10 in campus' }
];

/**
 * Checks and awards badges to a user based on their current stats.
 * @param {object} user - The mongoose user document.
 * @returns {Promise<boolean>} - True if any new badges were awarded.
 */
export const checkAndAwardBadges = async (user) => {
  if (!user) return false;
  
  // 0. Sanitize existing badges to ensure no strings are present
  if (user.badges && Array.isArray(user.badges)) {
    user.badges = user.badges.filter(b => b && typeof b === 'object' && b.name);
  }
  
  const existingBadgeNames = new Set(user.badges.map(b => b.name));
  const newBadges = [];

  // 1. First Post
  if (user.postCount >= 1 && !existingBadgeNames.has('Trailblazer')) {
    newBadges.push({ name: 'Trailblazer', icon: '🚀' });
  }

  // 2. Legend (Potato >= 100)
  if (user.potato >= 100 && !existingBadgeNames.has('Legend')) {
    newBadges.push({ name: 'Legend', icon: '👑' });
  }

  // 3. Consistent (Streak >= 7)
  if (user.streak >= 7 && !existingBadgeNames.has('Consistent')) {
    newBadges.push({ name: 'Consistent', icon: '⚡' });
  }

  // 4. Verified
  if (user.isVerified && !existingBadgeNames.has('Verified')) {
    newBadges.push({ name: 'Verified', icon: '✅' });
  }

  if (newBadges.length > 0) {
    user.badges.push(...newBadges);
    logger.info(`[BadgeService] Awarded ${newBadges.length} badges to user ${user._id}`);
    return true;
  }

  return false;
};

export default checkAndAwardBadges;
