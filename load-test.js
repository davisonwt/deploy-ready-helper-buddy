// k6 Load Testing Script
// Install: npm i -g k6 (or use Docker)
// Run: k6 run load-test.js

import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 20 },  // Ramp up to 20 users
    { duration: '5m', target: 20 },  // Stay at 20 users
    { duration: '2m', target: 50 },  // Ramp up to 50 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failed requests
    http_reqs: ['rate>10'],           // At least 10 requests per second
  },
};

// Base URL - Change this to your deployed URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const SUPABASE_URL = __ENV.SUPABASE_URL || 'https://your-project.supabase.co';
const headers = { 'Content-Type': 'application/json' };

export default function () {
  // Test 1: Homepage load
  const homeRes = http.get(BASE_URL);
  check(homeRes, {
    'homepage status 200': (r) => r.status === 200,
    'homepage loads in <500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);

  // Test 2: Browse orchards (public endpoint)
  const orchardsRes = http.get(`${BASE_URL}/browse-orchards`);
  check(orchardsRes, {
    'orchards page status 200': (r) => r.status === 200,
  });

  sleep(1);

  // Test 3: Supabase API - public data
  const publicDataRes = http.get(
    `${SUPABASE_URL}/rest/v1/orchards?select=*&limit=10`,
    {
      headers: {
        ...headers,
        apikey: __ENV.SUPABASE_ANON_KEY || 'your-anon-key',
      },
    }
  );

  check(publicDataRes, {
    'public data status 200': (r) => r.status === 200,
    'public data returns results': (r) => {
      try {
        const data = JSON.parse(r.body);
        return Array.isArray(data);
      } catch {
        return false;
      }
    },
  });

  sleep(2); // Think time between requests
}

// Test scenarios for authenticated users
export function authenticatedFlow() {
  // Test login
  const loginRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({
      email: __ENV.TEST_EMAIL || 'test@example.com',
      password: __ENV.TEST_PASSWORD || 'testpassword',
    }),
    { headers }
  );

  check(loginRes, { 'login status 200': (r) => r.status === 200 });

  if (loginRes.status !== 200) {
    return;
  }

  const token = loginRes.json('access_token');
  const authHeaders = {
    ...headers,
    Authorization: `Bearer ${token}`,
  };

  // Test authenticated endpoints
  const profileRes = http.get(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
    headers: authHeaders,
  });

  check(profileRes, { 'profile status 200': (r) => r.status === 200 });

  sleep(1);
}

// Stress test scenario
export function stressTest() {
  const scenarios = {
    stress: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
    },
  };
}
