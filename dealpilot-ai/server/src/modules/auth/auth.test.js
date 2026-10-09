// Set env vars BEFORE any module imports so config picks them up
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/dealpilot_test';
process.env.EMAIL_PROVIDER = 'test';
process.env.ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'test-access-secret-phase3-x';
process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test-refresh-secret-phase3-x';
process.env.APP_BASE_URL = 'http://localhost:5000';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../app.js';
import User from '../users/user.model.js';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../tests/helpers/db.js';
import { getSentEmails, clearSentEmails } from '../../integrations/email/emailProvider.js';
import { authStore } from '../../common/middleware/rateLimiter.js';

const VALID_USER = {
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  password: 'SecurePass1!',
};

/** Reset known IP keys used by supertest in rate limiter */
async function resetRateLimiter() {
  for (const ip of ['::ffff:127.0.0.1', '::1', '127.0.0.1']) {
    await authStore.resetKey(ip);
  }
}

/**
 * Register a user and manually set isEmailVerified so they can log in.
 */
async function registerAndVerify(userData = VALID_USER) {
  await request(app).post('/api/v1/auth/register').send(userData);
  await User.findOneAndUpdate({ email: userData.email.toLowerCase() }, { isEmailVerified: true });
}

/**
 * Register, verify, and log in.
 * Returns agent (with refresh cookie), loginRes, and accessToken.
 */
async function registerVerifyLogin(userData = VALID_USER) {
  await registerAndVerify(userData);
  const agent = request.agent(app);
  const loginRes = await agent.post('/api/v1/auth/login').send({
    email: userData.email,
    password: userData.password,
  });
  const accessToken = loginRes.body.data?.accessToken;
  return { agent, loginRes, accessToken };
}

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

beforeEach(async () => {
    await clearCollections();
  await clearCollections();
  clearSentEmails();
  await resetRateLimiter();
});

// ─── POST /register ────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('returns 201 and user without passwordHash', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(VALID_USER);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.body.data.user.email).toBe(VALID_USER.email.toLowerCase());
  });

  it('sends a verification email to the test provider', async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_USER);
    // Give fire-and-forget a tick to complete
    await new Promise((r) => setTimeout(r, 50));
    const emails = getSentEmails();
    expect(emails.length).toBe(1);
    expect(emails[0].to).toBe(VALID_USER.email.toLowerCase());
  });

  it('returns 409 on duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_USER);
    await resetRateLimiter();
    const res = await request(app).post('/api/v1/auth/register').send(VALID_USER);
    expect(res.status).toBe(409);
    // Generic message — must NOT confirm the email is taken
    expect(res.body.error.message).not.toMatch(/email.*already/i);
  });

  it('returns 400 on weak/short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...VALID_USER, password: 'short' });
    expect(res.status).toBe(400);
  });

  it('returns 400 on missing required fields', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.fieldErrors).toBeDefined();
  });
});

// ─── POST /login ──────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('returns 401 when email not verified', async () => {
    await request(app).post('/api/v1/auth/register').send(VALID_USER);
    await resetRateLimiter();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.status).toBe(401);
  });

  it('returns 401 on wrong password', async () => {
    await registerAndVerify();
    await resetRateLimiter();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  it('returns 200 with accessToken in body and refreshToken cookie on success', async () => {
    await registerAndVerify();
    await resetRateLimiter();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    // refreshToken must be in Set-Cookie header
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie.some((c) => c.startsWith('refreshToken='))).toBe(true);
    expect(setCookie.some((c) => c.includes('HttpOnly'))).toBe(true);
  });

  it('returns 400 on missing fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

// ─── GET /me ──────────────────────────────────────────────────────────────────

describe('GET /api/v1/auth/me', () => {
  it('returns 401 with no Authorization header', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user object and no passwordHash on valid token', async () => {
    const { accessToken } = await registerVerifyLogin();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(VALID_USER.email.toLowerCase());
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });
});

// ─── POST /refresh ────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('returns 200 with new accessToken and new refreshToken cookie', async () => {
    const { agent } = await registerVerifyLogin();
    await resetRateLimiter();
    const res = await agent.post('/api/v1/auth/refresh');
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    const setCookie = res.headers['set-cookie'];
    expect(setCookie.some((c) => c.startsWith('refreshToken='))).toBe(true);
  });

  it('returns 401 when no refreshToken cookie', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('returns 401 on invalid refreshToken cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'refreshToken=aaaa1234bbbb5678cccc9012dddd3456eeee7890ffff1234aaaa5678bbbb9012');
    expect(res.status).toBe(401);
  });

  it('token rotation: using same refresh token twice returns 401 on second use', async () => {
    await registerAndVerify();
    await resetRateLimiter();
    const agent = request.agent(app);
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });

    // Extract the original refresh token cookie value
    const setCookieHeader = loginRes.headers['set-cookie'];
    const originalCookie = setCookieHeader.find((c) => c.startsWith('refreshToken='));

    // First refresh — uses the original token, should succeed
    await resetRateLimiter();
    const firstRefresh = await agent.post('/api/v1/auth/refresh');
    expect(firstRefresh.status).toBe(200);

    // Second attempt with the OLD token — must return 401
    await resetRateLimiter();
    const secondRefresh = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', originalCookie);
    expect(secondRefresh.status).toBe(401);
  });
});

// ─── POST /logout ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('returns 200 and clears cookie', async () => {
    const { agent, accessToken } = await registerVerifyLogin();
    const res = await agent
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});

// ─── POST /forgot-password ────────────────────────────────────────────────────

describe('POST /api/v1/auth/forgot-password', () => {
  it('returns 200 for unknown email (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'unknown@example.com' });
    expect(res.status).toBe(200);
  });

  it('returns 200 for known email and sends one email', async () => {
    await registerAndVerify();
    clearSentEmails();
    await resetRateLimiter();
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: VALID_USER.email });
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    const emails = getSentEmails();
    expect(emails.length).toBe(1);
  });
});

// ─── Full password reset flow ──────────────────────────────────────────────────

describe('Full password reset flow', () => {
  it('allows login with new password after reset, rejects old password', async () => {
    // 1. Register
    await request(app).post('/api/v1/auth/register').send(VALID_USER);
    await new Promise((r) => setTimeout(r, 50));
    const verifyEmails = getSentEmails();
    expect(verifyEmails.length).toBeGreaterThan(0);
    const verifyEmailItem = verifyEmails[0];
    // Extract token from URL in text body
    const verifyUrlMatch = verifyEmailItem.text.match(/token=([0-9a-f]{64})/);
    expect(verifyUrlMatch).not.toBeNull();
    const verifyToken = verifyUrlMatch[1];

    // 2. Verify email via GET
    const verifyRes = await request(app).get(`/api/v1/auth/verify-email?token=${verifyToken}`);
    expect(verifyRes.status).toBe(200);

    clearSentEmails();
    await resetRateLimiter();

    // 3. Login with original password
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(loginRes.status).toBe(200);

    await resetRateLimiter();

    // 4. Forgot password
    await request(app).post('/api/v1/auth/forgot-password').send({ email: VALID_USER.email });
    await new Promise((r) => setTimeout(r, 50));
    const resetEmails = getSentEmails();
    expect(resetEmails.length).toBeGreaterThan(0);
    const resetEmailItem = resetEmails[0];
    const resetUrlMatch = resetEmailItem.text.match(/token=([0-9a-f]{64})/);
    expect(resetUrlMatch).not.toBeNull();
    const resetToken = resetUrlMatch[1];

    await resetRateLimiter();

    // 5. Reset password
    const newPassword = 'NewSecurePass2@';
    const resetRes = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: newPassword });
    expect(resetRes.status).toBe(200);

    await resetRateLimiter();

    // 6. Login with new password succeeds
    const newLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: newPassword });
    expect(newLoginRes.status).toBe(200);

    await resetRateLimiter();

    // 7. Login with old password fails
    const oldLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: VALID_USER.email, password: VALID_USER.password });
    expect(oldLoginRes.status).toBe(401);
  });
});

// ─── Cross-account isolation ──────────────────────────────────────────────────

describe('Cross-account isolation', () => {
  it('GET /me with user A token returns user A, not user B', async () => {
    const userA = {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice-a@example.com',
      password: 'SecurePass1!',
    };
    const userB = {
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob-b@example.com',
      password: 'SecurePass1!',
    };

    await registerAndVerify(userA);
    await registerAndVerify(userB);
    await resetRateLimiter();

    const loginA = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: userA.email, password: userA.password });
    expect(loginA.status).toBe(200);
    const tokenA = loginA.body.data.accessToken;

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe(userA.email.toLowerCase());
    expect(meRes.body.data.user.email).not.toBe(userB.email.toLowerCase());
  });
});
