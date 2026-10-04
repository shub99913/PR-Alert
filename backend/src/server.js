import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { eventsRouter } from './routes/events.js';
import { alertsRouter } from './routes/alerts.js';
import { usersRouter } from './routes/users.js';
import { reportsRouter } from './routes/reports.js';
import { predictionsRouter } from './routes/predictions.js';
import { startPollingJobs } from './jobs/polling.js';
import { initializeSocket } from './services/socket.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Connect to MongoDB using Mongoose
async function connectDB() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/disaster-dashboard';
    await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB connected successfully');
    
    // Create indexes for all models
    await Promise.all([
      mongoose.model('Event').createIndexes(),
      mongoose.model('Alert').createIndexes(),
      mongoose.model('User').createIndexes(),
      mongoose.model('CrowdReport').createIndexes(),
    ]);
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/events', eventsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/users', usersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/predictions', predictionsRouter);

app.use(errorHandler);

initializeSocket(io);

const PORT = process.env.PORT || 3001;

async function startServer() {
  await connectDB();
  
  startPollingJobs(io);
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Disaster Dashboard Backend running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🔄 Polling jobs started`);
  });
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

startServer().catch(console.error);

export { app, httpServer, io };