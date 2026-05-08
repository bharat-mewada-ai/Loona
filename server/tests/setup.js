import { afterAll, afterEach, beforeAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import Redis from 'ioredis-mock';
import { vi } from 'vitest';

let mongod;

// Mock Bull globally
vi.mock('bull', () => ({
  default: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({}),
    process: vi.fn(),
    on: vi.fn(),
  })),
}));

// Mock Redis globally for all tests
vi.mock('ioredis', () => ({
  default: Redis,
}));

// Mock the internal redis utility
vi.mock('../src/utils/redis.js', () => ({
  default: new Redis(),
}));

beforeAll(async () => {
  // Start in-memory MongoDB
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany();
  }
});
