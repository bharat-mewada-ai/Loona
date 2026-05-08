import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 Load Test for Loona Production
 * 
 * Scenario:
 * 1. Ramp up from 0 to 100 virtual users (VUs) over 1 minute.
 * 2. Stay at 100 VUs for 3 minutes (Stress test).
 * 3. Ramp down to 0 VUs over 30 seconds.
 * 
 * Goals:
 * - Average response time < 200ms
 * - P95 response time < 500ms
 * - Error rate < 1%
 */

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp-up
    { duration: '3m', target: 100 }, // Steady state
    { duration: '30s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';

export default function () {
  // 1. Fetch Feed (Cached)
  const feedRes = http.get(`${BASE_URL}/posts?campus=ogi&limit=10`);
  check(feedRes, {
    'feed status is 200': (r) => r.status === 200,
    'feed has posts': (r) => JSON.parse(r.body).posts !== undefined,
  });

  sleep(1);

  // 2. Fetch Stats (Cached)
  const statsRes = http.get(`${BASE_URL}/posts/stats`);
  check(statsRes, {
    'stats status is 200': (r) => r.status === 200,
  });

  sleep(2);

  // 3. Search Posts
  const searchRes = http.get(`${BASE_URL}/posts/search/posts?q=test`);
  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
