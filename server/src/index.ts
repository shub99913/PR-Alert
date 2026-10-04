import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './config.js';
import { startCronJobs } from './cron.js';
import { connectDB } from './config/db.js';

// Routes
import eventsRouter from './routes/events.js';
import alertsRouter from './routes/alerts.js';
import usersRouter from './routes/users.js';
import weatherRouter from './routes/weather.js';
import camerasRouter from './routes/cameras.js';
import crowdReportsRouter from './routes/crowdReports.js';
import predictionsRouter from './routes/predictions.js';

const app = express();
const server = http.createServer(app);

const io = new SocketServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(cors({ origin: ['https://yourdomain.com', 'https://app.yourdomain.com', 'http://localhost:3000', 'http://localhost:5173'] }));
app.use(express.json());

// Routes
app.use('/api/events', eventsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/users', usersRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/cameras', camerasRouter);
app.use('/api/crowd-report', crowdReportsRouter);
app.use('/api/predictions', predictionsRouter);

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
});

// Start server
const START_SERVER = async () => {
    // 1. Connect MongoDB
    await connectDB();

    server.listen(config.port, () => {
        console.log(`\n🚀 Disaster Dashboard Server running on port ${config.port}`);
        console.log(`   REST API: http://localhost:${config.port}/api`);
        console.log(`   WebSocket: ws://localhost:${config.port}`);
        console.log(`   Client URL: ${config.clientUrl}\n`);

        // Start data polling
        startCronJobs(io);
    });
};

START_SERVER();
