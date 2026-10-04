import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { connectDB, disconnectDB } from './config/database.js';
import { setupSocketHandlers } from './socket/socketHandlers.js';
import { startPollingJobs } from './services/pollingService.js';
import { eventRoutes } from './routes/events.js';
import { alertRoutes } from './routes/alerts.js';
import { userRoutes } from './routes/users.js';
import { crowdReportRoutes } from './routes/crowdReports.js';
import { predictionRoutes } from './routes/predictions.js';
import { healthRoutes } from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { logger } from './utils/logger.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Make io accessible in routes
app.set('io', io);

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/crowd-reports', crowdReportRoutes);
app.use('/api/predictions', predictionRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    // Connect to database
    await connectDB();
    logger.info('Database connected');

    // Setup Socket.io handlers
    setupSocketHandlers(io);
    logger.info('Socket.io handlers configured');

    // Start polling jobs for live data
    startPollingJobs(io);
    logger.info('Polling jobs started');

    // Start server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📡 WebSocket server ready`);
      logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await disconnectDB();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await disconnectDB();
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

start();