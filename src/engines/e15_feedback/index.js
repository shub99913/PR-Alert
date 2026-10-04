// E15 Feedback Loop Engine
// User feedback collection, alert verification, and system learning

/**
 * E15 Feedback Loop Engine
 * Collects user feedback on alerts, verifies alert accuracy,
 * and provides learning signals for ML models and rule tuning.
 * 
 * Features:
 * - User response tracking (acknowledged, dismissed, false alarm, etc.)
 * - Alert verification workflow
 * - Feedback analytics and metrics
 * - Integration with E08 ML models for retraining
 * - Rule performance monitoring (E07)
 * - Crowd-sourced validation
 */

class FeedbackLoopEngine {
  constructor(config = {}) {
    this.config = {
      // Storage
      storage: config.storage || 'async', // 'async', 'sqlite', 'memory'
      maxFeedbackEntries: config.maxFeedbackEntries || 10000,
      
      // Feedback types
      feedbackTypes: config.feedbackTypes || [
        'acknowledged',      // User saw and acknowledged
        'dismissed',         // User dismissed without action
        'false_alarm',       // User reports false alarm
        'verified',          // User confirms alert was accurate
        'action_taken',      // User took protective action
        'not_received',      // User didn't receive alert
        'delayed',           // Alert received late
        'inaccurate_location', // Location was wrong
        'inaccurate_severity', // Severity was wrong
        'helpful',           // Alert was helpful
        'not_helpful'        // Alert was not helpful
      ],
      
      // Verification workflow
      verification: {
        enabled: config.verification?.enabled !== false,
        requireEvidence: config.verification?.requireEvidence || false,
        autoVerifyAfterHours: config.verification?.autoVerifyAfterHours || 24,
        trustedSources: config.verification?.trustedSources || ['official', 'verified_user']
      },
      
      // Analytics
      analytics: {
        enabled: config.analytics?.enabled !== false,
        aggregationInterval: config.analytics?.aggregationInterval || 3600000, // 1 hour
        retentionDays: config.analytics?.retentionDays || 90
      },
      
      // Learning integration
      learning: {
        enabled: config.learning?.enabled !== false,
        minFeedbackForRetrain: config.learning?.minFeedbackForRetrain || 100,
        feedbackWeight: config.learning?.feedbackWeight || 0.3
      }
    };

    // In-memory storage (replace with persistent in production)
    this.feedbackStore = new Map(); // alertId -> feedback[]
    this.userFeedbackStore = new Map(); // userId -> feedback[]
    this.verificationQueue = [];
    this.aggregatedMetrics = {
      totalFeedback: 0,
      byType: {},
      byAlertType: {},
      bySeverity: {},
      byChannel: {},
      falseAlarmRate: 0,
      acknowledgmentRate: 0,
      verificationRate: 0,
      avgResponseTime: 0
    };
    
    // Timers
    this.aggregationTimer = null;
    this.cleanupTimer = null;
    
    console.log('[E15] Feedback Loop Engine initialized');
    console.log(`  Feedback types: ${this.config.feedbackTypes.join(', ')}`);
    console.log(`  Verification: ${this.config.verification.enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  Learning integration: ${this.config.learning.enabled ? 'ENABLED' : 'DISABLED'}`);
    
    this._startAggregationTimer();
    this._startCleanupTimer();
  }

  /**
   * Start periodic metrics aggregation
   */
  _startAggregationTimer() {
    if (!this.config.analytics.enabled) return;
    
    this.aggregationTimer = setInterval(() => {
      this._aggregateMetrics();
    }, this.config.analytics.aggregationInterval);
  }

  /**
   * Start cleanup timer for old feedback
   */
  _startCleanupTimer() {
    this.cleanupTimer = setInterval(() => {
      this._cleanupOldFeedback();
    }, 24 * 3600000); // Daily
  }

  /**
   * Submit feedback for an alert
   */
  async submitFeedback(feedbackData) {
    const {
      alertId,
      userId,
      type,           // One of feedbackTypes
      timestamp = new Date().toISOString(),
      channel,        // How alert was received: sms, push, email, siren, etc.
      location,       // User's location when feedback given
      comment,        // Optional free-text comment
      evidence,       // Optional evidence (photo, location, etc.)
      deviceInfo,     // Device/platform info
      responseTimeMs  // Time from alert to feedback
    } = feedbackData;

    // Validate
    if (!alertId || !userId || !type) {
      throw new Error('Missing required fields: alertId, userId, type');
    }

    if (!this.config.feedbackTypes.includes(type)) {
      throw new Error(`Invalid feedback type: ${type}. Must be one of ${this.config.feedbackTypes.join(', ')}`);
    }

    const feedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alertId,
      userId,
      type,
      timestamp,
      channel,
      location,
      comment,
      evidence,
      deviceInfo,
      responseTimeMs,
      verified: false,
      verificationNotes: null
    };

    // Store by alert
    if (!this.feedbackStore.has(alertId)) {
      this.feedbackStore.set(alertId, []);
    }
    this.feedbackStore.get(alertId).push(feedback);

    // Store by user
    if (!this.userFeedbackStore.has(userId)) {
      this.userFeedbackStore.set(userId, []);
    }
    this.userFeedbackStore.get(userId).push(feedback);

    // Add to verification queue if needed
    if (type === 'false_alarm' || type === 'verified' || this.config.verification.requireEvidence) {
      this.verificationQueue.push({
        feedbackId: feedback.id,
        alertId,
        userId,
        type,
        priority: type === 'false_alarm' ? 'high' : 'normal',
        status: 'pending',
        createdAt: timestamp
      });
    }

    // Update real-time metrics
    this._updateRealTimeMetrics(feedback);

    console.log(`[E15] Feedback received: ${type} for alert ${alertId} from user ${userId}`);
    
    // Trigger learning if threshold reached
    if (this.config.learning.enabled) {
      this._checkLearningTrigger();
    }

    return { success: true, feedbackId: feedback.id };
  }

  /**
   * Get feedback for an alert
   */
  getFeedbackForAlert(alertId) {
    return this.feedbackStore.get(alertId) || [];
  }

  /**
   * Get feedback from a user
   */
  getFeedbackFromUser(userId) {
    return this.userFeedbackStore.get(userId) || [];
  }

  /**
   * Get aggregated metrics
   */
  getMetrics() {
    return { ...this.aggregatedMetrics };
  }

  /**
   * Get feedback statistics for an alert type
   */
  getAlertTypeStats(alertType) {
    const feedback = Array.from(this.feedbackStore.values()).flat();
    const relevant = feedback.filter(f => {
      // Would need alert type mapping - simplified here
      return true;
    });
    
    return this._calculateStats(relevant);
  }

  /**
   * Verify feedback (mark as verified by moderator/official)
   */
  async verifyFeedback(feedbackId, verified, notes = '', verifiedBy = 'moderator') {
    // Find feedback
    let found = null;
    for (const [alertId, feedbacks] of this.feedbackStore) {
      found = feedbacks.find(f => f.id === feedbackId);
      if (found) break;
    }
    
    if (!found) {
      return { success: false, error: 'Feedback not found' };
    }
    
    found.verified = verified;
    found.verificationNotes = notes;
    found.verifiedBy = verifiedBy;
    found.verifiedAt = new Date().toISOString();
    
    // Update verification queue
    const queueItem = this.verificationQueue.find(q => q.feedbackId === feedbackId);
    if (queueItem) {
      queueItem.status = verified ? 'verified' : 'rejected';
      queueItem.resolvedAt = new Date().toISOString();
      queueItem.resolvedBy = verifiedBy;
    }
    
    console.log(`[E15] Feedback ${feedbackId} ${verified ? 'verified' : 'rejected'}: ${notes}`);
    
    return { success: true, feedbackId };
  }

  /**
   * Get verification queue
   */
  getVerificationQueue(status = 'pending') {
    return this.verificationQueue.filter(q => q.status === status);
  }

  /**
   * Submit crowd verification (multiple users confirming/rejecting)
   */
  async submitCrowdVerification(alertId, verifications) {
    // verifications: [{ userId, vote: 'confirm'|'reject', confidence, evidence }]
    const results = {
      alertId,
      totalVotes: verifications.length,
      confirm: 0,
      reject: 0,
      consensus: null,
      confidence: 0
    };
    
    for (const v of verifications) {
      if (v.vote === 'confirm') results.confirm++;
      else if (v.vote === 'reject') results.reject++;
    }
    
    results.consensus = results.confirm > results.reject ? 'confirmed' : 'rejected';
    results.confidence = Math.max(results.confirm, results.reject) / results.totalVotes;
    
    // Store as feedback
    for (const v of verifications) {
      await this.submitFeedback({
        alertId,
        userId: v.userId,
        type: v.vote === 'confirm' ? 'verified' : 'false_alarm',
        comment: `Crowd verification: ${v.vote} (confidence: ${v.confidence})`,
        evidence: v.evidence
      });
    }
    
    console.log(`[E15] Crowd verification for ${alertId}: ${results.consensus} (${results.confidence * 100}% confidence)`);
    
    return results;
  }

  /**
   * Get learning signals for ML models
   */
  getLearningSignals() {
    if (!this.config.learning.enabled) {
      return { enabled: false };
    }
    
    const signals = {
      falseAlarms: [],
      verifiedAlerts: [],
      missedAlerts: [], // Would need external data
      channelPerformance: {},
      rulePerformance: {}
    };
    
    // Extract false alarms
    for (const [alertId, feedbacks] of this.feedbackStore) {
      const falseAlarms = feedbacks.filter(f => f.type === 'false_alarm' && f.verified);
      const verified = feedbacks.filter(f => f.type === 'verified' && f.verified);
      
      if (falseAlarms.length > 0) {
        signals.falseAlarms.push({ alertId, count: falseAlarms.length, feedbacks: falseAlarms });
      }
      if (verified.length > 0) {
        signals.verifiedAlerts.push({ alertId, count: verified.length, feedbacks: verified });
      }
    }
    
    // Channel performance
    const allFeedback = Array.from(this.feedbackStore.values()).flat();
    const byChannel = {};
    for (const f of allFeedback) {
      if (!byChannel[f.channel]) byChannel[f.channel] = { total: 0, acknowledged: 0, falseAlarms: 0 };
      byChannel[f.channel].total++;
      if (f.type === 'acknowledged' || f.type === 'action_taken') byChannel[f.channel].acknowledged++;
      if (f.type === 'false_alarm') byChannel[f.channel].falseAlarms++;
    }
    signals.channelPerformance = byChannel;
    
    return signals;
  }

  /**
   * Update real-time metrics
   */
  _updateRealTimeMetrics(feedback) {
    this.aggregatedMetrics.totalFeedback++;
    
    // By type
    this.aggregatedMetrics.byType[feedback.type] = (this.aggregatedMetrics.byType[feedback.type] || 0) + 1;
    
    // Calculate rates
    const total = this.aggregatedMetrics.totalFeedback;
    const acked = this.aggregatedMetrics.byType.acknowledged || 0;
    const actioned = this.aggregatedMetrics.byType.action_taken || 0;
    const falseAlarms = this.aggregatedMetrics.byType.false_alarm || 0;
    const verified = this.aggregatedMetrics.byType.verified || 0;
    
    this.aggregatedMetrics.acknowledgmentRate = (acked + actioned) / total;
    this.aggregatedMetrics.falseAlarmRate = falseAlarms / total;
    this.aggregatedMetrics.verificationRate = verified / total;
    
    // Response time
    if (feedback.responseTimeMs) {
      const currentAvg = this.aggregatedMetrics.avgResponseTime;
      this.aggregatedMetrics.avgResponseTime = (currentAvg * (total - 1) + feedback.responseTimeMs) / total;
    }
  }

  /**
   * Aggregate metrics periodically
   */
  _aggregateMetrics() {
    const allFeedback = Array.from(this.feedbackStore.values()).flat();
    const now = Date.now();
    const cutoff = now - this.config.analytics.retentionDays * 24 * 3600000;
    
    // Filter recent feedback
    const recent = allFeedback.filter(f => new Date(f.timestamp).getTime() > cutoff);
    
    // Recalculate
    this.aggregatedMetrics.totalFeedback = recent.length;
    this.aggregatedMetrics.byType = {};
    this.aggregatedMetrics.byAlertType = {};
    this.aggregatedMetrics.bySeverity = {};
    this.aggregatedMetrics.byChannel = {};
    
    let totalResponseTime = 0;
    let responseCount = 0;
    
    for (const f of recent) {
      this.aggregatedMetrics.byType[f.type] = (this.aggregatedMetrics.byType[f.type] || 0) + 1;
      if (f.channel) {
        this.aggregatedMetrics.byChannel[f.channel] = (this.aggregatedMetrics.byChannel[f.channel] || 0) + 1;
      }
      if (f.responseTimeMs) {
        totalResponseTime += f.responseTimeMs;
        responseCount++;
      }
    }
    
    this.aggregatedMetrics.avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;
    
    // Calculate rates
    const acked = this.aggregatedMetrics.byType.acknowledged || 0;
    const actioned = this.aggregatedMetrics.byType.action_taken || 0;
    const falseAlarms = this.aggregatedMetrics.byType.false_alarm || 0;
    const verified = this.aggregatedMetrics.byType.verified || 0;
    
    this.aggregatedMetrics.acknowledgmentRate = total > 0 ? (acked + actioned) / total : 0;
    this.aggregatedMetrics.falseAlarmRate = total > 0 ? falseAlarms / total : 0;
    this.aggregatedMetrics.verificationRate = total > 0 ? verified / total : 0;
    
    console.log('[E15] Metrics aggregated:', {
      total: this.aggregatedMetrics.totalFeedback,
      falseAlarmRate: (this.aggregatedMetrics.falseAlarmRate * 100).toFixed(1) + '%',
      ackRate: (this.aggregatedMetrics.acknowledgmentRate * 100).toFixed(1) + '%'
    });
  }

  /**
   * Clean up old feedback
   */
  _cleanupOldFeedback() {
    const cutoff = Date.now() - this.config.analytics.retentionDays * 24 * 3600000;
    let removed = 0;
    
    for (const [alertId, feedbacks] of this.feedbackStore) {
      const filtered = feedbacks.filter(f => new Date(f.timestamp).getTime() > cutoff);
      removed += feedbacks.length - filtered.length;
      if (filtered.length === 0) {
        this.feedbackStore.delete(alertId);
      } else {
        this.feedbackStore.set(alertId, filtered);
      }
    }
    
    // Also clean user store
    for (const [userId, feedbacks] of this.userFeedbackStore) {
      const filtered = feedbacks.filter(f => new Date(f.timestamp).getTime() > cutoff);
      if (filtered.length === 0) {
        this.userFeedbackStore.delete(userId);
      } else {
        this.userFeedbackStore.set(userId, filtered);
      }
    }
    
    console.log(`[E15] Cleaned up ${removed} old feedback entries`);
  }

  /**
   * Check if learning should be triggered
   */
  _checkLearningTrigger() {
    if (this.aggregatedMetrics.totalFeedback >= this.config.learning.minFeedbackForRetrain) {
      console.log('[E15] Learning threshold reached, signaling retrain...');
      // In production, emit event for E08 ML Engine
      this._emitLearningEvent();
    }
  }

  /**
   * Emit learning event (placeholder for integration)
   */
  _emitLearningEvent() {
    // Would integrate with E08 ML Engine
    console.log('[E15] Learning event emitted for ML retraining');
  }

  /**
   * Calculate stats for feedback array
   */
  _calculateStats(feedbacks) {
    const stats = { total: feedbacks.length, byType: {}, avgResponseTime: 0 };
    let responseSum = 0, responseCount = 0;
    
    for (const f of feedbacks) {
      stats.byType[f.type] = (stats.byType[f.type] || 0) + 1;
      if (f.responseTimeMs) {
        responseSum += f.responseTimeMs;
        responseCount++;
      }
    }
    
    stats.avgResponseTime = responseCount > 0 ? responseSum / responseCount : 0;
    return stats;
  }

  /**
   * Get user engagement score
   */
  getUserEngagement(userId) {
    const feedbacks = this.userFeedbackStore.get(userId) || [];
    if (feedbacks.length === 0) return 0;
    
    let score = 0;
    for (const f of feedbacks) {
      switch (f.type) {
        case 'acknowledged': score += 1; break;
        case 'action_taken': score += 3; break;
        case 'verified': score += 2; break;
        case 'helpful': score += 1; break;
        case 'false_alarm': score -= 1; break;
        case 'dismissed': score -= 1; break;
        case 'not_helpful': score -= 1; break;
      }
    }
    
    return Math.max(0, score / feedbacks.length * 100);
  }

  /**
   * Shutdown engine
   */
  shutdown() {
    if (this.aggregationTimer) clearInterval(this.aggregationTimer);
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
    console.log('[E15] Feedback Loop Engine shutdown');
  }
}

module.exports = { FeedbackLoopEngine };