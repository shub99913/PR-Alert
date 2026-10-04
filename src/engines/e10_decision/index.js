/**
 * E10: Alert Decision Engine
 * Adapted for React Native/Expo mobile environment
 * 
 * Responsibilities:
 * - Decide severity level, affected area, which channels to use, which languages
 * - The "fire chief" that makes final alert decisions based on fused intelligence
 * - Considers policy, regulations, and operational constraints
 * - STANDALONE: No government dependencies (no SACHET)
 */

class AlertDecisionEngine {
  constructor() {
    this.isInitialized = false;
    this.decisionPolicies = {}; // Policies for different disaster types/jurisdictions
    this.alertHistory = new Map(); // Recent alert decisions to prevent duplicates
    this.maxHistory = 500;
    this.rateLimits = {}; // Per-channel rate limiting

    // Initialize immediately
    this.initialize();
  }

  /**
   * Initialize the alert decision engine
   * Loads decision policies and configuration
   */
  async initialize() {
    try {
      // Load decision policies and configuration
      await this.loadDecisionPolicies();
      
      // Initialize rate limits
      this.initializeRateLimits();
      
      this.isInitialized = true;
      this.log('info', 'Alert Decision Engine (E10) initialized successfully');
      
      // Update engine status
      await this.updateEngineStatus('E10', 'active');
      
      return true;
    } catch (error) {
      this.log('error', `Failed to initialize Alert Decision: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load decision policies
   * In production, these might come from remote config, legal requirements, or ML tuning
   */
  async loadDecisionPolicies() {
    // Default decision policies based on disaster type and jurisdiction
    // These would be customized per region, disaster type, and regulatory requirements
    this.decisionPolicies = {
      // Global defaults
      default: {
        // Severity thresholds for action
        severityThresholds: {
          INFO: { minConfidence: 0, action: 'NONE' },
          WARNING: { minConfidence: 40, action: 'MONITOR' },
          ALERT: { minConfidence: 60, action: 'ALERT' },
          EMERGENCY: { minConfidence: 80, action: 'EMERGENCY_ALERT' }
        },
        // Channel selection rules - STANDALONE (no SACHET)
        channelRules: {
          // Always use these channels for emergency alerts
          EMERGENCY: ['SMS', 'PUSH', 'EMAIL', 'SIREN', 'RADIO', 'WEBHOOK'],
          // Use these for high-confidence alerts
          ALERT: ['SMS', 'PUSH', 'EMAIL', 'WEBHOOK'],
          // Use these for medium-confidence warnings
          WARNING: ['SMS', 'PUSH', 'WEBHOOK'],
          // Info only goes to internal systems/dashboard
          INFO: ['DASHBOARD', 'LOG']
        },
        // Language selection (based on location)
        languageRules: {
          // India-specific: Hindi + English for national alerts
          'IN': ['hi', 'en'],
          // Default to English
          'default': ['en']
        },
        // Area expansion rules (how much to expand predicted area for safety)
        areaExpansion: {
          INFO: 0,      // No expansion
          WARNING: 0.1, // 10% expansion
          ALERT: 0.2,   // 20% expansion
          EMERGENCY: 0.3 // 30% expansion
        },
        // Minimum time between similar alerts (to prevent spam)
        cooldownPeriods: {
          INFO: 0,           // No cooldown for info
          WARNING: 30 * 60,  // 30 minutes
          ALERT: 60 * 60,    // 1 hour
          EMERGENCY: 5 * 60  // 5 minutes (more frequent for emergencies)
        }
      },
      
      // India-specific overrides
      IN: {
        // More conservative for floods in India due to high population density
        flood: {
          severityThresholds: {
            WARNING: { minConfidence: 35, action: 'MONITOR' }, // Lower threshold for floods
            ALERT: { minConfidence: 55, action: 'ALERT' },
            EMERGENCY: { minConfidence: 75, action: 'EMERGENCY_ALERT' }
          },
          channelRules: {
            EMERGENCY: ['SMS', 'PUSH', 'EMAIL', 'SIREN', 'RADIO', 'TV', 'WEBHOOK'],
            ALERT: ['SMS', 'PUSH', 'EMAIL', 'TV', 'WEBHOOK'],
            WARNING: ['SMS', 'PUSH', 'WEBHOOK'],
            INFO: ['DASHBOARD', 'LOG']
          }
        },
        // More sensitive for earthquakes in seismic zones
        earthquake: {
          severityThresholds: {
            WARNING: { minConfidence: 30, action: 'MONITOR' },
            ALERT: { minConfidence: 50, action: 'ALERT' },
            EMERGENCY: { minConfidence: 70, action: 'EMERGENCY_ALERT' }
          }
        }
      }
    };
    
    this.log('info', `Loaded decision policies for ${Object.keys(this.decisionPolicies).length} jurisdictions`);
  }

  /**
   * Initialize rate limiting for channels
   */
  initializeRateLimits() {
    // Default rate limits (alerts per hour per channel)
    // These prevent alert fatigue and respect channel limitations
    this.rateLimits = {
      SMS:    { maxPerHour: 10, windowMs: 60 * 60 * 1000 },  // Carrier limits
      PUSH:   { maxPerHour: 20, windowMs: 60 * 60 * 1000 },  // App notifications
      EMAIL:  { maxPerHour: 50, windowMs: 60 * 60 * 1000 },  // Email service limits
      SIREN:  { maxPerHour: 2, windowMs: 60 * 60 * 1000 },   // Physical infrastructure
      RADIO:  { maxPerHour: 6, windowMs: 60 * 60 * 1000 },   // Broadcast limits
      TV:     { maxPerHour: 4, windowMs: 60 * 60 * 1000 },   // Broadcast limits
      WEBHOOK: { maxPerHour: 100, windowMs: 60 * 60 * 1000 }, // Webhook endpoints
    };
    
    // Track usage for rate limiting
    this.channelUsage = {};
    for (const channel in this.rateLimits) {
      this.channelUsage[channel] = [];
    }
  }

  /**
   * Make an alert decision based on fused intelligence
   * @param {Object} fusionResult - Result from E09 Fusion & Confidence Engine
   * @param {Object} context - Additional context (location, time, etc.)
   * @returns {Object} Final alert decision with actions to take
   */
  async makeDecision(fusionResult, context = {}) {
    if (!this.isInitialized) {
      throw new Error('Alert decision engine not initialized');
    }
    
    this.log('info', 'Making alert decision based on fused intelligence...');
    
    // Extract key information from fusion result
    const { confidence, severity, contributingSources, recommendation } = fusionResult;
    const { location = {}, timestamp = Date.now() } = context;
    
    // Determine jurisdiction based on location (simplified)
    const jurisdiction = this.determineJurisdiction(location);
    
    // Get applicable policies
    const policies = this.getDecisionPolicies(jurisdiction, fusionResult);
    
    // Step 1: Check if we should take any action based on confidence and severity
    const actionDecision = this.determineAction(confidence, severity, policies);
    if (!actionDecision.shouldAct) {
      this.log('info', `Decision: No action required. Reason: ${actionDecision.reason}`);
      return this.createNoActionDecision(fusionResult, context, actionDecision.reason);
    }
    
    // Step 2: Check for duplicate alerts (cooldown period)
    const duplicateCheck = this.checkForDuplicateAlert(fusionResult, context, policies);
    if (duplicateCheck.isDuplicate) {
      this.log('info', `Decision: Duplicate alert suppressed. Reason: ${duplicateCheck.reason}`);
      return this.createDuplicateSuppressedDecision(fusionResult, context, duplicateCheck);
    }
    
    // Step 3: Check rate limits for channels
    const rateLimitCheck = this.checkRateLimits(actionDecision.channels, policies);
    if (!rateLimitCheck.withinLimits) {
      this.log('warn', `Decision: Rate limit exceeded. Reason: ${rateLimitCheck.reason}`);
      return this.createRateLimitedDecision(fusionResult, context, rateLimitCheck);
    }
    
    // Step 4: Determine final alert properties
    const alertProperties = this.determineAlertProperties(
      fusionResult, 
      context, 
      policies, 
      actionDecision
    );
    
    // Step 5: Record this decision for history and rate limiting
    this.recordDecision(alertProperties);
    
    // Step 6: Return final decision
    this.log('info', `Decision: ${alertProperties.action} alert issued. Severity: ${alertProperties.severity}, Confidence: ${alertProperties.confidence}%`);
    
    return {
      ...fusionResult, // Include original fusion data
      decisionEngine: 'E10_AlertDecision',
      decisionTimestamp: Date.now(),
      jurisdiction: jurisdiction,
      policiesApplied: {
        severityThresholds: policies.severityThresholds,
        channelRules: policies.channelRules,
        languageRules: policies.languageRules,
        areaExpansion: policies.areaExpansion,
        cooldownPeriods: policies.cooldownPeriods
      },
      actionDecision: actionDecision,
      alertProperties: alertProperties,
      status: 'DECISION_MADE',
      engine: 'E10_AlertDecision'
    };
  }

  /**
   * Determine jurisdiction based on location
   * @param {Object} location - { latitude: number, longitude: number }
   * @returns {string} Jurisdiction key (e.g., 'IN', 'US', 'default')
   */
  determineJurisdiction(location) {
    // Simplified jurisdiction determination
    // In reality, this would use reverse geocoding or GIS boundaries
    
    const lat = location.latitude || 0;
    const lon = location.longitude || 0;
    
    // Rough bounds for India (for demo)
    if (lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98) {
      return 'IN';
    }
    
    // Add other jurisdictions as needed
    // if (lat >= 24 && lat <= 49 && lon >= -125 && lon <= -66) return 'US';
    // etc.
    
    return 'default';
  }

  /**
   * Get decision policies for a jurisdiction and event type
   * @param {string} jurisdiction - Jurisdiction key
   * @param {Object} fusionResult - Fusion result to determine event type
   * @returns {Object} Decision policies to apply
   */
  getDecisionPolicies(jurisdiction, fusionResult) {
    // Start with default policies
    let policies = JSON.parse(JSON.stringify(this.decisionPolicies.default));
    
    // Override with jurisdiction-specific policies if available
    if (this.decisionPolicies[jurisdiction]) {
      policies = JSON.parse(JSON.stringify(this.decisionPolicies[jurisdiction]));
    }
    
    // Further refine by event type if available
    const eventType = fusionResult.contributingSources 
      .find(source => source !== null) 
      || 'unknown';
    
    // In a more sophisticated system, we would have event-type specific policies
    // For now, we'll use the jurisdiction policies
    
    return policies;
  }

  /**
   * Determine if we should take action based on confidence and severity
   * @param {number} confidence - Confidence percentage (0-100)
   * @param {string} severity - Severity level
   * @param {Object} policies - Decision policies
   * @returns {Object} { shouldAct: boolean, reason: string, action: string, channels: string[] }
   */
  determineAction(confidence, severity, policies) {
    // Get the threshold for this severity level
    const thresholdInfo = policies.severityThresholds[severity];
    if (!thresholdInfo) {
      // If severity not in policies, treat as INFO
      return {
        shouldAct: false,
        reason: `Unknown severity level: ${severity}`,
        action: 'NONE',
        channels: []
      };
    }
    
    // Check if confidence meets minimum threshold
    const minConfidence = thresholdInfo.minConfidence || 0;
    if (confidence < minConfidence) {
      return {
        shouldAct: false,
        reason: `Confidence ${confidence}% below minimum ${minConfidence}% for ${severity}`,
        action: thresholdInfo.action || 'NONE',
        channels: []
      };
    }
    
    // Check if the action is not NONE
    const action = thresholdInfo.action || 'NONE';
    if (action === 'NONE') {
      return {
        shouldAct: false,
        reason: `Action for ${severity} is NONE per policy`,
        action: 'NONE',
        channels: []
      };
    }
    
    // Determine channels for this severity
    const channels = policies.channelRules[severity] || policies.channelRules.INFO || ['DASHBOARD'];
    
    return {
      shouldAct: true,
      reason: `Confidence ${confidence}% meets minimum ${minConfidence}% for ${severity}`,
      action: action,
      channels: [...new Set(channels)] // Remove duplicates
    };
  }

  /**
   * Check if this is a duplicate of a recent alert
   * @param {Object} fusionResult - Current fusion result
   * @param {Object} context - Context information
   * @param {Object} policies - Decision policies
   * @returns {Object} { isDuplicate: boolean, reason: string }
   */
  checkForDuplicateAlert(fusionResult, context, policies) {
    const { location = {}, timestamp = Date.now() } = context;
    
    // Create a key for this alert based on location and type
    // In reality, this would be more sophisticated (polygon overlap, etc.)
    const lat = Math.round((location.latitude || 0) * 100) / 100; // 0.01 degree precision (~1km)
    const lon = Math.round((location.longitude || 0) * 100) / 100;
    const severity = fusionResult.severity || 'UNKNOWN';
    
    // Create alert key
    const alertKey = `${lat}:${lon}:${severity}`;
    
    // Check if we've seen this recently
    const cooldownPeriod = policies.cooldownPeriods[severity] || 0;
    if (cooldownPeriod === 0) {
      return { isDuplicate: false, reason: 'No cooldown period for this severity' };
    }
    
    // Check history
    const cutoffTime = timestamp - (cooldownPeriod * 1000); // Convert to milliseconds
    
    // Clean old entries from history
    this.alertHistory.forEach((value, key) => {
      if (value.timestamp < cutoffTime) {
        this.alertHistory.delete(key);
      }
    });
    
    // Check if we have a recent similar alert
    if (this.alertHistory.has(alertKey)) {
      const lastAlert = this.alertHistory.get(alertKey);
      const timeSinceLast = timestamp - lastAlert.timestamp;
      const minutesSinceLast = Math.floor(timeSinceLast / (60 * 1000));
      
      return {
        isDuplicate: true,
        reason: `Similar alert issued ${minutesSinceLast} minutes ago (cooldown: ${cooldownPeriod/60} minutes)`
      };
    }
    
    return { isDuplicate: false, reason: 'No recent similar alert found' };
  }

  /**
   * Check if proposed channels are within rate limits
   * @param {Array} channels - Proposed channels to use
   * @param {Object} policies - Decision policies
   * @returns {Object} { withinLimits: boolean, reason: string }
   */
  checkRateLimits(channels, policies) {
    const now = Date.now();
    
    for (const channel of channels) {
      // Skip internal channels that don't have rate limits
      if (!this.rateLimits[channel]) {
        continue;
      }
      
      const limitInfo = this.rateLimits[channel];
      const windowStart = now - limitInfo.windowMs;
      
      // Clean old usage entries
      this.channelUsage[channel] = this.channelUsage[channel].filter(
        timestamp => timestamp > windowStart
      );
      
      // Check if we're at the limit
      if (this.channelUsage[channel].length >= limitInfo.maxPerHour) {
        return {
          withinLimits: false,
          reason: `Channel ${channel} rate limit exceeded: ${this.channelUsage[channel].length}/${limitInfo.maxPerHour} per ${limitInfo.windowMs/(60*1000)} hours`
        };
      }
    }
    
    return { withinLimits: true, reason: 'All channels within rate limits' };
  }

  /**
   * Determine final alert properties
   * @param {Object} fusionResult - Original fusion result
   * @param {Object} context - Context information
   * @param {Object} policies - Decision policies
   * @param {Object} actionDecision - Action determination result
   * @returns {Object} Final alert properties
   */
  determineAlertProperties(fusionResult, context, policies, actionDecision) {
    const { confidence, severity, contributingSources } = fusionResult;
    const { location = {}, timestamp = Date.now() } = context;
    
    // Determine final severity (might be adjusted by policy)
    let finalSeverity = severity;
    
    // Determine affected area (apply expansion based on policy)
    let affectedArea = this.calculateAffectedArea(fusionResult, context, policies);
    
    // Determine channels to use
    let channels = this.selectChannels(finalSeverity, policies);
    
    // Determine languages to use
    let languages = this.selectLanguages(location, policies);
    
    // Determine message priority
    let priority = this.determinePriority(confidence, severity, policies);
    
    // Determine if this requires immediate escalation
    let requiresEscalation = this.requiresEscalation(confidence, severity, policies);
    
    return {
      confidence: parseFloat(confidence.toFixed(1)),
      severity: finalSeverity,
      location: location,
      timestamp: timestamp,
      affectedArea: affectedArea,
      channels: channels,
      languages: languages,
      priority: priority,
      requiresEscalation: requiresEscalation,
      action: actionDecision.action,
      contributingSources: contributingSources,
      // Additional metadata
      decisionFactors: {
        confidenceThresholdMet: confidence >= (policies.severityThresholds[severity]?.minConfidence || 0),
        jurisdiction: this.determineJurisdiction(location),
        policyVersion: '1.0.0'
      }
    };
  }

  /**
   * Calculate affected area with policy-based expansion
   * @param {Object} fusionResult - Fusion result
   * @param {Object} context - Context information
   * @param {Object} policies - Decision policies
   * @returns {Object} Affected area specification
   */
  calculateAffectedArea(fusionResult, context, policies) {
    // Start with the area from fusion result (if available)
    let baseArea = {
      latitude: context.location?.latitude || 20.5937,
      longitude: context.location?.longitude || 78.9629,
      radiusMeters: 5000 // Default 5km radius
    };
    
    // Try to get more precise area from fusion result details
    if (fusionResult.signalDetails) {
      // Look for location information in various signals
      const signals = [fusionResult.signalDetails.ruleBased,
                      fusionResult.signalDetails.mlPrediction,
                      fusionResult.signalDetails.socialMedia,
                      fusionResult.signalDetails.crowdReport];
      
      for (const signal of signals) {
        if (signal && signal.location) {
          baseArea = {
            latitude: signal.location.latitude,
            longitude: signal.location.longitude,
            radiusMeters: signal.location.accuracy || 5000
          };
          break;
        }
      }
    }
    
    // Apply expansion based on severity and policy
    const expansionFactor = policies.areaExpansion[baseArea.severity || 'INFO'] || 0;
    const expandedRadius = baseArea.radiusMeters * (1 + expansionFactor);
    
    return {
      center: {
        latitude: baseArea.latitude,
        longitude: baseArea.longitude
      },
      radiusMeters: parseFloat(expandedRadius.toFixed(0)),
      radiusKm: parseFloat((expandedRadius / 1000).toFixed(2)),
      expansionApplied: expansionFactor > 0,
      expansionFactor: expansionFactor,
      description: `${parseFloat((expandedRadius / 1000).toFixed(2))}km radius around ${baseArea.latitude.toFixed(4)}, ${baseArea.longitude.toFixed(4)}`
    };
  }

  /**
   * Select channels to use based on severity and policy
   * @param {string} severity - Alert severity level
   * @param {Object} policies - Decision policies
   * @returns {Array} List of channels to use
   */
  selectChannels(severity, policies) {
    // Get channels for this severity level
    const channels = policies.channelRules[severity] || policies.channelRules.INFO || ['DASHBOARD'];
    
    // In a real system, we might further filter based on:
    // - Channel availability
    // - Geographic coverage of channels
    // - Time of day (some channels less effective at night)
    // - Language capabilities of channels
    
    return [...new Set(channels)]; // Remove duplicates
  }

  /**
   * Select languages to use based on location and policy
   * @param {Object} location - Location information
   * @param {Object} policies - Decision policies
   * @returns {Array} List of language codes to use
   */
  selectLanguages(location, policies) {
    // Determine jurisdiction
    const jurisdiction = this.determineJurisdiction(location);
    
    // Get language rules for this jurisdiction
    const langRules = policies.languageRules[jurisdiction] || policies.languageRules.default || ['en'];
    
    return [...new Set(langRules)]; // Remove duplicates
  }

  /**
   * Determine alert priority
   * @param {number} confidence - Confidence percentage
   * @param {string} severity - Severity level
   * @param {Object} policies - Decision policies
   * @returns {number} Priority level (1=highest, 5=lowest)
   */
  determinePriority(confidence, severity, policies) {
    // Map severity to priority
    const severityToPriority = {
      EMERGENCY: 1,
      ALERT: 2,
      WARNING: 3,
      INFO: 4
    };
    
    let priority = severityToPriority[severity] || 4;
    
    // Adjust priority based on confidence (higher confidence = higher priority)
    if (confidence >= 90) {
      priority = Math.max(1, priority - 1); // Boost priority
    } else if (confidence < 50) {
      priority = Math.min(5, priority + 1); // Reduce priority
    }
    
    return priority;
  }

  /**
   * Determine if this requires immediate escalation
   * @param {number} confidence - Confidence percentage
   * @param {string} severity - Severity level
   * @param {Object} policies - Decision policies
   * @returns {boolean} True if immediate escalation required
   */
  requiresEscalation(confidence, severity, policies) {
    // Escalate for high confidence emergencies
    if (severity === 'EMERGENCY' && confidence >= 85) {
      return true;
    }
    
    // Escalate for multiple high-confidence sources
    const highConfSources = (fusionResult.contributingSources || []).filter(
      source => source !== null
    ).length;
    
    if (highConfSources >= 3 && confidence >= 70) {
      return true;
    }
    
    // Escalate for specific disaster types in sensitive areas
    // (This would be more sophisticated in reality)
    
    return false;
  }

  /**
   * Create a decision to take no action
   * @param {Object} fusionResult - Original fusion result
   * @param {Object} context - Context information
   * @param {string} reason - Reason for no action
   * @returns {Object} No action decision
   */
  createNoActionDecision(fusionResult, context, reason) {
    return {
      ...fusionResult,
      decisionEngine: 'E10_AlertDecision',
      decisionTimestamp: Date.now(),
      action: 'NONE',
      status: 'NO_ACTION',
      reason: reason,
      engine: 'E10_AlertDecision'
    };
  }

  /**
   * Create a decision to suppress duplicate alert
   * @param {Object} fusionResult - Original fusion result
   * @param {Object} context - Context information
   * @param {Object} duplicateCheck - Duplicate check result
   * @returns {Object} Duplicate suppressed decision
   */
  createDuplicateSuppressedDecision(fusionResult, context, duplicateCheck) {
    return {
      ...fusionResult,
      decisionEngine: 'E10_AlertDecision',
      decisionTimestamp: Date.now(),
      action: 'SUPPRESS_DUPLICATE',
      status: 'DUPLICATE_SUPPRESSED',
      reason: duplicateCheck.reason,
      duplicateInfo: duplicateCheck,
      engine: 'E10_AlertDecision'
    };
  }

  /**
   * Create a decision due to rate limiting
   * @param {Object} fusionResult - Original fusion result
   * @param {Object} context - Context information
   * @param {Object} rateLimitCheck - Rate limit check result
   * @returns {Object} Rate limited decision
   */
  createRateLimitedDecision(fusionResult, context, rateLimitCheck) {
    return {
      ...fusionResult,
      decisionEngine: 'E10_AlertDecision',
      decisionTimestamp: Date.now(),
      action: 'RATE_LIMITED',
      status: 'RATE_LIMITED',
      reason: rateLimitCheck.reason,
      rateLimitInfo: rateLimitCheck,
      engine: 'E10_AlertDecision'
    };
  }

  /**
   * Record this decision in history and update rate limiting
   * @param {Object} alertProperties - Final alert properties
   */
  recordDecision(alertProperties) {
    const { severity, location = {}, timestamp = Date.now() } = alertProperties;
    
    // Record in alert history for duplicate detection
    const lat = Math.round((location.latitude || 0) * 100) / 100;
    const lon = Math.round((location.longitude || 0) * 100) / 100;
    const alertKey = `${lat}:${lon}:${severity}`;
    
    this.alertHistory.set(alertKey, {
      timestamp: timestamp,
      severity: severity,
      location: location
    });
    
    // Limit history size
    if (this.alertHistory.size > this.maxHistory) {
      // Remove oldest entries
      const keys = Array.from(this.alertHistory.keys());
      const oldestKeys = keys.slice(0, this.alertHistory.size - this.maxHistory);
      for (const key of oldestKeys) {
        this.alertHistory.delete(key);
      }
    }
    
    // Update channel usage for rate limiting
    for (const channel of alertProperties.channels || []) {
      if (this.rateLimits[channel]) {
        this.channelUsage[channel].push(timestamp);
      }
    }
  }

  /**
   * Get engine statistics
   * @returns {Object} Engine statistics
   */
  getStatistics() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Count decisions by action in last hour
    const recentDecisions = Array.from(this.alertHistory.values())
      .filter(decision => decision.timestamp > oneHourAgo);
    
    const actionCounts = {};
    recentDecisions.forEach(decision => {
      // We don't store the action in history, but we could enhance this
      actionCounts[decision.severity] = (actionCounts[decision.severity] || 0) + 1;
    });
    
    // Channel usage stats
    const channelStats = {};
    for (const channel in this.channelUsage) {
      const recentUsage = this.channelUsage[channel]
        .filter(timestamp => timestamp > oneHourAgo);
      channelStats[channel] = {
        usageLastHour: recentUsage.length,
        limitPerHour: this.rateLimits[channel]?.maxPerHour || 0,
        utilization: this.rateLimits[channel] 
          ? (recentUsage.length / this.rateLimits[channel].maxPerHour * 100)
          : 0
      };
    };
    
    return {
      decisionsLastHour: recentDecisions.length,
      decisionsToday: Array.from(this.alertHistory.values())
        .filter(d => d.timestamp > oneDayAgo).length,
      alertHistorySize: this.alertHistory.size,
      actionDistribution: actionCounts,
      channelUsage: channelStats,
      timestamp: now
    };
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      engine: 'E10_AlertDecision',
      initialized: this.isInitialized,
      decisionPoliciesLoaded: Object.keys(this.decisionPolicies).length,
      rateLimitsConfigured: Object.keys(this.rateLimits).length,
      alertHistorySize: this.alertHistory.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set up logging (simplified version)
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    if (__DEV__) {
      console.log(`[E10_AlertDecision][${level.toUpperCase()}] ${message}`, metadata);
    }
    // In production, might send to centralized logging
  }

  /**
   * Update engine status in storage
   */
  async updateEngineStatus(engineId, status) {
    try {
      // In real implementation, would use AsyncStorage or similar
      // For now, just log
      this.log('info', `Engine ${engineId} status updated to ${status}`);
    } catch (error) {
      this.log('warn', `Could not update engine status: ${error.message}`);
    }
  }

  /**
   * Shutdown the alert decision engine
   */
  async shutdown() {
    this.log('info', 'Shutting down Alert Decision Engine');
    this.isInitialized = false;
    return true;
  }
}

// Export singleton instance
const alertDecisionEngine = new AlertDecisionEngine();
export default alertDecisionEngine;