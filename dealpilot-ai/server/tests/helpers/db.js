import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer = null;

/**
 * Start an in-memory MongoDB instance and connect Mongoose to it,
 * or connect to a dedicated TEST_MONGODB_URI.
 */
export async function connectTestDb() {
  const customUri = process.env.TEST_MONGODB_URI;
  if (customUri) {
    // Basic protection against using dev or prod DBs
    if (customUri.includes('prod') || customUri.includes('production') || customUri === process.env.MONGODB_URI) {
      throw new Error('TEST_MONGODB_URI appears to point to a production/dev database. Aborting tests for safety.');
    }
    await mongoose.connect(customUri);
    return;
  }

  // Fall back to MongoMemoryServer with a stable explicit version
  mongoServer = await MongoMemoryServer.create({
    binary: {
      version: '7.0.14', // Explicit stable version to avoid 8.x download issues
    }
  });
  
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}

/**
 * Disconnect Mongoose and stop the in-memory MongoDB instance.
 */
export async function disconnectTestDb() {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

/**
 * Delete all documents from every collection in the current connection.
 * Useful in beforeEach to isolate tests.
 */
export async function clearCollections() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
