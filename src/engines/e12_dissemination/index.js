// E12 Dissemination Engine
// Multi-channel alert dissemination: SMS, Email, Push, Siren/TV/Radio
// Uses placeholder credentials - replace with real API keys in production

/**
 * E12 Dissemination Engine
 * Handles alert delivery across multiple channels with retry logic,
 * rate limiting, delivery tracking, and channel-specific formatting.
 */

// Mock implementations for external services (replace with real SDKs in production)
const mockTwilio = {
  messages: {
    create: async ({ to, from, body }) => {
      console.log(`[TWILIO SMS] To: ${to}, From: ${from}, Body: ${body.substring(0, 50)}...`);
      return { sid: 'SM' + Date.now(), status: 'queued' };
    }
  }
};

const mockSendGrid = {
  send: async ({ to, from, subject, text, html }) => {
    console.log(`[SENDGRID EMAIL] To: ${to}, From: ${from}, Subject: ${subject}`);
    console.log(`  Text: ${text.substring(0, 100)}...`);
    return [{ statusCode: 202, headers: { 'x-message-id': 'msg-' + Date.now() } }];
  }
};

const mockFCM = {
  send: async ({ token, notification, data }) => {
    console.log(`[FCM PUSH] Token: ${token.substring(0, 20)}...`);
    console.log(`  Title: ${notification.title}, Body: ${notification.body}`);
    return { successCount: 1, failureCount: 0, responses: [{ messageId: 'fcm-' + Date.now() }] };
  },
  sendMulticast: async ({ tokens, notification, data }) => {
    console.log(`[FCM MULTICAST] ${tokens.length} tokens`);
    return { successCount: tokens.length, failureCount: 0, responses: tokens.map((_, i) => ({ messageId: `fcm-${Date.now()}-${i}` })) };
  }
};

const mockSiren = {
  activate: async ({ location, alertType, severity, duration }) => {
    console.log(`[SIREN] Activating at ${location.lat}, ${location.lon} for ${alertType} (${severity})`);
    console.log(`  Duration: ${duration}s, Pattern: ${severity === 'EMERGENCY' ? 'wail' : 'alert'}`);
    return { activated: true, sirenId: 'siren-' + Date.now(), estimatedReach: '5km' };
  }
};

const mockTVRadio = {
  broadcast: async ({ alert, channels, language }) => {
    console.log(`[TV/RADIO] Broadcasting ${alert.type} alert on ${channels.join(', ')} in ${language}`);
    return { broadcastId: 'bcast-' + Date.now(), channels, estimatedReach: 'city-wide' };
  }
};

class DisseminationEngine {
  constructor(config = {}) {
    this.config = {
      twilio: {
        accountSid: config.twilio?.accountSid || '[REDACTED_TWILIO_SID]',
        authToken: config.twilio?.authToken || '[REDACTED_TWILIO_TOKEN]',
        fromNumber: config.twilio?.fromNumber || '[REDACTED_FROM_NUMBER]'
      },
      sendgrid: {
        apiKey: config.sendgrid?.apiKey || '[REDACTED_SENDGRID_KEY]',
        fromEmail: config.sendgrid?.fromEmail || 'alerts@disaster-system.example.com',
        fromName: config.sendgrid?.fromName || 'Disaster Alert System'
      },
      fcm: {
        serverKey: config.fcm?.serverKey || '[REDACTED_FCM_KEY]',
        projectId: config.fcm?.projectId || '[REDACTED_PROJECT_ID]'
      },
      siren: {
        apiEndpoint: config.siren?.apiEndpoint || '[REDACTED_SIREN_ENDPOINT]',
        apiKey: config.siren?.apiKey || '[REDACTED_SIREN_KEY]'
      },
      tvRadio: {
        apiEndpoint: config.tvRadio?.apiEndpoint || '[REDACTED_TVRADIO_ENDPOINT]',
        apiKey: config.tvRadio?.apiKey || '[REDACTED_TVRADIO_KEY]'
      },
      // Rate limiting
      rateLimits: {
        sms: config.rateLimits?.sms || 100, // per minute
        email: config.rateLimits?.email || 50,
        push: config.rateLimits?.push || 1000,
        siren: config.rateLimits?.siren || 10,
        tvRadio: config.rateLimits?.tvRadio || 5
      },
      // Retry configuration
      retry: {
        maxAttempts: config.retry?.maxAttempts || 3,
        baseDelayMs: config.retry?.baseDelayMs || 1000,
        maxDelayMs: config.retry?.maxDelayMs || 30000
      },
      // Use mocks for development
      useMocks: config.useMocks !== false
    };

    // Delivery tracking
    this.deliveryLog = [];
    this.rateLimitCounters = {
      sms: { count: 0, windowStart: Date.now() },
      email: { count: 0, windowStart: Date.now() },
      push: { count: 0, windowStart: Date.now() },
      siren: { count: 0, windowStart: Date.now() },
      tvRadio: { count: 0, windowStart: Date.now() }
    };

    // Initialize clients (use mocks in development)
    if (this.config.useMocks) {
      this.twilio = mockTwilio;
      this.sendgrid = mockSendGrid;
      this.fcm = mockFCM;
      this.siren = mockSiren;
      this.tvRadio = mockTVRadio;
    } else {
      // In production, initialize real clients:
      // this.twilio = require('twilio')(this.config.twilio.accountSid, this.config.twilio.authToken);
      // this.sendgrid = require('@sendgrid/mail');
      // this.sendgrid.setApiKey(this.config.sendgrid.apiKey);
      // this.fcm = require('firebase-admin').messaging();
      throw new Error('Production clients not initialized - set useMocks: true for development');
    }

    console.log('[E12] Dissemination Engine initialized');
    console.log(`  Channels: SMS, Email, Push, Siren, TV/Radio`);
    console.log(`  Mode: ${this.config.useMocks ? 'MOCK (development)' : 'PRODUCTION'}`);
  }

  /**
   * Check rate limit for a channel
   */
  _checkRateLimit(channel) {
    const counter = this.rateLimitCounters[channel];
    const limit = this.config.rateLimits[channel];
    const now = Date.now();
    
    // Reset window if minute has passed
    if (now - counter.windowStart > 60000) {
      counter.count = 0;
      counter.windowStart = now;
    }
    
    if (counter.count >= limit) {
      return { allowed: false, retryAfter: 60000 - (now - counter.windowStart) };
    }
    
    counter.count++;
    return { allowed: true };
  }

  /**
   * Sleep utility for retry delays
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Exponential backoff retry
   */
  async _retry(fn, channel, attempt = 1) {
    try {
      return await fn();
    } catch (error) {
      const maxAttempts = this.config.retry.maxAttempts;
      if (attempt >= maxAttempts) {
        throw error;
      }
      
      const delay = Math.min(
        this.config.retry.baseDelayMs * Math.pow(2, attempt - 1),
        this.config.retry.maxDelayMs
      );
      
      console.log(`[E12] ${channel} attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      await this._sleep(delay);
      return this._retry(fn, channel, attempt + 1);
    }
  }

  /**
   * Log delivery attempt
   */
  _logDelivery(channel, recipient, status, details = {}) {
    const entry = {
      id: 'dlv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      channel,
      recipient: typeof recipient === 'object' ? JSON.stringify(recipient) : recipient,
      status, // 'sent', 'failed', 'pending'
      details
    };
    this.deliveryLog.push(entry);
    
    // Keep only last 10000 entries
    if (this.deliveryLog.length > 10000) {
      this.deliveryLog = this.deliveryLog.slice(-10000);
    }
    
    return entry;
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMS(to, message, options = {}) {
    const rateCheck = this._checkRateLimit('sms');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    const from = options.from || this.config.twilio.fromNumber;
    const fullMessage = options.prefix ? `${options.prefix} ${message}` : message;

    return this._retry(async () => {
      const result = await this.twilio.messages.create({
        to,
        from,
        body: fullMessage
      });
      
      this._logDelivery('sms', to, 'sent', { sid: result.sid, status: result.status });
      return { success: true, messageId: result.sid, status: result.status };
    }, 'sms');
  }

  /**
   * Send Email via SendGrid
   */
  async sendEmail(to, subject, text, html, options = {}) {
    const rateCheck = this._checkRateLimit('email');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    const from = options.from || this.config.sendgrid.fromEmail;
    const fromName = options.fromName || this.config.sendgrid.fromName;

    return this._retry(async () => {
      const result = await this.sendgrid.send({
        to,
        from: { email: from, name: fromName },
        subject,
        text,
        html: html || text
      });
      
      this._logDelivery('email', to, 'sent', { messageId: result[0].headers['x-message-id'] });
      return { success: true, messageId: result[0].headers['x-message-id'] };
    }, 'email');
  }

  /**
   * Send Push notification via FCM
   */
  async sendPush(token, title, body, data = {}, options = {}) {
    const rateCheck = this._checkRateLimit('push');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    return this._retry(async () => {
      const result = await this.fcm.send({
        token,
        notification: { title, body },
        data: { ...data, timestamp: Date.now().toString() }
      });
      
      this._logDelivery('push', token, 'sent', { messageId: result.responses[0].messageId });
      return { success: true, messageId: result.responses[0].messageId };
    }, 'push');
  }

  /**
   * Send multicast Push notification via FCM
   */
  async sendPushMulticast(tokens, title, body, data = {}, options = {}) {
    const rateCheck = this._checkRateLimit('push');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    if (!tokens || tokens.length === 0) {
      return { success: false, error: 'No tokens provided' };
    }

    // Process in batches of 500 (FCM limit)
    const batchSize = 500;
    const results = [];
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const result = await this._retry(async () => {
        return await this.fcm.sendMulticast({
          tokens: batch,
          notification: { title, body },
          data: { ...data, timestamp: Date.now().toString() }
        });
      }, 'push');
      
      results.push(result);
      batch.forEach((token, idx) => {
        this._logDelivery('push', token, result.responses[idx]?.error ? 'failed' : 'sent', {
          messageId: result.responses[idx]?.messageId,
          error: result.responses[idx]?.error
        });
      });
    }
    
    const totalSuccess = results.reduce((sum, r) => sum + r.successCount, 0);
    const totalFailure = results.reduce((sum, r) => sum + r.failureCount, 0);
    
    return { success: totalFailure === 0, successCount: totalSuccess, failureCount: totalFailure };
  }

  /**
   * Activate Siren
   */
  async activateSiren(location, alertType, severity, options = {}) {
    const rateCheck = this._checkRateLimit('siren');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    const duration = options.duration || (severity === 'EMERGENCY' ? 180 : severity === 'ALERT' ? 120 : 60);

    return this._retry(async () => {
      const result = await this.siren.activate({
        location,
        alertType,
        severity,
        duration
      });
      
      this._logDelivery('siren', `${location.lat},${location.lon}`, 'sent', { 
        sirenId: result.sirenId, 
        estimatedReach: result.estimatedReach 
      });
      return { success: true, sirenId: result.sirenId, estimatedReach: result.estimatedReach };
    }, 'siren');
  }

  /**
   * Broadcast via TV/Radio
   */
  async broadcastTVRadio(alert, channels = ['tv', 'radio'], language = 'en', options = {}) {
    const rateCheck = this._checkRateLimit('tvRadio');
    if (!rateCheck.allowed) {
      return { success: false, error: 'Rate limit exceeded', retryAfter: rateCheck.retryAfter };
    }

    return this._retry(async () => {
      const result = await this.tvRadio.broadcast({
        alert,
        channels,
        language
      });
      
      this._logDelivery('tvRadio', channels.join(','), 'sent', { 
        broadcastId: result.broadcastId, 
        estimatedReach: result.estimatedReach 
      });
      return { success: true, broadcastId: result.broadcastId, estimatedReach: result.estimatedReach };
    }, 'tvRadio');
  }

  /**
   * Disseminate alert across all configured channels
   * This is the main entry point called by E10 Decision Engine
   */
  async disseminate(alertDecision, alertMessage) {
    const { severity, channels, languages, location, confidence } = alertDecision;
    const results = {};
    
    console.log(`[E12] Disseminating ${severity} alert via channels: ${channels.join(', ')}`);
    
    // Prepare messages for each channel/language
    const messages = {};
    for (const lang of languages) {
      messages[lang] = {
        sms: alertMessage.sms?.[lang] || alertMessage.sms?.en || '',
        email: alertMessage.email?.[lang] || alertMessage.email?.en || '',
        push: alertMessage.push?.[lang] || alertMessage.push?.en || '',
        cap: alertMessage.cap?.[lang] || alertMessage.cap?.en || ''
      };
    }
    
    // SMS dissemination
    if (channels.includes('SMS') || channels.includes('SACHET')) {
      // In production, get phone numbers from user preferences / SACHET registry
      const phoneNumbers = options?.phoneNumbers || ['[REDACTED_PHONE_1]', '[REDACTED_PHONE_2]'];
      
      for (const phone of phoneNumbers) {
        for (const lang of languages) {
          const result = await this.sendSMS(phone, messages[lang].sms, { 
            prefix: `[${severity}]` 
          });
          results[`sms_${phone}_${lang}`] = result;
        }
      }
    }
    
    // Email dissemination
    if (channels.includes('EMAIL')) {
      const emails = options?.emails || ['[REDACTED_EMAIL_1]', '[REDACTED_EMAIL_2]'];
      
      for (const email of emails) {
        for (const lang of languages) {
          const subject = `[${severity}] ${messages[lang].sms.split('.')[0]}`;
          const result = await this.sendEmail(
            email,
            subject,
            messages[lang].email,
            messages[lang].email.replace(/\n/g, '<br>')
          );
          results[`email_${email}_${lang}`] = result;
        }
      }
    }
    
    // Push notification dissemination
    if (channels.includes('PUSH')) {
      const fcmTokens = options?.fcmTokens || ['[REDACTED_FCM_TOKEN_1]', '[REDACTED_FCM_TOKEN_2]'];
      
      for (const lang of languages) {
        const result = await this.sendPushMulticast(
          fcmTokens,
          `${severity}: ${messages[lang].sms.split('.')[0]}`,
          messages[lang].push,
          { 
            alertType: alertDecision.alertType || 'disaster',
            severity,
            confidence,
            location: location ? `${location.latitude},${location.longitude}` : '',
            capXml: messages[lang].cap
          }
        );
        results[`push_${lang}`] = result;
      }
    }
    
    // Siren activation
    if (channels.includes('SIREN') && location) {
      const result = await this.activateSiren(location, alertDecision.alertType || 'disaster', severity);
      results.siren = result;
    }
    
    // TV/Radio broadcast
    if ((channels.includes('TV') || channels.includes('RADIO')) && location) {
      const tvRadioChannels = channels.filter(c => c === 'TV' || c === 'RADIO');
      if (tvRadioChannels.length > 0) {
        const result = await this.broadcastTVRadio(
          { 
            type: alertDecision.alertType || 'disaster',
            severity,
            location,
            message: messages[languages[0]]?.sms || ''
          },
          tvRadioChannels,
          languages[0]
        );
        results.tvRadio = result;
      }
    }
    
    // Summary
    const summary = {
      alertId: alertDecision.alertId || `alert-${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity,
      channelsAttempted: channels,
      languages,
      results,
      overallSuccess: Object.values(results).every(r => r.success !== false)
    };
    
    console.log(`[E12] Dissemination complete: ${summary.overallSuccess ? 'SUCCESS' : 'PARTIAL/FAILED'}`);
    return summary;
  }

  /**
   * Get delivery statistics
   */
  getStats() {
    const now = Date.now();
    const lastHour = this.deliveryLog.filter(d => now - new Date(d.timestamp).getTime() < 3600000);
    
    const byChannel = {};
    const byStatus = {};
    
    for (const entry of lastHour) {
      byChannel[entry.channel] = (byChannel[entry.channel] || 0) + 1;
      byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;
    }
    
    return {
      lastHour: {
        total: lastHour.length,
        byChannel,
        byStatus
      },
      rateLimits: Object.keys(this.rateLimitCounters).reduce((acc, ch) => {
        acc[ch] = {
          used: this.rateLimitCounters[ch].count,
          limit: this.config.rateLimits[ch],
          remaining: Math.max(0, this.config.rateLimits[ch] - this.rateLimitCounters[ch].count)
        };
        return acc;
      }, {})
    };
  }

  /**
   * Get delivery history for a specific alert
   */
  getDeliveryHistory(alertId) {
    return this.deliveryLog.filter(d => d.details?.alertId === alertId);
  }

  /**
   * Update configuration at runtime
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('[E12] Configuration updated');
  }
}

module.exports = { DisseminationEngine, mockTwilio, mockSendGrid, mockFCM, mockSiren, mockTVRadio };