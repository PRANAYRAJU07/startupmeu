import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDb, disconnectTestDb, clearCollections } from '../../../tests/helpers/db.js';
import app from '../../app.js';
import User from '../users/user.model.js';
import Startup from '../startups/startup.model.js';
import Investor from '../investors/investor.model.js';
import CopilotAnalysis from './copilotAnalysis.model.js';
import { generateAccessToken } from '../../common/utils/token.js';
import config from '../../config/index.js';

let mongoServer;

beforeAll(async () => {
  await connectTestDb();
});

afterAll(async () => {
  await disconnectTestDb();
});

describe('Copilot Routes', () => {
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
    });

    investor1 = await Investor.create({
      name: 'Tech Ventures',
      organization: 'Tech VC',
      investorType: 'vc',
      industries: ['saas', 'fintech'],
      stages: ['seed', 'series-a'],
      isDemoData: true,
      isActive: true,
      thesis: 'We invest in seed stage B2B SaaS.',
    });
  });

  it('POST /api/v1/copilot/analyze > creates a new mock analysis', async () => {
    const res = await request(app)
      .post('/api/v1/copilot/analyze')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        startupId: startup._id.toString(),
        pitchText: 'We are building the future of B2B SaaS metrics.',
        goals: 'Raise 1.5M to scale team.',
      });
    
    expect(res.status).toBe(201);
    expect(res.body.data.output).toBeDefined();
    expect(res.body.data.output.executiveSummary).toContain('mock analysis');
    expect(res.body.data.isMock).toBe(true);
    expect(res.body.data.status).toBe('draft');
  });

  it('GET /api/v1/copilot/analyses > returns analyses', async () => {
    await CopilotAnalysis.create({
      userId: userA._id,
      startupId: startup._id,
      output: { executiveSummary: 'Test', strengths: [], weaknesses: [], missingInformation: [], marketPositioning: {}, businessModelFeedback: {}, tractionAssessment: '', readinessChecklist: [], prioritizedRecommendations: [], followUpQuestions: [], caveats: '' },
    });

    const res = await request(app)
      .get('/api/v1/copilot/analyses')
      .set('Authorization', `Bearer ${tokenA}`);
      
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].output.executiveSummary).toBe('Test');
  });

  it('PATCH /api/v1/copilot/analyses/:id > updates status to saved', async () => {
    const analysis = await CopilotAnalysis.create({
      userId: userA._id,
      startupId: startup._id,
      output: { executiveSummary: 'Test', strengths: [], weaknesses: [], missingInformation: [], marketPositioning: {}, businessModelFeedback: {}, tractionAssessment: '', readinessChecklist: [], prioritizedRecommendations: [], followUpQuestions: [], caveats: '' },
    });

    const res = await request(app)
      .patch(`/api/v1/copilot/analyses/${analysis._id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ status: 'saved' });
      
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('saved');
  });

  it('POST /api/v1/copilot/outreach-draft > creates an outreach draft', async () => {
    const res = await request(app)
      .post('/api/v1/copilot/outreach-draft')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        startupId: startup._id.toString(),
        investorId: investor1._id.toString(),
      });
      
    expect(res.status).toBe(201);
    expect(res.body.data.subject).toBeDefined();
    expect(res.body.data.body).toBeDefined();
  });
});
