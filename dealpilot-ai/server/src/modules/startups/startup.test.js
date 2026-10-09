import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../tests/helpers/db.js';
import app from '../../app.js';
import User from '../users/user.model.js';
import Startup from './startup.model.js';
import { generateAccessToken } from '../../common/utils/token.js';
import config from '../../config/index.js';

beforeAll(async () => { await connectTestDb(); });

afterAll(async () => { await disconnectTestDb(); });

describe('Startup Routes', () => {
  let userA, tokenA;
  let userB, tokenB;

  beforeEach(async () => {
    await clearCollections();

    userA = await User.create({
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      passwordHash: 'hashed',
      role: 'founder',
    });
    tokenA = generateAccessToken({ sub: userA._id.toString(), email: userA.email }, config.accessTokenSecret, '1h');

    userB = await User.create({
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
      passwordHash: 'hashed',
      role: 'founder',
    });
    tokenB = generateAccessToken({ sub: userB._id.toString(), email: userB.email }, config.accessTokenSecret, '1h');
  });

  const validStartupPayload = {
    name: 'TechFlow',
    industry: 'saas',
    stage: 'seed',
    targetRaiseAmount: 1500000,
    headquartersCountry: 'United States',
    description: 'A great SaaS startup',
  };

  it('POST /api/v1/startups/me > creates a new startup', async () => {
    const res = await request(app)
      .post('/api/v1/startups/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(validStartupPayload);
    
    if (res.status !== 201) {
      console.log(res.body);
    }
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('TechFlow');
    expect(res.body.data.userId).toBe(userA._id.toString());
  });

  it('GET /api/v1/startups/me > returns 404 if not created', async () => {
    const res = await request(app)
      .get('/api/v1/startups/me')
      .set('Authorization', `Bearer ${tokenA}`);
    
    expect(res.status).toBe(404);
  });

  it('PUT /api/v1/startups/me > updates existing startup', async () => {
    await Startup.create({ ...validStartupPayload, userId: userA._id });

    const res = await request(app)
      .put('/api/v1/startups/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'TechFlow v2' });
    
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('TechFlow v2');
  });

  it('DELETE /api/v1/startups/me > deletes the startup', async () => {
    await Startup.create({ ...validStartupPayload, userId: userA._id });

    const delRes = await request(app)
      .delete('/api/v1/startups/me')
      .set('Authorization', `Bearer ${tokenA}`);
    
    expect(delRes.status).toBe(204);

    const getRes = await request(app)
      .get('/api/v1/startups/me')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(getRes.status).toBe(404);
  });
});
