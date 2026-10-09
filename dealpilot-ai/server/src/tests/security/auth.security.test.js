// Set env vars BEFORE any module imports so config picks them up
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/dealpilot_test';
process.env.EMAIL_PROVIDER = 'test';
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test-access-secret-phase3-x';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret-phase3-x';
process.env.APP_BASE_URL = 'http://localhost:5000';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../app.js';
import User from '../../modules/users/user.model.js';
import RefreshSession from '../../modules/auth/refreshSession.model.js';
import { hashToken, generateSecureToken } from '../../common/utils/hash.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../tests/helpers/db.js';
import { clearSentEmails } from '../../integrations/email/emailProvider.js';
import { authStore } from '../../common/middleware/rateLimiter.js';

const VALID_USER = {
  firstName: 'Test',
  lastName: 'User',
  email: 'security@example.com',
  password: 'SecurePass1!',
};

async function registerAndVerify(userData = VALID_USER) {
  await request(app).post('/api/v1/auth/register').send(userData);
  await User.findOneAndUpdate({ email: userData.email.toLowerCase() }, { isEmailVerified: true });
}

async function loginUser(userData = VALID_USER) {
  const agent = request.agent(app);
  const res = await agent
    .post('/api/v1/auth/login')
    .send({ email: userData.email, password: userData.password });
  return { agent, loginRes: res };
}

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
  await clearCollections();
  clearSentEmails();
  // Reset rate limiter between tests so non-rate-limit tests aren't affected
  await authStore.resetKey('::ffff:127.0.0.1');
  await authStore.resetKey('::1');
  await authStore.resetKey('127.0.0.1');
});

// ─── Rate limiting ────────────────────────────────────────────────────────────

describe('Rate limiting', () => {
  it('returns 429 after 5 failed login attempts', async () => {
    // authLimiter is 5 req/15min window
    const attempts = [];
    for (let i = 0; i < 6; i++) {
      attempts.push(
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'rate@test.com', password: 'WrongPass1!' }),
      );
    }
    const results = await Promise.all(attempts);
    const statuses = results.map((r) => r.status);
    // At least one must be 429
    expect(statuses).toContain(429);
    // The first 5 should be 401 (invalid creds), the 6th should be 429
    expect(results[5].status).toBe(429);
  });
});

// ─── NoSQL injection guard ────────────────────────────────────────────────────

describe('NoSQL injection guard', () => {
  it('rejects non-string email (Joi strips $gt operator object)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: { $gt: '' }, password: 'test' });
    expect(res.status).toBe(400);
  });
});

// ─── Password hash not exposed ────────────────────────────────────────────────

describe('Password hash not exposed', () => {
  it('login response does not contain passwordHash', async () => {
    await registerAndVerify();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.status).toBe(200);
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('passwordHash');
  });

  it('GET /me response does not contain passwordHash', async () => {
    await registerAndVerify();
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    const token = loginRes.body.data.accessToken;
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    const bodyStr = JSON.stringify(meRes.body);
    expect(bodyStr).not.toContain('passwordHash');
  });
});

// ─── Refresh token reuse detection ───────────────────────────────────────────

describe('Refresh token reuse detection', () => {
  it('using an already-used refresh token returns 401', async () => {
    await registerAndVerify();
    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    // Grab the original cookie before the agent rotates it
    const setCookieHeader = loginRes.headers['set-cookie'];
    const originalCookie = setCookieHeader.find((c) => c.startsWith('refreshToken='));

    // First refresh — succeeds, agent now has new cookie
    const firstRefresh = await agent.post('/api/v1/auth/refresh');
    expect(firstRefresh.status).toBe(200);

    // Try to use the original (now rotated/revoked) token again
    const reuseAttempt = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie);
    expect(reuseAttempt.status).toBe(401);
  });
});

// ─── Expired refresh token ────────────────────────────────────────────────────

describe('Expired refresh token', () => {
  it('returns 401 when refresh token session is expired', async () => {
    await registerAndVerify();
    const user = await User.findOne({ email: VALID_USER.email.toLowerCase() });

    // Manually create an expired session
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    await RefreshSession.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', `refreshToken=${rawToken}`);
    expect(res.status).toBe(401);
  });
});

// ─── Cookie security flags ────────────────────────────────────────────────────

describe('Cookie security flags', () => {
  it('refreshToken cookie has HttpOnly flag', async () => {
    await registerAndVerify();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const refreshCookie = setCookie.find((c) => c.startsWith('refreshToken='));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie).toMatch(/HttpOnly/i);
  });

  it('refreshToken cookie does NOT have Secure flag in test env (NODE_ENV != production)', async () => {
    await registerAndVerify();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    const setCookie = res.headers['set-cookie'];
    const refreshCookie = setCookie.find((c) => c.startsWith('refreshToken='));
    // In test/dev env, Secure should not be present
    expect(refreshCookie).not.toMatch(/;\s*Secure/i);
  });
});

// ─── JWT security ─────────────────────────────────────────────────────────────

describe('JWT security', () => {
  it('rejects a manipulated JWT token', async () => {
    await registerAndVerify();
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    const token = loginRes.body.data.accessToken;

    // Tamper with the payload part (middle segment)
    const parts = token.split('.');
    const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    decodedPayload.role = 'admin'; // escalation attempt
    parts[1] = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
    const tamperedToken = parts.join('.');

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(401);
  });

  it('rejects an expired access token', async () => {
    await registerAndVerify();
    const user = await User.findOne({ email: VALID_USER.email.toLowerCase() });
    // Create a token that expired 1 second ago
    const expiredToken = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: -1 },
    );
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });
});

// ─── Account enumeration resistance ──────────────────────────────────────────

describe('Account enumeration resistance', () => {
  it('forgot-password returns same response for registered and unregistered emails', async () => {
    await registerAndVerify();
    const registeredRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: VALID_USER.email });
    const unknownRes = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@nowhere.com' });

    expect(registeredRes.status).toBe(200);
    expect(unknownRes.status).toBe(200);
    // Response bodies should be structurally identical (same message)
    expect(registeredRes.body.data.message).toBe(unknownRes.body.data.message);
  });
});

// ─── Soft-deleted account ─────────────────────────────────────────────────────

describe('Soft-deleted account', () => {
  it('login returns 401 after account soft-delete', async () => {
    await registerAndVerify();
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(loginRes.status).toBe(200);

    // Soft-delete the user directly
    await User.findOneAndUpdate(
      { email: VALID_USER.email.toLowerCase() },
      { deletedAt: new Date(), isActive: false },
    );

    const secondLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(secondLogin.status).toBe(401);
  });
});
