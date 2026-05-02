import Redis from 'ioredis';
import 'dotenv/config';

console.log("Connecting to:", process.env.REDIS_URL);
const redis = new Redis(process.env.REDIS_URL, {
  connectTimeout: 5000,
  maxRetriesPerRequest: 1
});

redis.on('connect', () => {
  console.log('✅ Connected successfully!');
  process.exit(0);
});

redis.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  process.exit(1);
});
