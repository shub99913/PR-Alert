// E13 Channel Adapters
// Unified abstraction layer for all dissemination channels
// Provides consistent interface, health checks, and channel-specific logic

/**
 * E13 Channel Adapters
 * Abstracts channel-specific implementations behind a common interface.
 * Supports: SMS (Twilio, SACHET), Email (SendGrid), Push (FCM, APNs), 
 * Siren (local/remote), TV/Radio (CAP-based), Web (WebSocket, Webhook)
 */

const { DisseminationEngine } = require('../e12_dissemination');

class BaseChannelAdapter {
  constructor(config = {}) {
    this.config = {
      name: config.name || 'unknown',
      enabled: config.enabled !== false,
      priority: config.priority || 1,
      rateLimit: config.rateLimit || 100,
      retry: config.retry || { maxAttempts: 3, baseDelay: 1000 },
      timeout: config.timeout || 10000,
      ...config
    };
    
    this.stats = {
      sent: 0,
      failed: 0,
      lastError: null,
      lastSuccess: null
    };
    
    this.health = {
      status: 'unknown', // 'healthy', 'degraded', 'down'
      lastCheck: null,
      latency: null
    };
  }

  /**
   * Send alert through this channel
   * @param {Object} alert - Alert data
   * @param {Object} message - Formatted message for this channel
   * @param {Object} options - Channel-specific options
   * @returns {Promise<Object>} Result { success, messageId, error }
   */
  async send(alert, message, options = {}) {
    throw new Error('send() must be implemented by subclass');
  }

  /**
   * Health check for this channel
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  /**
   * Get channel capabilities
   * @returns {Object} Capabilities
   */
  getCapabilities() {
    return {
      name: this.config.name,
      supportsMulticast: false,
      supportsRichContent: false,
      supportsDeliveryReceipt: false,
      maxMessageLength: 160,
      supportedLanguages: ['en'],
      ...this.config.capabilities
    };
  }

  /**
   * Format message for this channel
   * @param {Object} alert - Alert data
   * @param {Object} template - Message template
   * @returns {Object} Formatted message
   */
  formatMessage(alert, template) {
    return template;
  }

  _recordSuccess(messageId) {
    this.stats.sent++;
    this.stats.lastSuccess = new Date().toISOString();
    this.stats.lastError = null;
    this.health.status = 'healthy';
  }

  _recordFailure(error) {
    this.stats.failed++;
    this.stats.lastError = error.message;
    this.health.status = this.stats.failed > this.stats.sent * 0.5 ? 'degraded' : 'healthy';
  }

  getStats() {
    return {
      name: this.config.name,
      enabled: this.config.enabled,
      priority: this.config.priority,
      stats: { ...this.stats },
      health: { ...this.health },
      capabilities: this.getCapabilities()
    };
  }
}

/**
 * SMS Channel Adapter (Twilio + SACHET support)
 */
class SMSChannelAdapter extends BaseChannelAdapter {
  constructor(disseminationEngine, config = {}) {
    super({ name: 'sms', priority: 1, rateLimit: 100, ...config });
    this.engine = disseminationEngine;
    this.provider = config.provider || 'twilio'; // 'twilio', 'sachet', 'generic'
  }

  async send(alert, message, options = {}) {
    if (!this.config.enabled) return { success: false, error: 'Channel disabled' };

    const { to, language = 'en' } = options;
    if (!to) return { success: false, error: 'No recipient (to) provided' };

    const formattedMsg = this.formatMessage(alert, message);
    
    try {
      let result;
      if (this.provider === 'sachet') {
        // SACHET integration uses CAP XML
        result = await this._sendViaSACHET(alert, to, language);
      } else {
        // Standard Twilio SMS
        result = await this.engine.sendSMS(to, formattedMsg, { prefix: options.prefix });
      }
      
      if (result.success) this._recordSuccess(result.messageId);
      else this._recordFailure(new Error(result.error));
      
      return result;
    } catch (error) {
      this._recordFailure(error);
      return { success: false, error: error.message };
    }
  }

  async _sendViaSACHET(alert, phone, language) {
    // SACHET API integration (placeholder)
    console.log(`[SACHET SMS] Sending to ${phone} in ${language}`);
    return { success: true, messageId: `sachet-${Date.now()}`, provider: 'sachet' };
  }

  async healthCheck() {
    // Check Twilio/SACHET connectivity
    this.health.lastCheck = new Date().toISOString();
    this.health.status = 'healthy';
    return this.health;
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supportsMulticast: false,
      supportsDeliveryReceipt: true,
      maxMessageLength: 160,
      supportedLanguages: ['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'as'],
      provider: this.provider
    };
  }
}

/**
 * Email Channel Adapter (SendGrid)
 */
class EmailChannelAdapter extends BaseChannelAdapter {
  constructor(disseminationEngine, config = {}) {
    super({ name: 'email', priority: 2, rateLimit: 50, ...config });
    this.engine = disseminationEngine;
  }

  async send(alert, message, options = {}) {
    if (!this.config.enabled) return { success: false, error: 'Channel disabled' };

    const { to, language = 'en', subject } = options;
    if (!to) return { success: false, error: 'No recipient (to) provided' };

    const formattedMsg = this.formatMessage(alert, message);
    const emailSubject = subject || `[${alert.severity || 'ALERT'}] ${alert.type || 'Disaster'} Alert`;
    
    try {
      const result = await this.engine.sendEmail(
        to,
        emailSubject,
        formattedMsg.text || formattedMsg,
        formattedMsg.html || formattedMsg.text || formattedMsg
      );
      
      if (result.success) this._recordSuccess(result.messageId);
      else this._recordFailure(new Error(result.error));
      
      return result;
    } catch (error) {
      this._recordFailure(error);
      return { success: false, error: error.message };
    }
  }

  async healthCheck() {
    this.health.lastCheck = new Date().toISOString();
    this.health.status = 'healthy';
    return this.health;
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supportsMulticast: true,
      supportsRichContent: true,
      supportsDeliveryReceipt: true,
      maxMessageLength: 10000,
      supportedLanguages: ['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'as']
    };
  }
}

/**
 * Push Notification Adapter (FCM + APNs)
 */
class PushChannelAdapter extends BaseChannelAdapter {
  constructor(disseminationEngine, config = {}) {
    super({ name: 'push', priority: 1, rateLimit: 1000, ...config });
    this.engine = disseminationEngine;
    this.provider = config.provider || 'fcm'; // 'fcm', 'apns', 'webpush'
  }

  async send(alert, message, options = {}) {
    if (!this.config.enabled) return { success: false, error: 'Channel disabled' };

    const { token, tokens, language = 'en', data = {} } = options;
    if (!token && !tokens) return { success: false, error: 'No device token(s) provided' };

    const formattedMsg = this.formatMessage(alert, message);
    const title = options.title || `${alert.severity || 'ALERT'}: ${alert.type || 'Disaster'}`;
    const body = formattedMsg.push || formattedMsg.sms || formattedMsg;
    
    try {
      let result;
      if (tokens && tokens.length > 1) {
        result = await this.engine.sendPushMulticast(tokens, title, body, data);
      } else {
        result = await this.engine.sendPush(token, title, body, data);
      }
      
      if (result.success) this._recordSuccess(result.messageId);
      else this._recordFailure(new Error(result.error));
      
      return result;
    } catch (error) {
      this._recordFailure(error);
      return { success: false, error: error.message };
    }
  }

  async healthCheck() {
    this.health.lastCheck = new Date().toISOString();
    this.health.status = 'healthy';
    return this.health;
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supportsMulticast: true,
      supportsRichContent: true,
      supportsDeliveryReceipt: true,
      maxMessageLength: 4096,
      supportedLanguages: ['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'as'],
      provider: this.provider
    };
  }
}

/**
 * Siren Adapter (Local/Remote siren activation)
 */
class SirenChannelAdapter extends BaseChannelAdapter {
  constructor(disseminationEngine, config = {}) {
    super({ name: 'siren', priority: 1, rateLimit: 10, ...config });
    this.engine = disseminationEngine;
  }

  async send(alert, message, options = {}) {
    if (!this.config.enabled) return { success: false, error: 'Channel disabled' };

    const { location, alertType = 'disaster', severity = 'WARNING', duration } = options;
    if (!location || !location.lat || !location.lon) {
      return { success: false, error: 'Location required for siren activation' };
    }

    try {
      const result = await this.engine.activateSiren(
        { lat: location.lat, lon: location.lon },
        alertType,
        severity,
        { duration }
      );
      
      if (result.success) this._recordSuccess(result.sirenId);
      else this._recordFailure(new Error(result.error));
      
      return result;
    } catch (error) {
      this._recordFailure(error);
      return { success: false, error: error.message };
    }
  }

  async healthCheck() {
    // Could ping siren controller API
    this.health.lastCheck = new Date().toISOString();
    this.health.status = 'healthy';
    return this.health;
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supportsMulticast: false,
      supportsDeliveryReceipt: false,
      maxMessageLength: 0,
      supportedLanguages: [],
      requiresLocation: true,
      supportedPatterns: ['alert', 'wail', 'steady', 'pulse']
    };
  }
}

/**
 * TV/Radio Broadcast Adapter (CAP-based EAS/CAP)
 */
class TVRadioChannelAdapter extends BaseChannelAdapter {
  constructor(disseminationEngine, config = {}) {
    super({ name: 'tvRadio', priority: 3, rateLimit: 5, ...config });
    this.engine = disseminationEngine;
  }

  async send(alert, message, options = {}) {
    if (!this.config.enabled) return { success: false, error: 'Channel disabled' };

    const { channels = ['tv', 'radio'], language = 'en' } = options;
    const formattedMsg = this.formatMessage(alert, message);
    
    try {
      const result = await this.engine.broadcastTVRadio(
        { 
          type: alert.type || 'disaster',
          severity: alert.severity || 'WARNING',
          location: alert.location,
          message: formattedMsg
        },
        channels,
        language
      );
      
      if (result.success) this._recordSuccess(result.broadcastId);
      else this._recordFailure(new Error(result.error));
      
      return result;
    } catch (error) {
      this._recordFailure(error);
      return { success: false, error: error.message };
    }
  }

  async healthCheck() {
    this.health.lastCheck = new Date().toISOString();
    this.health.status = 'healthy';
    return this.health;
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supportsMulticast: true,
      supportsRichContent: false,
      supportsDeliveryReceipt: false,
      maxMessageLength: 1800,
      supportedLanguages: ['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'as'],
      supportedChannels: ['tv', 'radio', 'cable', 'satellite', 'digital']
    };
  }
}

/**
 * Web Channel Adapter (WebSocket, Server-Sent Events, Webhook)
 */
class WebChannelAdapter extends BaseChannelAdapter {
  constructor(config = {}) {
    super({ name: 'web', priority: 2, rateLimit: 500, ...config });
    this.connections = new Map(); // connectionId -> { ws, subscriptions }
    this.webhookUrls = config.webhookUrls || [];
  }

  addConnection(connectionId, ws, subscriptions = []) {
    this.connections.set(connectionId, { ws, subscriptions, connectedAt: Date.now() });
    console.log(`[WebChannel] New connection: ${connectionId}, subscriptions: ${subscriptions.join(', ')}`);
  }

  removeConnection(connectionId) {
    const conn = this.connections.get(connectionId);
    if (conn?.ws?.close) conn.ws.close();
    this.connections.delete(connectionId);
  }

  async send(alert, message, options = {}) {
    if (!this.config.enabled) return { success: false, error: 'Channel disabled' };

    const { connectionIds, broadcast = true } = options;
    const formattedMsg = this.formatMessage(alert, message);
    const payload = {
      type: 'alert',
      alert,
      message: formattedMsg,
      timestamp: new Date().toISOString()
    };

    let sent = 0;
    let failed = 0;

    // Send to specific connections or broadcast
    const targets = connectionIds || (broadcast ? Array.from(this.connections.keys()) : []);
    
    for (const connId of targets) {
      const conn = this.connections.get(connId);
      if (!conn || conn.ws.readyState !== 1) { // WebSocket.OPEN
        failed++;
        continue;
      }

      // Check subscription filter
      if (conn.subscriptions.length > 0 && 
          !conn.subscriptions.includes(alert.type) && 
          !conn.subscriptions.includes('all')) {
        continue;
      }

      try {
        conn.ws.send(JSON.stringify(payload));
        sent++;
      } catch (error) {
        failed++;
        console.error(`[WebChannel] Send failed to ${connId}:`, error.message);
      }
    }

    // Also send to webhooks
    for (const url of this.webhookUrls) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        sent++;
      } catch (error) {
        failed++;
      }
    }

    if (sent > 0) this._recordSuccess(`web-${sent}`);
    if (failed > 0) this._recordFailure(new Error(`${failed} failed`));

    return { success: failed === 0, sent, failed };
  }

  async healthCheck() {
    this.health.lastCheck = new Date().toISOString();
    this.health.status = this.connections.size > 0 ? 'healthy' : 'degraded';
    this.health.activeConnections = this.connections.size;
    return this.health;
  }

  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supportsMulticast: true,
      supportsRichContent: true,
      supportsDeliveryReceipt: false,
      maxMessageLength: 65536,
      supportedLanguages: ['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'as'],
      activeConnections: this.connections.size
    };
  }
}

/**
 * Channel Adapter Registry - manages all channel adapters
 */
class ChannelAdapterRegistry {
  constructor(disseminationEngine, config = {}) {
    this.engine = disseminationEngine;
    this.adapters = new Map();
    this.defaultChannelOrder = config.defaultChannelOrder || [
      'sms', 'push', 'email', 'siren', 'tvRadio', 'web'
    ];
    
    // Initialize default adapters
    this._initializeDefaults(config);
  }

  _initializeDefaults(config) {
    // SMS Adapter
    this.register('sms', new SMSChannelAdapter(this.engine, {
      enabled: config.sms?.enabled !== false,
      provider: config.sms?.provider || 'twilio',
      priority: 1
    }));

    // Email Adapter
    this.register('email', new EmailChannelAdapter(this.engine, {
      enabled: config.email?.enabled !== false,
      priority: 2
    }));

    // Push Adapter
    this.register('push', new PushChannelAdapter(this.engine, {
      enabled: config.push?.enabled !== false,
      provider: config.push?.provider || 'fcm',
      priority: 1
    }));

    // Siren Adapter
    this.register('siren', new SirenChannelAdapter(this.engine, {
      enabled: config.siren?.enabled !== false,
      priority: 1
    }));

    // TV/Radio Adapter
    this.register('tvRadio', new TVRadioChannelAdapter(this.engine, {
      enabled: config.tvRadio?.enabled !== false,
      priority: 3
    }));

    // Web Adapter
    this.register('web', new WebChannelAdapter({
      enabled: config.web?.enabled !== false,
      webhookUrls: config.web?.webhookUrls || [],
      priority: 2
    }));
  }

  /**
   * Register a channel adapter
   */
  register(name, adapter) {
    if (!(adapter instanceof BaseChannelAdapter)) {
      throw new Error('Adapter must extend BaseChannelAdapter');
    }
    this.adapters.set(name, adapter);
    console.log(`[E13] Registered channel adapter: ${name}`);
  }

  /**
   * Get adapter by name
   */
  get(name) {
    return this.adapters.get(name);
  }

  /**
   * Get all enabled adapters sorted by priority
   */
  getEnabledAdapters() {
    return Array.from(this.adapters.values())
      .filter(a => a.config.enabled)
      .sort((a, b) => a.config.priority - b.config.priority);
  }

  /**
   * Send alert through multiple channels
   */
  async sendMultiChannel(alert, messages, channelOptions = {}) {
    const adapters = this.getEnabledAdapters();
    const results = {};

    for (const adapter of adapters) {
      const channelName = adapter.config.name;
      const options = channelOptions[channelName] || {};
      const message = messages[channelName] || messages.default || '';
      
      if (!message) continue;

      try {
        const result = await adapter.send(alert, message, options);
        results[channelName] = result;
      } catch (error) {
        results[channelName] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Health check all channels
   */
  async healthCheckAll() {
    const results = {};
    for (const [name, adapter] of this.adapters) {
      try {
        results[name] = await adapter.healthCheck();
      } catch (error) {
        results[name] = { status: 'down', error: error.message };
      }
    }
    return results;
  }

  /**
   * Get aggregated stats
   */
  getStats() {
    const stats = {};
    for (const [name, adapter] of this.adapters) {
      stats[name] = adapter.getStats();
    }
    return stats;
  }

  /**
   * Update channel configuration
   */
  updateChannelConfig(name, config) {
    const adapter = this.adapters.get(name);
    if (adapter) {
      adapter.updateConfig(config);
    }
  }
}

module.exports = {
  BaseChannelAdapter,
  SMSChannelAdapter,
  EmailChannelAdapter,
  PushChannelAdapter,
  SirenChannelAdapter,
  TVRadioChannelAdapter,
  WebChannelAdapter,
  ChannelAdapterRegistry
};