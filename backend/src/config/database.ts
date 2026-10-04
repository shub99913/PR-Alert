import { MongoClient, Db, Collection } from 'mongodb';
import { logger } from '../utils/logger.js';

let db: Db | null = null;
let client: MongoClient | null = null;

export async function connectDB(): Promise<Db> {
  if (db) return db;

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/disaster-dashboard';
  
  client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  await client.connect();
  db = client.db('disaster-dashboard');
  
  // Create indexes
  await createIndexes(db);
  
  logger.info('MongoDB connected successfully');
  return db;
}

export async function disconnectDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info('MongoDB disconnected');
  }
}

export function getDB(): Db {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() first.');
  }
  return db;
}

async function createIndexes(db: Db): Promise<void> {
  // Events collection indexes
  const events = db.collection('events');
  await events.createIndex({ 'properties.time': -1 });
  await events.createIndex({ 'geometry.coordinates': '2dsphere' });
  await events.createIndex({ 'properties.type': 1 });
  await events.createIndex({ 'properties.mag': -1 });
  await events.createIndex({ source: 1, 'properties.id': 1 }, { unique: true });

  // Alerts collection indexes
  const alerts = db.collection('alerts');
  await alerts.createIndex({ createdAt: -1 });
  await alerts.createIndex({ 'location.coordinates': '2dsphere' });
  await alerts.createIndex({ status: 1 });
  await alerts.createIndex({ disasterType: 1 });

  // Users collection indexes
  const users = db.collection('users');
  await users.createIndex({ phone: 1 }, { unique: true, sparse: true });
  await users.createIndex({ email: 1 }, { unique: true, sparse: true });
  await users.createIndex({ 'location.coordinates': '2dsphere' });
  await users.createIndex({ active: 1 });

  // Crowd reports collection indexes
  const crowdReports = db.collection('crowdReports');
  await crowdReports.createIndex({ createdAt: -1 });
  await crowdReports.createIndex({ 'location.coordinates': '2dsphere' });
  await crowdReports.createIndex({ status: 1 });
  await crowdReports.createIndex({ disasterType: 1 });

  logger.info('Database indexes created');
}

// Collection getters
export function getEventsCollection(): Collection {
  return getDB().collection('events');
}

export function getAlertsCollection(): Collection {
  return getDB().collection('alerts');
}

export function getUsersCollection(): Collection {
  return getDB().collection('users');
}

export function getCrowdReportsCollection(): Collection {
  return getDB().collection('crowdReports');
}

export function getSettingsCollection(): Collection {
  return getDB().collection('settings');
}