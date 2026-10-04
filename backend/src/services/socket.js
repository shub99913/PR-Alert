// Socket.io Service for Real-time Updates
import { Server } from 'socket.io';

let io = null;

export function initializeSocket(socketServer) {
  io = new Server(socketServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`📡 Client connected: ${socket.id}`);
    
    socket.on('subscribe', (data) => {
      const { channels } = data;
      if (channels && Array.isArray(channels)) {
        channels.forEach(channel => socket.join(channel));
        console.log(`📥 ${socket.id} subscribed to: ${channels.join(', ')}`);
      }
    });
    
    socket.on('unsubscribe', (data) => {
      const { channels } = data;
      if (channels && Array.isArray(channels)) {
        channels.forEach(channel => socket.leave(channel));
        console.log(`📤 ${socket.id} unsubscribed from: ${channels.join(', ')}`);
      }
    });
    
    socket.on('location:update', (data) => {
      const { userId, location } = data;
      if (userId && location) {
        // In production, update user location in database
        console.log(`📍 Location update for ${userId}:`, location);
        // Broadcast to relevant channels
        socket.broadcast.emit('user:location_update', { userId, location });
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`📴 Client disconnected: ${socket.id} (${reason})`);
    });
    
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Set up heartbeat
  setInterval(() => {
    if (io) {
      io.emit('system:heartbeat', { timestamp: new Date().toISOString() });
    }
  }, 30000);

  console.log('📡 Socket.io server initialized');
}

export function getIO() {
  return io;
}

// Broadcast functions
export function broadcastEvent(event) {
  if (io) io.emit('event:new', event);
}

export function broadcastEventUpdate(event) {
  if (io) io.emit('event:update', event);
}

export function broadcastAlert(alert) {
  if (io) io.emit('alert:issued', alert);
}

export function broadcastAlertCancelled(alertId) {
  if (io) io.emit('alert:cancelled', { alertId });
}

export function broadcastAlertExpired(alertId) {
  if (io) io.emit('alert:expired', { alertId });
}

export function broadcastCrowdReport(report) {
  if (io) io.emit('crowd_report:new', report);
}

export function broadcastCrowdReportVerified(report) {
  if (io) io.emit('crowd_report:verified', report);
}

export function broadcastSystemStatus(status) {
  if (io) io.emit('system:status', status);
}

export function broadcastToChannel(channel, event, data) {
  if (io) io.to(channel).emit(event, data);
}

export default { initializeSocket, getIO, broadcastEvent, broadcastAlert, broadcastCrowdReport };