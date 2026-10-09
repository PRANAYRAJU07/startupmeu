import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../tests/helpers/db.js';
import app from '../../app.js';
import User from '../users/user.model.js';
import Investor from './investor.model.js';
import SavedInvestor from './savedInvestor.model.js';
import { generateAccessToken } from '../../common/utils/token.js';
import config from '../../config/index.js';

beforeAll(async () => { await connectTestDb(); });

afterAll(async () => { await disconnectTestDb(); });

describe('Investor Routes', () => {
  let userA, tokenA;
  let investor1, investor2;

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

    investor1 = await Investor.create({
      name: 'Tech Ventures',
      organization: 'Tech VC',
      investorType: 'vc',
      industries: ['saas', 'fintech'],
      stages: ['seed', 'series-a'],
      isDemoData: true,
      isActive: true,
    });

    investor2 = await Investor.create({
      name: 'Health Angels',
      organization: 'Health Angels',
      investorType: 'angel',
      industries: ['healthtech'],
      stages: ['pre-seed', 'seed'],
      isDemoData: true,
      isActive: true,
    });
  });

  it('GET /api/v1/investors > returns list with pagination', async () => {
    const res = await request(app)
      .get('/api/v1/investors?limit=1')
      .set('Authorization', `Bearer ${tokenA}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.totalPages).toBe(2);
  });

  it('GET /api/v1/investors > filters by industry', async () => {
    const res = await request(app)
      .get('/api/v1/investors?industry=healthtech')
      .set('Authorization', `Bearer ${tokenA}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Health Angels');
  });

  it('POST /api/v1/saved-investors > saves an investor', async () => {
    const res = await request(app)
      .post('/api/v1/saved-investors')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ investorId: investor1._id.toString(), notes: 'looks promising' });
    
    expect(res.status).toBe(201);
    expect(res.body.data.investorId).toBe(investor1._id.toString());
  });

  it('GET /api/v1/saved-investors > returns saved investors', async () => {
    await SavedInvestor.create({ userId: userA._id, investorId: investor1._id, notes: 'good' });

    const res = await request(app)
      .get('/api/v1/saved-investors')
      .set('Authorization', `Bearer ${tokenA}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].notes).toBe('good');
    expect(res.body.data[0].investorId._id.toString()).toBe(investor1._id.toString());
  });

  it('DELETE /api/v1/saved-investors/:id > removes a saved investor', async () => {
    const saved = await SavedInvestor.create({ userId: userA._id, investorId: investor1._id });

    const delRes = await request(app)
      .delete(`/api/v1/saved-investors/${saved._id}`)
      .set('Authorization', `Bearer ${tokenA}`);
    
    expect(delRes.status).toBe(204);

    const check = await SavedInvestor.findById(saved._id);
    expect(check).toBeNull();
  });
});
