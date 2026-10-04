// WebSocket Service for PR-Alert Mobile App
// Handles real-time updates via Socket.io

import { io, Socket } from 'socket.io-client';

const WS_URL = __DEV__ 
  ? 'http://10.0.2.2:3001'  // Android emulator
  : 'https://api.pr-alert.org';

type EventCallback = (data: any) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token?: string) {
    if (this.socket?.connected) {
      return;
    }

    this.socket = io(WS_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 10000,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.emit('system:status', { connected: true });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.emit('system:status', { connected: false, reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.emit('system:status', { connected: false, error: 'Max reconnection attempts reached' });
      }
    });

    // Register handlers for all event types
    const eventTypes = [
      'event:new',
      'event:update',
      'alert:issued',
      'alert:cancelled',
      'alert:expired',
      'crowd_report:new',
      'crowd_report:verified',
      'user:location_update',
      'system:status',
    ];

    eventTypes.forEach(eventType => {
      this.socket?.on(eventType, (data) => {
        this.emit(eventType, data);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  subscribe(channels: string[]) {
    if (!this.socket?.connected) return;
    this.socket.emit('subscribe', { channels });
  }

  unsubscribe(channels: string[]) {
    if (!this.socket?.connected) return;
    this.socket.emit('unsubscribe', { channels });
  }

  updateLocation(userId: string, location: { lat: number; lon: number; accuracy: number }) {
    if (!this.socket?.connected) return;
    this.socket.emit('location:update', { userId, location });
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback) {
    this.listeners.get(event)?.delete(callback);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in WebSocket listener for ${event}:`, error);
      }
    });
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

export const wsService = new WebSocketService();

export default wsService;