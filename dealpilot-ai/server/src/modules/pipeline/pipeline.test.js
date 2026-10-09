import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../tests/helpers/db.js';
import app from '../../app.js';
import User from '../users/user.model.js';
import Investor from '../investors/investor.model.js';
import Deal from './deal.model.js';
import { generateAccessToken } from '../../common/utils/token.js';
import config from '../../config/index.js';

beforeAll(async () => { await connectTestDb(); });

afterAll(async () => { await disconnectTestDb(); });

describe('Pipeline and Analytics Routes', () => {
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
      investorType: 'vc',
      industries: ['saas'],
      stages: ['seed'],
      isActive: true,
    });
    
    investor2 = await Investor.create({
      name: 'Angel Bob',
      investorType: 'angel',
      industries: ['healthtech'],
      stages: ['seed'],
      isActive: true,
    });
  });

  it('POST /api/v1/deals > creates a deal', async () => {
    const res = await request(app)
      .post('/api/v1/deals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        investorId: investor1._id.toString(),
        stage: 'shortlisted',
        notes: 'Initial contact via LinkedIn',
      });
      
    expect(res.status).toBe(201);
    expect(res.body.data.stage).toBe('shortlisted');
    expect(res.body.data.investorId).toBe(investor1._id.toString());
  });

  it('GET /api/v1/deals > gets list of deals', async () => {
    await Deal.create({ userId: userA._id, investorId: investor1._id, stage: 'contacted' });

    const res = await request(app)
      .get('/api/v1/deals')
      .set('Authorization', `Bearer ${tokenA}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].stage).toBe('contacted');
  });

  it('POST /api/v1/deals/:id/activities > adds contact activity', async () => {
    const deal = await Deal.create({ userId: userA._id, investorId: investor1._id, stage: 'contacted' });

    const res = await request(app)
      .post(`/api/v1/deals/${deal._id}/activities`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        date: new Date().toISOString(),
        method: 'email',
        summary: 'Sent pitch deck',
      });
      
    expect(res.status).toBe(201);
    expect(res.body.data.contactHistory).toHaveLength(1);
    expect(res.body.data.contactHistory[0].method).toBe('email');
  });

  it('GET /api/v1/analytics/funnel > calculates funnel metrics correctly', async () => {
    await Deal.create({ userId: userA._id, investorId: investor1._id, stage: 'contacted' });
    await Deal.create({ userId: userA._id, investorId: investor2._id, stage: 'meeting-scheduled', committedAmount: 100000 });
    
    const res = await request(app)
      .get('/api/v1/analytics/funnel')
      .set('Authorization', `Bearer ${tokenA}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data.summary.totalDeals).toBe(2);
    expect(res.body.data.funnel['contacted'].count).toBe(1);
    expect(res.body.data.funnel['meeting-scheduled'].count).toBe(1);
    expect(res.body.data.funnel['meeting-scheduled'].value).toBe(100000);
    expect(res.body.data.stageCountRatios.contactedToMeetingRatio).toBe(100);
  });
  
  it('GET /api/v1/analytics/export > exports CSV', async () => {
    await Deal.create({ userId: userA._id, investorId: investor1._id, stage: 'contacted', committedAmount: 50000 });
    
    const res = await request(app)
      .get('/api/v1/analytics/export')
      .set('Authorization', `Bearer ${tokenA}`);
      
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Tech Ventures');
    expect(res.text).toContain('50000');
  });
});
