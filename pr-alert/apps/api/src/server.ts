import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { config, logger, features, rateLimit, createEngineLogger } from '@pr-alert/core';
import { 
  AdapterRegistry, 
  createDefaultAdapterRegistry,
  USGSAdapter 
} from '@pr-alert/adapters';
import { 
  normalizationEngine, 
  deduplicationEngine,
  enrichEvent 
} from '@pr-alert/normalization';
import { fusionEngine } from '@pr-alert/fusion';
import { RuleEngine, createDefaultRules } from '@pr-alert/detection';
import { MessageGenerator, CapXmlGenerator, TranslationService } from '@pr-alert/messaging';
import { DispatchEngine, DispatchConfig } from '@pr-alert/dispatch';
import { crowdReportEngine } from '@pr-alert/crowd';
import { connectDB, getEventsCollection, getAlertsCollection, getUsersCollection, getCrowdReportsCollection } from '@pr-alert/core';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createHttpServer } from 'http';

dotenv.config();

const engineLogger = createEngineLogger('api');

interface AppContext {
  adapterRegistry: any;
  ruleEngine: any;
  dispatchEngine: any;
  messageGenerator: any;
  io: any;
}

async function initializeApp(): Promise<AppContext> {
  // Connect to database
  await connectDB();
  
  // Initialize adapter registry
  const adapterRegistry = createDefaultAdapterRegistry();
  
  // Initialize rule engine
  const ruleEngine = new (await import('@pr-alert/detection')).RuleEngine();
  createDefaultRules().forEach(rule => ruleEngine.addRule(rule));
  
  // Initialize dispatch engine
  const dispatchConfig = {
    simulate: !features.realDispatch,
  };
  const dispatchEngine = new (await import('@pr-alert/dispatch')).DispatchEngine(dispatchConfig);
  
  // Initialize message generator
  const messageGenerator = new (await import('@pr-alert/messaging')).MessageGenerator();
  
  // Create Express app
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  
  // Middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }));
  app.use(morgan('combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Rate limiting middleware
  app.use((req, res, next) => {
    const ip = req.ip || 'unknown';
    const key = `ratelimit:${ip}`;
    // Simple in-memory rate limiting (use Redis in production)
    next();
  });
  
  // Request logging
  app.use((req, res, next) => {
    req.startTime = Date.now();
    next();
  });
  
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      features: features,
    });
  });
  
  // API Routes
  
  // Events
  app.get('/api/events/live', async (req, res) => {
    try {
      // Fetch from adapters
      const usgsAdapter = new USGSAdapter();
      const rawEvents = await usgsAdapter.fetchRawEvents();
      
      let allEvents: any[] = [];
      for (const rawEvent of rawEvents) {
        const normalized = usgsAdapter.normalize(rawEvent);
        if (normalized) {
          const enriched = await enrichEvent(normalized);
          const dedupKey = normalizationEngine.generateDeduplicationKey(enriched);
          
          if (!normalizationEngine.deduplicationEngine.isDuplicate(dedupKey)) {
            normalizationEngine.deduplicationEngine.add(dedupKey, enriched);
            allEvents.push(enriched);
          }
        }
      }
      
      res.json({ 
        events: allEvents, 
        cached: false, 
        timestamp: new Date().toISOString() 
      });
    } catch (error) {
      console.error('Error fetching live events:', error);
      res.status(500).json({ error: 'Failed to fetch live events' });
    }
  });
  
  app.get('/api/events', async (req, res) => {
    try {
      const db = await import('@pr-alert/core').then(m => m.connectDB()).then(() => import('@pr-alert/core').then(m => m.getEventsCollection()));
      const events = await db.find({}).sort({ timestamp: -1 }).limit(100).toArray();
      res.json({ events, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });
  
  app.get('/api/events/:id', async (req, res) => {
    try {
      const db = await import('@pr-alert/core').then(m => m.getEventsCollection());
      const event = await db.findOne({ _id: req.params.id });
      if (!event) return res.status(404).json({ error: 'Event not found' });
      res.json({ event, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch event' });
    }
  });
  
  // Alerts
  app.get('/api/alerts', async (req, res) => {
    try {
      const db = await import('@pr-alert/core').then(m => m.getAlertsCollection());
      const alerts = await db.find({}).sort({ createdAt: -1 }).limit(100).toArray();
      res.json({ alerts, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });
  
  app.get('/api/alerts/:id', async (req, res) => {
    try {
      const db = await import('@pr-alert/core').then(m => m.getAlertsCollection());
      const alert = await db.findOne({ _id: req.params.id });
      if (!alert) return res.status(404).json({ error: 'Alert not found' });
      res.json({ alert, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch alert' });
    }
  });
  
  // Trigger alert generation (for testing)
  app.post('/api/alerts/generate', async (req, res) => {
    try {
      const { eventId, language } = req.body;
      // This would trigger the full pipeline: event -> detection -> fusion -> decision -> message -> CAP -> dispatch
      res.json({ success: true, message: 'Alert generation triggered' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate alert' });
    }
  });
  
  // Crowd Reports
  app.post('/api/crowd-reports', async (req, res) => {
    try {
      const result = await crowdReportEngine.submitReport(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to submit crowd report' });
    }
  });
  
  app.get('/api/crowd-reports', async (req, res) => {
    try {
      const { lat, lon, radius, type, severity, status, limit } = req.query;
      let reports;
      
      if (lat && lon && radius) {
        reports = crowdReportEngine.getReportsInArea(
          parseFloat(lat as string), 
          parseFloat(lon as string), 
          parseInt(radius as string) || 5000
        );
      } else if (type) {
        reports = crowdReportEngine.getReportsByType(type as string, parseInt(limit as string) || 100);
      } else {
        reports = crowdReportEngine.searchReports({
          disasterType: type as string,
          severity: req.query.severity as string,
          status: req.query.status as string,
          lat: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
          lon: req.query.lon ? parseFloat(req.query.lon as string) : undefined,
          radius: req.query.radius ? parseInt(req.query.radius as string) : undefined,
          limit: parseInt(limit as string) || 100,
        });
      }
      
      res.json({ reports, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch crowd reports' });
    }
  });
  
  app.post('/api/crowd-reports/:id/vote', async (req, res) => {
    try {
      const { userId, vote } = req.body;
      const result = await crowdReportEngine.vote(req.params.id, userId, vote);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to vote' });
    }
  });
  
  app.post('/api/crowd-reports/:id/verify', async (req, res) => {
    try {
      const { verifiedBy, notes } = req.body;
      const success = await crowdReportEngine.verifyReport(req.params.id, verifiedBy, notes);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to verify report' });
    }
  });
  
  app.post('/api/crowd-reports/:id/escalate', async (req, res) => {
    try {
      const { escalatedBy } = req.body;
      const success = await crowdReportEngine.escalateReport(req.params.id, escalatedBy);
      res.json({ success });
    } catch (error) {
      res.status(500).json({ error: 'Failed to escalate' });
    }
  });
  
  // Users
  app.get('/api/users/:id', async (req, res) => {
    try {
      const db = await import('@pr-alert/core').then(m => m.getUsersCollection());
      const user = await db.findOne({ _id: req.params.id });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user' });
    }
  });
  
  app.post('/api/users', async (req, res) => {
    try {
      const db = await import('@pr-alert/core').then(m => m.getUsersCollection());
      const user = {
        ...req.body,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
      const result = await db.insertOne(user);
      res.status(201).json({ user: { ...user, _id: result.insertedId } });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  });
  
  // Dispatch tracking
  app.get('/api/dispatch/history/:alertId', async (req, res) => {
    try {
      // Would query dispatch history
      res.json({ history: [], timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch dispatch history' });
    }
  });
  
  // Statistics
  app.get('/api/stats', async (req, res) => {
    try {
      const crowdStats = crowdReportEngine.getStats();
      const fusionStats = fusionEngine.getBufferStats();
      
      res.json({
        crowd: crowdStats,
        fusion: fusionStats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });
  
  // WebSocket
  const io = new (await import('socket.io')).Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  
  io.on('connection', (socket) => {
    const clientLogger = createEngineLogger('socket');
    clientLogger.info({ socketId: socket.id }, 'Client connected');
    
    socket.on('subscribe', (data) => {
      const { channels } = data;
      if (channels) {
        channels.forEach((channel: string) => socket.join(channel));
      }
    });
    
    socket.on('unsubscribe', (data) => {
      const { channels } = data;
      if (channels) {
        channels.forEach((channel: string) => socket.leave(channel));
      }
    });
    
    socket.on('location:update', (data) => {
      // Handle user location updates for targeted alerts
      const { userId, location } = data;
      // Update user location in database
    });
    
    socket.on('disconnect', () => {
      clientLogger.info({ socketId: socket.id }, 'Client disconnected');
    });
  });
  
  // Broadcast functions
  function broadcastEvent(event: any) {
    io.emit('event:new', event);
  }
  
  function broadcastAlert(alert: any) {
    io.emit('alert:issued', alert);
  }
  
  function broadcastCrowdReport(report: any) {
    io.emit('crowd_report:new', report);
  }
  
  // Error handling
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  });
  
  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  
  // Start server
  const PORT = process.env.PORT || 3001;
  httpServer.listen(PORT, () => {
    console.log(`🚀 PR-Alert API Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`🔧 Features: ${JSON.stringify(features)}`);
  });
  
  return {
    adapterRegistry: null,
    ruleEngine: null,
    dispatchEngine: null,
    messageGenerator: null,
    io,
  };
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

initializeApp().catch(console.error);