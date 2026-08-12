import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:4000';

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, { 'health 200': (r) => r.status === 200 });

  // Get leaderboard
  const leaderboardRes = http.get(`${BASE_URL}/api/v1/leaderboard`);
  check(leaderboardRes, { 'leaderboard 200': (r) => r.status === 200 });

  // Get tracking positions
  const trackingRes = http.get(`${BASE_URL}/api/v1/tracking/positions?eventId=default-event-id`);
  check(trackingRes, { 'tracking 200': (r) => r.status === 200 });

  // Get trees
  const treesRes = http.get(`${BASE_URL}/api/v1/trees/counter`);
  check(treesRes, { 'trees 200': (r) => r.status === 200 });

  // Get announcements
  const announcementsRes = http.get(`${BASE_URL}/api/v1/announcements`);
  check(announcementsRes, { 'announcements 200': (r) => r.status === 200 });

  // Get sponsors
  const sponsorsRes = http.get(`${BASE_URL}/api/v1/sponsors`);
  check(sponsorsRes, { 'sponsors 200': (r) => r.status === 200 });

  // Get green impact
  const greenRes = http.get(`${BASE_URL}/api/v1/green/impact`);
  check(greenRes, { 'green impact 200': (r) => r.status === 200 });

  // Auth endpoint (POST)
  const authRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'admin@isa.org',
    password: 'admin123',
  }), { headers: { 'Content-Type': 'application/json' } });
  check(authRes, { 'auth 200': (r) => r.status === 200 });

  sleep(1);
}
