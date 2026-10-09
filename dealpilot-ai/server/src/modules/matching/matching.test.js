import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../tests/helpers/db.js';
import app from '../../app.js';
import User from '../users/user.model.js';
import Startup from '../startups/startup.model.js';
import Investor from '../investors/investor.model.js';
import Match from './match.model.js';
import { generateAccessToken } from '../../common/utils/token.js';
import config from '../../config/index.js';
import { computeMatchScore } from './matching.service.js';

beforeAll(async () => { await connectTestDb(); });

afterAll(async () => { await disconnectTestDb(); });

describe('Matching Service Unit Tests', () => {
  it('computes match correctly for perfect match', () => {
    const startup = {
      industry: 'saas',
      stage: 'seed',
      minTicketSize: 500000,
      maxTicketSize: 2000000,
      headquartersCountry: 'United States',
      businessModel: 'b2b',
    };
    
    const investor = {
      industries: ['saas', 'fintech'],
      stages: ['seed', 'series-a'],
      minTicketSize: 500000,
      maxTicketSize: 2000000,
      geographies: ['United States', 'Canada'],
      preferredBusinessModels: ['b2b', 'saas'],
    };
    
    const result = computeMatchScore(startup, investor);
    expect(result.totalScore).toBe(100);
    expect(result.breakdown.industryScore).toBe(100);
    expect(result.breakdown.stageScore).toBe(100);
    expect(result.breakdown.ticketScore).toBe(100);
    expect(result.breakdown.geoScore).toBe(100);
    expect(result.breakdown.businessModelScore).toBe(100);
  });
  
  it('computes match correctly for complete mismatch', () => {
    const startup = {
      industry: 'healthtech',
      stage: 'series-b',
      targetRaiseAmount: 20000000,
      headquartersCountry: 'Germany',
      businessModel: 'b2c',
    };
    
    const investor = {
      industries: ['saas'],
      stages: ['seed'],
      minTicketSize: 100000,
      maxTicketSize: 500000,
      geographies: ['United States'],
      preferredBusinessModels: ['b2b'],
    };
    
    const result = computeMatchScore(startup, investor);
    expect(result.hardExclusion).toBe(true);
  });
  
  it('handles unknown data without breaking', () => {
    const startup = { industry: 'saas' };
    const investor = { industries: ['saas'] };
    
    const result = computeMatchScore(startup, investor);
    // Industry 30% -> 30 score, everything else is unknown -> 0
    expect(result.totalScore).toBe(30);
    expect(result.missingInfo.length).toBeGreaterThan(0);
  });
});

describe('Matching Routes Integration', () => {
  let userA, tokenA;
  let investor1, startup;

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

    startup = await Startup.create({
      userId: userA._id,
      name: 'TechFlow',
      industry: 'saas',
      stage: 'seed',
      targetRaiseAmount: 1500000,
      headquartersCountry: 'United States',
      description: 'A great SaaS startup with enough characters',
    });

    investor1 = await Investor.create({
      name: 'Tech Ventures',
      organization: 'Tech VC',
      investorType: 'vc',
      industries: ['saas', 'fintech'],
      stages: ['seed', 'series-a'],
      isDemoData: true,
      isActive: true,
    });
  });

  it('POST /api/v1/matches/compute > computes matches and saves them', async () => {
    const res = await request(app)
      .post('/api/v1/matches/compute')
      .set('Authorization', `Bearer ${tokenA}`);
    
    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.count).toBe(1);
    
    const matches = await Match.find({ userId: userA._id });
    expect(matches).toHaveLength(1);
  });

  it('GET /api/v1/matches > returns paginated matches', async () => {
    await request(app)
      .post('/api/v1/matches/compute')
      .set('Authorization', `Bearer ${tokenA}`);
      
    const res = await request(app)
      .get('/api/v1/matches')
      .set('Authorization', `Bearer ${tokenA}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].totalScore).toBeGreaterThan(0);
  });
});
