/**
 * seed.js
 * Populates the database with demo data for local development.
 * Usage: node src/database/seed.js
 */

import { connectDatabase } from './connection.js';

async function seed() {
  await connectDatabase();
  console.log('Seeding database with demo data...');
  // TODO: insert demo users, startups, investors, etc.
  console.log('Seed complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
