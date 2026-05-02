import 'dotenv/config';
import Queue from 'bull';
import Post from '../models/post.model.js';
import logger from './logger.js';

const REDIS_URL = process.env.REDIS_URL;
let burnQueue = null;

if (REDIS_URL) {
  try {
    burnQueue = new Queue('burn-posts', REDIS_URL, {
      settings: { maxStalledCount: 0 },
      redis: {
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
        retryStrategy: () => null
      }
    });

    burnQueue.on('error', (err) => {
      // Log only once or quietly
      if (!burnQueue._hasLoggedError) {
        logger.warn('⚠️ Burn Queue: Redis not connected. Falling back to cron scheduler.');
        burnQueue._hasLoggedError = true;
      }
    });

    burnQueue.process(async (job) => {
      const { postId } = job.data;
      try {
        const post = await Post.findById(postId);
        if (post && post.burnAfter24h) {
          await post.deleteOne();
          logger.info(`✅ Queue: Post ${postId} burned.`);
        }
      } catch (err) {
        logger.error(`❌ Queue burn fail ${postId}:`, err.message);
      }
    });
  } catch (err) {
    logger.warn('⚠️ Burn Queue initialization skipped:', err.message);
  }
} else {
  logger.warn('⚠️ Burn Queue: No REDIS_URL, using cron-only mode.');
}

// Redis error handler moved inside the conditional block above

// ── Hourly fallback cron (runs even without Redis) ───────────────────────────
// Finds posts whose 24-hour burn window has elapsed and deletes them directly.
setInterval(async () => {
  try {
    const expired = await Post.find({
      burnAfter24h: true,
      burnAt: { $lte: new Date() },
    });
    for (const post of expired) await post.deleteOne();
    if (expired.length) {
      logger.info(`🔥 Cron burned ${expired.length} expired posts.`);
    }
  } catch (err) {
    logger.error('⚠️  Fallback Burn Error:', err.message);
  }
}, 60 * 60 * 1000);

export const scheduleBurn = async (postId) => {
  if (!burnQueue) return; // Silent fallback to cron
  try {
    await burnQueue.add(
      { postId },
      { delay: 24 * 60 * 60 * 1000, removeOnComplete: true }
    );
  } catch {
    // Already handled by cron
  }
};

export default burnQueue;
