import { describe, it, expect } from 'vitest';
import { DEMO_INVESTORS } from '../../src/database/seed.js';

describe('DEMO_INVESTORS seed data', () => {
  it('has exactly 30 records', () => {
    expect(DEMO_INVESTORS).toHaveLength(30);
  });

  it('every investor has required fields', () => {
    for (const investor of DEMO_INVESTORS) {
      expect(investor.name).toBeTruthy();
      expect(investor.organization).toBeTruthy();
      expect(investor.investorType).toBeTruthy();
      expect(investor.thesis).toBeTruthy();
      expect(Array.isArray(investor.industries)).toBe(true);
      expect(investor.industries.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(investor.stages)).toBe(true);
      expect(investor.stages.length).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(investor.geographies)).toBe(true);
      expect(investor.geographies.length).toBeGreaterThanOrEqual(1);
      expect(typeof investor.minTicketSize).toBe('number');
      expect(typeof investor.maxTicketSize).toBe('number');
      expect(investor.isDemoData).toBe(true);
      expect(investor.isActive).toBe(true);
      expect(investor.sourceType).toBe('demo');
    }
  });

  it('has varied investor types', () => {
    const types = new Set(DEMO_INVESTORS.map((i) => i.investorType));
    expect(types.size).toBeGreaterThan(2);
  });

  it('has varied industries', () => {
    const allIndustries = DEMO_INVESTORS.flatMap((i) => i.industries);
    const unique = new Set(allIndustries);
    expect(unique.size).toBeGreaterThan(5);
  });

  it('max ticket >= min ticket for all investors', () => {
    for (const investor of DEMO_INVESTORS) {
      expect(investor.maxTicketSize).toBeGreaterThanOrEqual(investor.minTicketSize);
    }
  });
});
