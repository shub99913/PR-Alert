import { 
  Alert, 
  DispatchRecord, 
  Channel,
  DispatchRecordSchema 
} from '@pr-alert/schemas';
import { config, createEngineLogger } from '@pr-alert/core';
import { MessageGenerator } from '@pr-alert/messaging';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import twilio from 'twilio';
import sgMail from '@sendgrid/mail';
import admin from 'firebase-admin';
import axios from 'axios';

const logger = createEngineLogger('dispatch');

/**
 * Dispatch configuration
 */
export interface DispatchConfig {
  // Queue settings
  redisUrl: string;
  concurrency: number;
  maxRetries: number;
  retryDelayMs: number;
  
  // Provider settings
  twilio: {
    accountSid: string;
    authToken: string;
    fromNumber: string;
  };
  sendgrid: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };
  fcm: {
    projectId: string;
    serverKey: string;
  };
  whatsapp: {
    apiUrl: string;
    accessToken: string;
    phoneNumberId: string;
  };
  webhook: {
    defaultTimeoutMs: number;
    maxRetries: number;
  };
  
  // Rate limits per channel
  rateLimits: Record<string, { max: number; windowMs: number }>;
  
  // Simulation mode
  simulate: boolean;
}

/**
 * Dispatch job data
 */
export interface DispatchJobData {
  alertId: string;
  channel: string;
  recipient: string;
  content: string;
  subject?: string;
  language: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

/**
 * Dispatch result
 */
export interface DispatchResult {
  success: boolean;
  dispatchRecord: Partial<any>;
  providerResponse?: any;
  error?: string;
}

/**
 * Dispatch Engine - Standalone, no government dependencies
 */
export class DispatchEngine {
  private config: DispatchConfig;
  private logger = createEngineLogger('dispatch');
  private redis: Redis;
  private queue: Queue<DispatchJobData>;
  private workers: Map<string, Worker> = new Map();
  private providers: Map<string, ChannelProvider> = new Map();
  private rateLimiters: Map<string, RateLimiter> = new Map();
  private isRunning = false;

  constructor(config?: Partial<DispatchConfig>) {
    this.config = {
      redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
      concurrency: 10,
      maxRetries: 3,
      retryDelayMs: 5000,
      twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID || '',
        authToken: process.env.TWILIO_AUTH_TOKEN || '',
        fromNumber: process.env.TWILIO_PHONE_NUMBER || '',
      },
      sendgrid: {
        apiKey: process.env.SENDGRID_API_KEY || '',
        fromEmail: process.env.SENDGRID_FROM_EMAIL || 'alerts@pr-alert.org',
        fromName: process.env.SENDGRID_FROM_NAME || 'PR-Alert System',
      },
      fcm: {
        projectId: process.env.FCM_PROJECT_ID || '',
        serverKey: process.env.FCM_SERVER_KEY || '',
      },
      whatsapp: {
        apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      },
      webhook: {
        defaultTimeoutMs: 10000,
        maxRetries: 3,
      },
      rateLimits: {
        sms: { max: 100, windowMs: 60000 },
        email: { max: 500, windowMs: 60000 },
        push: { max: 1000, windowMs: 60000 },
        whatsapp: { max: 50, windowMs: 60000 },
        webhook: { max: 200, windowMs: 60000 },
      },
      simulate: process.env.ENABLE_REAL_DISPATCH !== 'true',
    };

    // Initialize Redis
    this.redis = new Redis(this.config.redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });

    // Initialize queue
    this.queue = new Queue('dispatch', {
      connection: this.redis,
      defaultJobOptions: {
        attempts: this.config.maxRetries,
        backoff: {
          type: 'exponential',
          delay: this.config.retryDelayMs,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    // Initialize providers
    this.initProviders();

    // Initialize rate limiters
    this.initRateLimiters();
  }

  /**
   * Initialize channel providers - STANDALONE (no SACHET/CAP)
   */
  private initProviders(): void {
    // Twilio SMS
    if (this.config.twilio.accountSid && this.config.twilio.authToken) {
      const twilioClient = twilio(this.config.twilio.accountSid, this.config.twilio.authToken);
      this.providers.set('sms', new TwilioProvider(twilioClient, this.config.twilio.fromNumber));
    }

    // SendGrid Email
    if (this.config.sendgrid.apiKey) {
      sgMail.setApiKey(this.config.sendgrid.apiKey);
      this.providers.set('email', new SendGridProvider(this.config.sendgrid));
    }

    // FCM Push
    if (this.config.fcm.projectId) {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: this.config.fcm.projectId,
        });
        this.providers.set('push', new FCMProvider());
      } catch (e) {
        // App might already be initialized
        this.providers.set('push', new FCMProvider());
      }
    }

    // WhatsApp
    if (this.config.whatsapp.accessToken) {
      this.providers.set('whatsapp', new WhatsAppProvider(this.config.whatsapp));
    }

    // Webhook
    this.providers.set('webhook', new WebhookProvider());

    // Siren (simulated)
    this.providers.set('siren', new SirenProvider());

    // Cell Broadcast - STANDALONE (no SACHET dependency)
    this.providers.set('cell_broadcast', new CellBroadcastProvider());

    // Operator Dashboard (WebSocket)
    this.providers.set('operator_dashboard', new OperatorDashboardProvider());
  }

  /**
   * Initialize rate limiters
   */
  private initRateLimiters(): void {
    for (const [channel, limits] of Object.entries(this.config.rateLimits)) {
      this.rateLimiters.set(channel, new RateLimiter(limits.max, limits.windowMs));
    }
  }

  /**
   * Start the dispatch engine
   */
  async start(): Promise<void> {
    if (this.isRunning) return;

    // Start queue workers for each channel
    const channels = ['sms', 'email', 'push', 'whatsapp', 'webhook', 'siren', 'cell_broadcast', 'operator_dashboard'];
    
    for (const channel of channels) {
      if (this.providers.has(channel)) {
        const worker = new Worker(channel, this.processJob.bind(this), {
          connection: this.redis,
          concurrency: this.config.concurrency,
        });

        worker.on('completed', (job) => {
          this.logger.debug({ jobId: job.id, channel }, 'Dispatch job completed');
        });

        worker.on('failed', (job, err) => {
          this.logger.error({ jobId: job?.id, channel, err }, 'Dispatch job failed');
        });

        this.workers.set(channel, worker);
      }
    }

    this.isRunning = true;
    this.logger.info('Dispatch engine started - STANDALONE MODE (no government dependencies)');
  }

  /**
   * Stop the dispatch engine
   */
  async stop(): Promise<void> {
    for (const [channel, worker] of this.workers) {
      await worker.close();
    }
    await this.queue.close();
    await this.redis.quit();
    this.isRunning = false;
    this.logger.info('Dispatch engine stopped');
  }

  /**
   * Process a dispatch job
   */
  async processJob(job: Job<DispatchJobData>): Promise<DispatchResult> {
    const { alertId, channel, recipient, content, subject, language, priority, metadata } = job.data;
    const provider = this.providers.get(channel);

    if (!provider) {
      return {
        success: false,
        dispatchRecord: { channel, recipient, status: 'failed' },
        error: `No provider for channel: ${channel}`,
      };
    }

    // Check rate limit
    const rateLimiter = this.rateLimiters.get(channel);
    if (rateLimiter && !rateLimiter.tryConsume(1)) {
      // Re-queue with delay
      throw new Error(`Rate limit exceeded for ${channel}`);
    }

    const startTime = Date.now();
    let result: DispatchResult;

    if (this.config.simulate) {
      result = await this.simulateDispatch(provider, {
        channel,
        recipient,
        content,
        subject,
        language: job.data.language,
      });
    } else {
      result = await provider.send({
        recipient: job.data.recipient,
        content: job.data.content,
        subject: job.data.subject,
        language: job.data.language,
      });
    }

    const duration = Date.now() - startTime;

    // Record metrics
    await this.recordMetrics(channel, result.success, duration);

    return result;
  }

  /**
   * Dispatch an alert to all channels
   */
  async dispatchAlert(alert: any, messages: any[]): Promise<DispatchRecord[]> {
    const dispatchRecords: any[] = [];

    for (const message of messages) {
      const channel = message.channel;
      const recipients = await this.getRecipients(alert, message.channel, message.lang);

      for (const recipient of recipients) {
        const jobData: DispatchJobData = {
          alertId: alert._id,
          channel,
          recipient,
          content: message.content,
          subject: message.subject,
          language: message.lang,
          priority: this.getPriority(alert.severity),
          metadata: {
            messageId: message.templateId,
            severity: alert.severity,
            disasterType: alert.disasterType,
          },
        };

        const job = await this.queue.add(channel, jobData, {
          priority: this.getPriorityValue(alert.severity),
        });

        dispatchRecords.push({
          channel,
          recipient,
          status: 'pending',
          jobId: job.id,
          sentAt: undefined,
          deliveredAt: undefined,
          error: undefined,
          providerResponse: undefined,
          retryCount: 0,
        });
      }
    }

    return dispatchRecords;
  }

  /**
   * Get recipients for a channel
   */
  private async getRecipients(alert: any, channel: string, lang: string): Promise<string[]> {
    // In production, this would query the user database
    // For now, return mock recipients based on channel
    switch (channel) {
      case 'sms':
        return ['+91XXXXXXXXXX']; // Mock phone numbers
      case 'email':
        return ['user@example.com'];
      case 'push':
        return ['fcm_token_1', 'fcm_token_2'];
      case 'whatsapp':
        return ['+91XXXXXXXXXX'];
      case 'operator_dashboard':
        return ['operator_1', 'operator_2'];
      default:
        return [];
    }
  }

  /**
   * Get job priority from severity
   */
  private getPriority(severity: string): 'low' | 'normal' | 'high' | 'critical' {
    switch (severity) {
      case 'emergency': return 'critical';
      case 'alert': return 'high';
      case 'warning': return 'normal';
      default: return 'low';
    }
  }

  private getPriorityValue(severity: string): number {
    switch (severity) {
      case 'emergency': return 100;
      case 'alert': return 50;
      case 'warning': return 10;
      default: return 1;
    }
  }

  /**
   * Simulate dispatch (for development)
   */
  private async simulateDispatch(provider: ChannelProvider, params: any): Promise<DispatchResult> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
    
    const success = Math.random() > 0.02; // 98% success rate in simulation
    
    return {
      success,
      dispatchRecord: {
        status: success ? 'sent' : 'failed',
        sentAt: new Date().toISOString(),
      },
      providerResponse: { simulated: true, messageId: `sim_${Date.now()}` },
      error: success ? undefined : 'Simulated failure',
    };
  }

  /**
   * Record metrics
   */
  private async recordMetrics(channel: string, success: boolean, durationMs: number): Promise<void> {
    const key = `metrics:dispatch:${channel}:${new Date().toISOString().split('T')[0]}`;
    await this.redis.hincrby(key, success ? 'success' : 'failed', 1);
    await this.redis.hincrbyfloat(key, 'totalDurationMs', duration);
    await this.redis.expire(key, 86400 * 7); // 7 days
  }

  /**
   * Get queue stats
   */
  async getQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};
    
    for (const [channel, worker] of this.workers) {
      const counts = await worker.getJobCounts();
      stats[channel] = counts;
    }
    
    return stats;
  }

  /**
   * Get dispatch history for alert
   */
  async getDispatchHistory(alertId: string): Promise<any[]> {
    // Would query database for dispatch records
    return [];
  }

  /**
   * Retry failed dispatches
   */
  async retryFailed(alertId: string): Promise<number> {
    // Implementation would query failed jobs and re-queue
    return 0;
  }

  /**
   * Pause/resume channel
   */
  async pauseChannel(channel: string): Promise<void> {
    const worker = this.workers.get(channel);
    if (worker) await worker.pause();
  }

  async resumeChannel(channel: string): Promise<void> {
    const worker = this.workers.get(channel);
    if (worker) await worker.resume();
  }
}

/**
 * Rate Limiter
 */
class RateLimiter {
  private max: number;
  private windowMs: number;
  private requests: number[] = [];

  constructor(max: number, windowMs: number) {
    this.max = max;
    this.windowMs = windowMs;
  }

  tryConsume(tokens: number = 1): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Remove old requests
    this.requests = this.requests.filter(t => t > windowStart);
    
    if (this.requests.length + tokens <= this.max) {
      for (let i = 0; i < tokens; i++) {
        this.requests.push(Date.now());
      }
      return true;
    }
    
    return false;
  }

  getRemaining(): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    this.requests = this.requests.filter(t => t > windowStart);
    return Math.max(0, this.max - this.requests.length);
  }
}

/**
 * Channel Provider Interface
 */
interface ChannelProvider {
  send(params: { recipient: string; content: string; subject?: string; language: string }): Promise<DispatchResult>;
}

/**
 * Twilio SMS Provider
 */
class TwilioProvider implements ChannelProvider {
  private client: any;
  private fromNumber: string;
  private logger = createEngineLogger('provider:twilio');

  constructor(client: any, fromNumber: string) {
    this.client = client;
    this.fromNumber = fromNumber;
  }

  async send(params: { recipient: string; content: string; language: string }): Promise<DispatchResult> {
    try {
      const message = await this.client.messages.create({
        body: params.content,
        from: this.fromNumber,
        to: params.recipient,
      });

      return {
        success: true,
        dispatchRecord: {
          status: 'sent',
          sentAt: new Date().toISOString(),
        },
        providerResponse: { messageId: message.sid, status: message.status },
      };
    } catch (error) {
      return {
        success: false,
        dispatchRecord: { status: 'failed' },
        error: error.message,
      };
    }
  }
}

/**
 * SendGrid Email Provider
 */
class SendGridProvider implements ChannelProvider {
  private config: any;
  private logger = createEngineLogger('provider:sendgrid');

  constructor(config: any) {
    this.config = config;
  }

  async send(params: { recipient: string; content: string; subject?: string; language: string }): Promise<DispatchResult> {
    try {
      const msg = {
        to: params.recipient,
        from: { email: this.config.fromEmail, name: this.config.fromName },
        subject: params.subject || 'PR-Alert Disaster Warning',
        text: params.content,
        html: params.content.replace(/\n/g, '<br>'),
      };

      await sgMail.send(msg);

      return {
        success: true,
        dispatchRecord: {
          status: 'sent',
          sentAt: new Date().toISOString(),
        },
        providerResponse: { messageId: 'sendgrid_sent' },
      };
    } catch (error) {
      return {
        success: false,
        dispatchRecord: { status: 'failed' },
        error: error.message,
      };
    }
  }
}

/**
 * FCM Push Provider
 */
class FCMProvider implements ChannelProvider {
  private logger = createEngineLogger('provider:fcm');

  async send(params: { recipient: string; content: string; subject?: string; language: string }): Promise<DispatchResult> {
    try {
      const message = {
        token: params.recipient,
        notification: {
          title: params.subject || 'PR-Alert',
          body: params.content,
        },
        data: {
          content: params.content,
          language: params.language,
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'disaster_alerts',
            priority: 'high',
            defaultSound: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: { title: params.subject, body: params.content },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().send(message);

      return {
        success: true,
        dispatchRecord: {
          status: 'sent',
          sentAt: new Date().toISOString(),
        },
        providerResponse: { messageId: response },
      };
    } catch (error) {
      return {
        success: false,
        dispatchRecord: { status: 'failed' },
        error: error.message,
      };
    }
  }
}

/**
 * WhatsApp Provider
 */
class WhatsAppProvider implements ChannelProvider {
  private config: any;
  private httpClient: any;
  private logger = createEngineLogger('provider:whatsapp');

  constructor(config: any) {
    this.config = config;
    this.httpClient = axios.create({
      baseURL: config.apiUrl,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async send(params: { recipient: string; content: string; language: string }): Promise<DispatchResult> {
    try {
      const response = await this.httpClient.post(`/${this.config.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        to: params.recipient,
        type: 'text',
        text: { body: params.content },
      });

      return {
        success: true,
        dispatchRecord: { status: 'sent', sentAt: new Date().toISOString() },
        providerResponse: response.data,
      };
    } catch (error) {
      return {
        success: false,
        dispatchRecord: { status: 'failed' },
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}

/**
 * Webhook Provider
 */
class WebhookProvider implements ChannelProvider {
  private logger = createEngineLogger('provider:webhook');

  async send(params: { recipient: string; content: string; subject?: string; language: string }): Promise<DispatchResult> {
    try {
      const response = await axios.post(params.recipient, {
        content: params.content,
        subject: params.subject,
        language: params.language,
        timestamp: new Date().toISOString(),
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      });

      return {
        success: true,
        dispatchRecord: { status: 'sent', sentAt: new Date().toISOString() },
        providerResponse: { status: response.status, statusText: response.statusText },
      };
    } catch (error) {
      return {
        success: false,
        dispatchRecord: { status: 'failed' },
        error: error.message,
      };
    }
  }
}

/**
 * Siren Provider (Simulated)
 */
class SirenProvider implements ChannelProvider {
  private logger = createEngineLogger('provider:siren');

  async send(params: { recipient: string; content: string; language: string }): Promise<DispatchResult> {
    this.logger.info({ recipient: params.recipient }, 'SIREN ACTIVATED (simulated)');
    
    return {
      success: true,
      dispatchRecord: { status: 'sent', sentAt: new Date().toISOString() },
      providerResponse: { simulated: true, sirenId: params.recipient, pattern: 'wail' },
    };
  }
}

/**
 * Cell Broadcast Provider - STANDALONE (no SACHET/C-DOT dependency)
 * Simulates cell broadcast for development. In production, this would integrate
 * with cellular carrier APIs or specialized broadcast infrastructure.
 */
class CellBroadcastProvider implements ChannelProvider {
  private logger = createEngineLogger('provider:cell_broadcast');

  async send(params: { recipient: string; content: string; language: string }): Promise<DispatchResult> {
    this.logger.info({ 
      recipient: params.recipient, 
      contentLength: params.content.length 
    }, 'CELL BROADCAST SENT (standalone mode - no government dependency)');
    
    return {
      success: true,
      dispatchRecord: { status: 'sent', sentAt: new Date().toISOString() },
      providerResponse: { 
        simulated: true, 
        broadcastId: `cb_${Date.now()}`,
        note: 'Standalone cell broadcast - integrate with carrier APIs for production'
      },
    };
  }
}

/**
 * Operator Dashboard Provider (WebSocket)
 */
class OperatorDashboardProvider implements ChannelProvider {
  private logger = createEngineLogger('provider:operator_dashboard');

  async send(params: { recipient: string; content: string; language: string }): Promise<DispatchResult> {
    // In production, this would emit via Socket.io to operator dashboards
    this.logger.debug({ operatorId: params.recipient }, 'Operator dashboard notification sent');
    
    return {
      success: true,
      dispatchRecord: { status: 'sent', sentAt: new Date().toISOString() },
      providerResponse: { delivered: true, operatorId: params.recipient },
    };
  }
}

export { 
  DispatchEngine, 
  DispatchConfig, 
  DispatchJobData, 
  DispatchResult,
  ChannelProvider 
};