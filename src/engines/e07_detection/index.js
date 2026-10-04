
/**
 * E07: Rule-Based Detection Engine
 * Adapted for React Native/Expo mobile environment
 * 
 * Responsibilities:
 * - Apply simple if-then rules to detect disasters
 * - Fast, explainable detection mechanism
 * - Catches ~80% of events according to documentation
 * - Works as first line of detection before ML models
 * - Configurable rules for different disaster types
 */

class RuleBasedDetectionEngine {
  constructor() {
    this.isInitialized = false;
    this.rules = {} // Rules by disaster type
    this.ruleVersion = "1.0.0";
    this.stats = {
      totalProcessed: 0,
      alertsGenerated: 0,
      lastReset: Date.now()
    };
    
    // Initialize immediately
    this.initialize();
  }

  /**
   * Initialize the rule-based detection engine
   * Loads detection rules and prepares engine
   */
  async initialize() {
    try {
      // Load detection rules
      await this.loadDetectionRules();
      
      this.isInitialized = true;
      this.log('info', 'Rule-Based Detection Engine (E07) initialized successfully');
      
      // Update engine status
      await this.updateEngineStatus('E07', 'active');
      
      return true;
    } catch (error) {
      this.log('error', `Failed to initialize Rule-Based Detection: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load detection rules for various disaster types
   * In production, these might come from remote config or ML model metadata
   */
  async loadDetectionRules() {
    // Rule structure:
    // {
    //   conditions: [
    //     { field: 'property.magnitude', operator: '>=', value: 5.0 },
    //     { field: 'properties.depth', operator: '<', value: 70 } // shallow quakes
    //   ],
    //   severity: 'WARNING', // or function to calculate
    //   confidenceBoost: 20, // additional confidence % if rules match
    //   description: 'Human readable description'
    // }
    
    this.rules = {
      // EARTHQUAKE RULES
      earthquake: [
        {
          // Rule 1: Significant magnitude earthquake
          id: 'eq_magnitude_significant',
          description: 'Earthquake with magnitude >= 5.0',
          conditions: [
            { field: 'properties.magnitude', operator: '>=', value: 5.0 }
          ],
          severity: (props) => {
            const mag = props.magnitude || 0;
            if (mag >= 8.0) return 'EMERGENCY';
            if (mag >= 7.0) return 'ALERT';
            if (mag >= 6.0) return 'ALERT';
            if (mag >= 5.0) return 'WARNING';
            return 'INFO';
          },
          confidenceBoost: 25,
          enabled: true
        },
        {
          // Rule 2: Shallow earthquake (more dangerous)
          id: 'eq_shallow',
          description: 'Shallow earthquake (< 70km depth) with magnitude >= 4.5',
          conditions: [
            { field: 'properties.magnitude', operator: '>=', value: 4.5 },
            { field: 'properties.depth', operator: '<', value: 70 },
            { field: 'properties.depth', operator: '>=', value: 0 } // not negative
          ],
          severity: 'WARNING',
          confidenceBoost: 15,
          enabled: true
        },
        {
          // Rule 3: Felt earthquake (community reports)
          id: 'eq_felt',
          description: 'Earthquake felt by people (CDI >= 3) or has reported shaking',
          conditions: [
            { field: 'properties.cdi', operator: '>=', value: 3 },
            { field: 'properties.magnitude', operator: '>=', value: 3.0 }
          ],
          severity: 'WARNING',
          confidenceBoost: 20,
          enabled: true
        },
        {
          // Rule 4: Potential tsunami generator
          id: 'eq_tsunami_potential',
          description: 'Strong shallow earthquake that could generate tsunami',
          conditions: [
            { field: 'properties.magnitude', operator: '>=', value: 6.5 },
            { field: 'properties.depth', operator: '<', value: 50 },
            { field: 'properties.tsunami', operator: '===', value: 1 } // USGS tsunami flag
          ],
          severity: 'ALERT',
          confidenceBoost: 30,
          enabled: true
        }
      ],
      
      // FLOOD RULES
      flood: [
        {
          // Rule 1: Heavy rainfall indicator
          id: 'flood_heavy_rain',
          description: 'Extreme rainfall measurements indicating flood risk',
          conditions: [
            { field: 'properties.rainfall1h', operator: '>=', value: 50 }, // mm/hour
            { field: 'properties.rainfall3h', operator: '>=', value: 100 } // mm/3hours
          ],
          severity: 'WARNING',
          confidenceBoost: 20,
          enabled: true
        },
        {
          // Rule 2: River level threshold
          id: 'flood_river_level',
          description: 'River water level above danger mark',
          conditions: [
            { field: 'properties.riverLevel', operator: '>=', value: 4.0 }, // meters above normal
            { field: 'properties.riverLevelChange1h', operator: '>=', value: 0.5 } // rising fast
          ],
          severity: 'WARNING',
          confidenceBoost: 25,
          enabled: true
        },
        {
          // Rule 3: Coastal surge
          id: 'flood_coastal_surge',
          description: 'Coastal water level surge indicating storm surge or tsunami',
          conditions: [
            { field: 'properties.seaLevelRise', operator: '>=', value: 2.0 }, // meters
            { field: 'properties.windSpeed', operator: '>=', value: 20 }, // m/s
            { field: 'properties.location.latitude', operator: '<', value: 30 } // tropical/subtropical
          ],
          severity: 'ALERT',
          confidenceBoost: 30,
          enabled: true
        }
      ],
      
      // CYCLONE/HURRICANE/TYPHOON RULES
      cyclone: [
        {
          // Rule 1: Wind speed threshold
          id: 'cyclone_wind_speed',
          description: 'Sustained wind speeds indicating tropical storm/cyclone',
          conditions: [
            { field: 'properties.windSpeed', operator: '>=', value: 17.5 }, // m/s (~39 mph) - tropical storm
            { field: 'properties.windSpeed', operator: '<', value: 33 } // m/s (<74 mph) - not hurricane yet
          ],
          severity: 'WARNING',
          confidenceBoost: 20,
          enabled: true
        },
        {
          // Rule 2: Hurricane strength winds
          id: 'cyclone_hurricane_wind',
          description: 'Wind speeds at hurricane strength or above',
          conditions: [
            { field: 'properties.windSpeed', operator: '>=', value: 33 }, // m/s (~74 mph)
            { field: 'properties.pressure', operator: '<=', value: 1000 } // hPa (low pressure)
          ],
          severity: (props) => {
            const windSpeed = props.windSpeed || 0;
            if (windSpeed >= 50) return 'EMERGENCY'; // >112 mph
            if (windSpeed >= 40) return 'ALERT';     // >89 mph
            return 'WARNING';
          },
          confidenceBoost: 25,
          enabled: true
        },
        {
          // Rule 3: Rapid pressure drop (intensifying storm)
          id: 'cyclone_pressure_drop',
          description: 'Rapidly decreasing atmospheric pressure indicating intensifying storm',
          conditions: [
            { field: 'properties.pressureChange3h', operator: '<=', value: -6 }, // hPa drop in 3 hours
            { field: 'properties.windSpeed', operator: '>=', value: 20 }, // m/s
            { field: 'properties.temperatureDelta', operator: '>', value: 10 } // warm core
          ],
          severity: 'ALERT',
          confidenceBoost: 20,
          enabled: true
        }
      ],
      
      // WILDFIRE RULES
      wildfire: [
        {
          // Rule 1: High temperature + low humidity + wind
          id: 'wildfire_conditions',
          description: 'Critical fire weather conditions (hot, dry, windy)',
          conditions: [
            { field: 'properties.temperature', operator: '>=', value: 35 }, // Celsius
            { field: 'properties.humidity', operator: '<=', value: 20 }, // percent
            { field: 'properties.windSpeed', operator: '>=', value: 10 } // m/s
          ],
          severity: 'WARNING',
          confidenceBoost: 20,
          enabled: true
        },
        {
          // Rule 2: Fire radiative power
          id: 'wildfire_frp',
          description: 'High fire radiative power indicating large active fire',
          conditions: [
            { field: 'properties.fireRadiativePower', operator: '>=', value: 100 }, // MW
            { field: 'properties.confidence', operator: '>=', value: 50 } // existing confidence
          ],
          severity: 'ALERT',
          confidenceBoost: 25,
          enabled: true
        }
      ],
      
      // SOCIAL MEDIA SPECIFIC RULES
      social_media: [
        {
          // Rule 1: High confidence social media report with location
          id: 'social_verified_report',
          description: 'High confidence social media report with verifiable location',
          conditions: [
            { field: 'confidence', operator: '>=', value: 70 },
            { field: 'location.accuracy', operator: '<', value: 5000 }, // accurate to 5km
            { field: 'properties.followerCount', operator: '>=', value: 1000 } // credible source
          ],
          severity: 'WARNING',
          confidenceBoost: 15,
          enabled: true
        },
        {
          // Rule 2: Multiple independent reports (handled better in fusion engine)
          id: 'social_multiple_reports',
          description: 'Indicator for potential event needing fusion analysis',
          conditions: [
            { field: 'properties.hashtagCount', operator: '>=', value: 3 },
            { field: 'properties.mentionCount', operator: '>=', value: 2 },
            { field: 'confidence', operator: '>=', value: 40 }
          ],
          severity: 'INFO',
          confidenceBoost: 10,
          enabled: true,
          note: 'Better handled in fusion engine - rule for awareness'
        }
      ]
    };
    
    // Calculate total rules
    let totalRules = 0;
    for (const type in this.rules) {
      totalRules += this.rules[type].length;
    }
    this.log('info', `Loaded ${totalRules} detection rules across ${Object.keys(this.rules).length} disaster types`);
  }

  /**
   * Evaluate an event against all applicable rules
   * @param {Object} event - Normalized event object to evaluate
   * @returns {Object} { triggered: boolean, rulesMatched: Array, severity: string, confidenceBoost: number, description: string }
   */
  evaluateEvent(event) {
    if (!this.isInitialized) {
      throw new Error('Rule-based detection engine not initialized');
    }
    
    this.stats.totalProcessed++;
    
    const eventType = event.type;
    const applicableRules = this.rules[eventType] || [];
    
    let matchedRules = [];
    let maxSeverity = 'INFO';
    let totalConfidenceBoost = 0;
    let descriptions = [];
    
    // Evaluate each rule for this event type
    for (const rule of applicableRules) {
      if (!rule.enabled) {
        continue;
      }
      
      // Check if all conditions are met
      let allConditionsMet = true;
      let failedConditions = [];
      
      for (const condition of rule.conditions) {
        const conditionMet = this.evaluateCondition(event, condition);
        if (!conditionMet) {
          allConditionsMet = false;
          failedConditions.push({
            field: condition.field,
            operator: condition.operator,
            expected: condition.value,
            actual: this.getNestedValue(event, condition.field)
          });
        }
      }
      
      if (allConditionsMet) {
        matchedRules.push(rule);
        
        // Determine severity (could be fixed value or function)
        let ruleSeverity = rule.severity;
        if (typeof rule.severity === 'function') {
          ruleSeverity = rule.severity(event.properties || {});
        }
        
        // Update max severity (using severity hierarchy)
        const severityLevel = this.severityToLevel(ruleSeverity);
        const currentMaxLevel = this.severityToLevel(maxSeverity);
        if (severityLevel > currentMaxLevel) {
          maxSeverity = ruleSeverity;
        }
        
        // Add confidence boost
        totalConfidenceBoost += rule.confidenceBoost || 0;
        
        // Collect description
        if (rule.description) {
          descriptions.push(rule.description);
        }
      }
    }
    
    // Cap confidence boost at reasonable level (don't want to exceed 100%)
    const cappedConfidenceBoost = Math.min(totalConfidenceBoost, 50); // Max 50% boost from rules
    
    const triggered = matchedRules.length > 0;
    
    if (triggered) {
      this.stats.alertsGenerated++;
      this.log('info', `Rule-based detection triggered: ${matchedRules.length} rules matched for ${eventType} event`, {
        eventId: event.id,
        matchedRuleIds: matchedRules.map(r => r.id),
        severity: maxSeverity,
        confidenceBoost: cappedConfidenceBoost
      });
    }
    
    return {
      triggered: triggered,
      rulesMatched: matchedRules,
      severity: maxSeverity,
      confidenceBoost: cappedConfidenceBoost,
      description: descriptions.join('; '),
      stats: { ...this.stats }
    };
  }

  /**
   * Evaluate a single condition against an event
   * @param {Object} event - Event object
   * @param {Object} condition - Condition specification
   * @returns {boolean} True if condition is met
   */
  evaluateCondition(event, condition) {
    const actualValue = this.getNestedValue(event, condition.field);
    const expectedValue = condition.value;
    const operator = condition.operator;
    
    // Handle missing values
    if (actualValue === undefined || actualValue === null) {
      // Depending on operator, missing values might fail or pass
      if (operator === '===' || operator === '!==') {
        return operator === '!==' && expectedValue === null;
      }
      return false; // Most operators require actual values
    }
    
    // Perform comparison based on operator
    switch (operator) {
      case '===': return actualValue === expectedValue;
      case '!==': return actualValue !== expectedValue;
      case '>': return actualValue > expectedValue;
      case '>=': return actualValue >= expectedValue;
      case '<': return actualValue < expectedValue;
      case '<=': return actualValue <= expectedValue;
      case 'includes': 
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return actualValue.includes(expectedValue);
        }
        if (Array.isArray(actualValue)) {
          return actualValue.includes(expectedValue);
        }
        return false;
      case 'startsWith':
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return actualValue.startsWith(expectedValue);
        }
        return false;
      case 'endsWith':
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          return actualValue.endsWith(expectedValue);
        }
        return false;
      case 'matches': // Regex match
        if (typeof actualValue === 'string' && typeof expectedValue === 'string') {
          try {
            const regex = new RegExp(expectedValue);
            return regex.test(actualValue);
          } catch (e) {
            this.log('warn', `Invalid regex in condition: ${expectedValue}`);
            return false;
          }
        }
        return false;
      default:
        this.log('warn', `Unknown operator in condition: ${operator}`);
        return false;
    }
  }

  /**
   * Get a nested value from an object using dot notation
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot-separated path (e.g., 'properties.magnitude')
   * @returns {any} Value at the path or undefined if not found
   */
  getNestedValue(obj, path) {
    if (!obj || typeof path !== 'string') {
      return undefined;
    }
    
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * Convert severity string to numeric level for comparison
   * @param {string} severity - Severity string (INFO, WARNING, ALERT, EMERGENCY)
   * @returns {number} Numeric level (0-3)
   */
  severityToLevel(severity) {
    const levels = {
      'INFO': 0,
      'WARNING': 1,
      'ALERT': 2,
      'EMERGENCY': 3
    };
    return levels[severity] || 0;
  }

  /**
   * Get engine statistics
   * @returns {Object} Engine statistics
   */
  getStatistics() {
    const uptimeHours = (Date.now() - this.stats.lastReset) / (1000 * 60 * 60);
    
    return {
      ...this.stats,
      uptimeHours: parseFloat(uptimeHours.toFixed(2)),
      alertsPerHour: uptimeHours > 0 ? (this.stats.alertsGenerated / uptimeHours) : 0,
      triggerRate: this.stats.totalProcessed > 0 ? 
        (this.stats.alertsGenerated / this.stats.totalProcessed) : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStatistics() {
    this.stats = {
      totalProcessed: 0,
      alertsGenerated: 0,
      lastReset: Date.now()
    };
    this.log('info', 'Rule-based detection statistics reset');
  }

  /**
   * Add a custom rule (for runtime rule addition)
   * @param {string} eventType - Disaster type for the rule
   * @param {Object} rule - Rule object to add
   */
  addRule(eventType, rule) {
    if (!this.rules[eventType]) {
      this.rules[eventType] = [];
    }
    this.rules[eventType].push(rule);
    this.log('info', `Added custom rule for ${eventType}: ${rule.id || 'unnamed'}`);
  }

  /**
   * Enable or disable a rule by ID
   * @param {string} eventType - Disaster type
   * @param {string} ruleId - ID of the rule to toggle
   * @param {boolean} enabled - Whether to enable or disable
   */
  setRuleEnabled(eventType, ruleId, enabled) {
    const rules = this.rules[eventType] || [];
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      rule.enabled = enabled;
      this.log('info', `${enabled ? 'Enabled' : 'Disabled'} rule ${ruleId} for ${eventType}`);
    } else {
      this.log('warn', `Rule ${ruleId} not found for ${eventType}`);
    }
  }

  /**
   * Get engine status
   */
  getStatus() {
    const totalRules = Object.values(this.rules).flat().length;
    const enabledRules = Object.values(this.rules)
      .flat()
      .filter(rule => rule.enabled).length;
    
    return {
      engine: 'E07_RuleBasedDetection',
      initialized: this.isInitialized,
      ruleVersion: this.ruleVersion,
      totalRules: totalRules,
      enabledRules: enabledRules,
      disasterTypes: Object.keys(this.rules),
      stats: this.getStatistics(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set up logging (simplified version)
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    if (__DEV__) {
      console.log(`[E07_RuleDetection][${level.toUpperCase()}] ${message}`, metadata);
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
   * Shutdown the rule-based detection engine
   */
  async shutdown() {
    this.log('info', 'Shutting down Rule-Based Detection Engine');
    this.isInitialized = false;
    return true;
  }
}

// Export singleton instance
const ruleDetectionEngine = new RuleBasedDetectionEngine();
export default ruleDetectionEngine;
