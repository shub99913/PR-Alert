
/**
 * E09: Fusion & Confidence Engine
 * Adapted for React Native/Expo mobile environment
 * 
 * Responsibilities:
 * - Combine rule output + ML predictions + crowd reports + social signals
 * - Assign confidence score to disaster candidates
 * - Only pass high-confidence candidates forward
 * - Reduce false alarms through cross-validation
 * - Implement the "jury" function from the architecture
 */

class FusionConfidenceEngine {
  constructor() {
    this.isInitialized = false;
    this.fusionMethods = ['weightedAverage', 'bayesian', 'dempsterShafer'];
    this.currentMethod = 'weightedAverage'; // Default fusion method
    this.weights = {
      ruleBased: 0.25,      // E07: Rule-Based Detection
      mlPrediction: 0.35,   // E08: ML Prediction Engine
      socialMedia: 0.25,    // E06: Social Media Stream
      crowdReport: 0.15     // E16: Crowd Report Engine (will be implemented later)
    };
    this.confidenceThresholds = {
      low: 30,    // Below this: discard
      medium: 50, // Medium confidence: monitor
      high: 70,   // High confidence: alert candidate
      veryHigh: 85 // Very high: immediate action
    };
    this.recentFusions = new Map(); // Track recent fusion results for temporal consistency
    this.maxRecentFusions = 100;
    
    // Initialize immediately
    this.initialize();
  }

  /**
   * Initialize the fusion and confidence engine
   * Sets up fusion methods and weights
   */
  async initialize() {
    try {
      // Load fusion configuration (weights, thresholds, etc.)
      await this.loadFusionConfiguration();
      
      this.isInitialized = true;
      this.log('info', 'Fusion & Confidence Engine (E09) initialized successfully');
      
      // Update engine status
      await this.updateEngineStatus('E09', 'active');
      
      return true;
    } catch (error) {
      this.log('error', `Failed to initialize Fusion & Confidence: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load fusion configuration
   * In production, this might come from remote config or tuning
   */
  async loadFusionConfiguration() {
    // Default weights based on documented reliability
    # These weights could be tuned based on historical performance
    this.weights = {
      ruleBased: 0.20,      // E07: Good baseline, explainable
      mlPrediction: 0.40,   // E08: Highest potential accuracy
      socialMedia: 0.25,    // E06: Real-time but noisy
      crowdReport: 0.15     // E16: Ground truth validation
    };
    
    # Ensure weights sum to 1.0
    const totalWeight = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      # Normalize weights
      for (const key in this.weights) {
        this.weights[key] = this.weights[key] / totalWeight;
      }
    }
    
    this.log('info', `Loaded fusion configuration with weights: ${JSON.stringify(this.weights)}`);
  }

  /**
   * Fuse multiple signals to produce a unified confidence score
   * @param {Object} signals - Object containing signals from different sources
   * @returns {Object} Fused result with confidence, severity, and recommendation
   */
  async fuseSignals(signals) {
    if (!this.isInitialized) {
      throw new Error('Fusion engine not initialized');
    }
    
    this.log('info', 'Fusing signals from multiple sources...');
    
    # Extract signals from different engines
    const ruleSignal = signals.ruleBased || null;      // From E07
    const mlSignal = signals.mlPrediction || null;     // From E08
    const socialSignal = signals.socialMedia || null;  // From E06
    const crowdSignal = signals.crowdReport || null;   // From E16 (placeholder for now)
    
    # Validate that we have at least one signal
    const hasSignals = [ruleSignal, mlSignal, socialSignal, crowdSignal].some(s => s !== null);
    if (!hasSignals) {
      this.log('warn', 'No signals provided for fusion');
      return this.createNoSignalResult();
    }
    
    # Perform fusion based on selected method
    let fusedResult;
    switch (this.currentMethod) {
      case 'weightedAverage':
        fusedResult = this.fuseWeightedAverage(ruleSignal, mlSignal, socialSignal, crowdSignal);
        break;
      case 'bayesian':
        fusedResult = this.fuseBayesian(ruleSignal, mlSignal, socialSignal, crowdSignal);
        break;
      case 'dempsterShafer':
        fusedResult = this.fuseDempsterShafer(ruleSignal, mlSignal, socialSignal, crowdSignal);
        break;
      default:
        fusedResult = this.fuseWeightedAverage(ruleSignal, mlSignal, socialSignal, crowdSignal);
    }
    
    # Apply temporal consistency check
    fusedResult = this.applyTemporalConsistency(fusedResult);
    
    # Determine final recommendation
    fusedResult.recommendation = this.makeRecommendation(fusedResult);
    
    # Log the fusion result
    this.log('info', `Fusion complete: confidence=${fusedResult.confidence.toFixed(1)}%, severity=${fusedResult.severity}, recommendation=${fusedResult.recommendation}`);
    
    # Store in recent fusions for temporal consistency
    this.storeRecentFusion(fusedResult);
    
    return fusedResult;
  }

  /**
   * Fuse signals using weighted average method
   * @returns {Object} Fused result
   */
  fuseWeightedAverage(ruleSignal, mlSignal, socialSignal, crowdSignal) {
    # Initialize accumulators
    let totalWeight = 0;
    let weightedConfidenceSum = 0;
    let severityVotes = { INFO: 0, WARNING: 0, ALERT: 0, EMERGENCY: 0 };
    let contributingSources = [];
    
    # Process rule-based signal (E07)
    if (ruleSignal && ruleSignal.confidence !== undefined) {
      const weight = this.weights.ruleBased;
      totalWeight += weight;
      weightedConfidenceSum += ruleSignal.confidence * weight;
      
      if (ruleSignal.severity) {
        severityVotes[ruleSignal.severity] = (severityVotes[ruleSignal.severity] || 0) + 1;
      }
      contributingSources.push('ruleBased');
      this.log('debug', `Rule signal: ${ruleSignal.confidence}% confidence, ${ruleSignal.severity} severity`);
    }
    
    # Process ML prediction signal (E08)
    if (mlSignal && mlSignal.confidence !== undefined) {
      const weight = this.weights.mlPrediction;
      totalWeight += weight;
      weightedConfidenceSum += mlSignal.confidence * weight;
      
      if (mlSignal.severity) {
        severityVotes[mlSignal.severity] = (severityVotes[mlSignal.severity] || 0) + 1;
      }
      contributingSources.push('mlPrediction');
      this.log('debug', `ML signal: ${mlSignal.confidence}% confidence, ${mlSignal.severity} severity`);
    }
    
    # Process social media signal (E06)
    if (socialSignal && socialSignal.confidence !== undefined) {
      const weight = this.weights.socialMedia;
      totalWeight += weight;
      weightedConfidenceSum += socialSignal.confidence * weight;
      
      if (socialSignal.severity) {
        severityVotes[socialSignal.severity] = (severityVotes[socialSignal.severity] || 0) + 1;
      }
      contributingSources.push('socialMedia');
      this.log('debug', `Social signal: ${socialSignal.confidence}% confidence, ${socialSignal.severity} severity`);
    }
    
    # Process crowd report signal (E16)
    if (crowdSignal && crowdSignal.confidence !== undefined) {
      const weight = this.weights.crowdReport;
      totalWeight += weight;
      weightedConfidenceSum += crowdSignal.confidence * weight;
      
      if (crowdSignal.severity) {
        severityVotes[crowdSignal.severity] = (severityVotes[crowdSignal.severity] || 0) + 1;
      }
      contributingSources.push('crowdReport');
      this.log('debug', `Crowd signal: ${crowdSignal.confidence}% confidence, ${crowdSignal.severity} severity`);
    }
    
    # Avoid division by zero
    if (totalWeight === 0) {
      return this.createNoSignalResult();
    }
    
    # Calculate final confidence
    const finalConfidence = weightedConfidenceSum / totalWeight;
    
    # Determine final severity (highest vote wins, with emergency > alert > warning > info)
    const severityOrder = ['EMERGENCY', 'ALERT', 'WARNING', 'INFO'];
    let finalSeverity = 'INFO';
    for (const severity of severityOrder) {
      if (severityVotes[severity] > 0) {
        finalSeverity = severity;
        break;
      }
    }
    
    # Calculate agreement level (how many sources agree on severity)
    const maxVotes = Math.max(...Object.values(severityVotes));
    const totalSources = contributingSources.length;
    const agreementLevel = totalSources > 0 ? maxVotes / totalSources : 0;
    
    # Apply agreement bonus/penalty
    let agreementAdjustedConfidence = finalConfidence;
    if (agreementLevel >= 0.75) { # Strong agreement
      agreementAdjustedConfidence = Math.min(100, finalConfidence + 10);
    } else if (agreementLevel <= 0.25) { # Strong disagreement
      agreementAdjustedConfidence = Math.max(0, finalConfidence - 15);
    }
    
    # Calculate uncertainty based on signal variance
    const signalConfidences = [];
    if (ruleSignal && ruleSignal.confidence !== undefined) signalConfidences.push(ruleSignal.confidence);
    if (mlSignal && mlSignal.confidence !== undefined) signalConfidences.push(mlSignal.confidence);
    if (socialSignal && socialSignal.confidence !== undefined) signalConfidences.push(socialSignal.confidence);
    if (crowdSignal && crowdSignal.confidence !== undefined) signalConfidences.push(crowdSignal.confidence);
    
    let uncertainty = 0;
    if (signalConfidences.length > 1) {
      const meanConfidence = signalConfidences.reduce((sum, c) => sum + c, 0) / signalConfidences.length;
      const variance = signalConfidences.reduce((sum, c) => sum + Math.pow(c - meanConfidence, 2), 0) / signalConfidences.length;
      uncertainty = Math.min(20, Math.sqrt(variance) * 2); # Scale uncertainty
    }
    
    # Final confidence with uncertainty adjustment
    let finalAdjustedConfidence = agreementAdjustedConfidence - uncertainty;
    finalAdjustedConfidence = Math.max(0, Math.min(100, finalAdjustedConfidence));
    
    return {
      confidence: parseFloat(finalAdjustedConfidence.toFixed(1)),
      severity: finalSeverity,
      contributingSources: contributingSources,
      signalDetails: {
        ruleBased: ruleSignal ? { confidence: ruleSignal.confidence, severity: ruleSignal.severity } : null,
        mlPrediction: mlSignal ? { confidence: mlSignal.confidence, severity: mlSignal.severity } : null,
        socialMedia: socialSignal ? { confidence: socialSignal.confidence, severity: socialSignal.severity } : null,
        crowdReport: crowdSignal ? { confidence: crowdSignal.confidence, severity: crowdSignal.severity } : null
      },
      fusionMethod: 'weightedAverage',
      agreementLevel: parseFloat((agreementLevel * 100).toFixed(1)),
      uncertainty: parseFloat(uncertainty.toFixed(1)),
      timestamp: Date.now(),
      engine: 'E09_FusionConfidence'
    };
  }

  /**
   * Fuse signals using Bayesian method (simplified)
   * @returns {Object} Fused result
   */
  fuseBayesian(ruleSignal, mlSignal, socialSignal, crowdSignal) {
    # For simplicity, we'll use a simplified Bayesian approach
    # In reality, this would require prior probabilities and likelihood functions
    
    # Start with prior probability of disaster (low base rate)
    let posteriorProbability = 0.05; # 5% prior
    
    # Likelihood ratios for each signal source (simplified)
    const likelihoodRatios = {
      ruleBased: 3.0,      // Rule-based detection is moderately informative
      mlPrediction: 5.0,   # ML prediction is highly informative
      socialMedia: 2.0,    // Social media is somewhat informative but noisy
      crowdReport: 4.0     # Crowd reports are very informative (ground truth)
    };
    
    # Update probability with each signal
    let signalsProcessed = 0;
    
    if (ruleSignal && ruleSignal.confidence !== undefined) {
      # Convert confidence to likelihood ratio
      const lr = likelihoodRatios.ruleBased * (ruleSignal.confidence / 100);
      posteriorProbability = (posteriorProbability * lr) / (posteriorProbability * lr + (1 - posteriorProbability));
      signalsProcessed++;
    }
    
    if (mlSignal && mlSignal.confidence !== undefined) {
      const lr = likelihoodRatios.mlPrediction * (mlSignal.confidence / 100);
      posteriorProbability = (posteriorProbability * lr) / (posteriorProbability * lr + (1 - posteriorProbability));
      signalsProcessed++;
    }
    
    if (socialSignal && socialSignal.confidence !== undefined) {
      const lr = likelihoodRatios.socialMedia * (socialSignal.confidence / 100);
      posteriorProbability = (posteriorProbability * lr) / (posteriorProbability * lr + (1 - posteriorProbability));
      signalsProcessed++;
    }
    
    if (crowdSignal && crowdSignal.confidence !== undefined) {
      const lr = likelihoodRatios.crowdReport * (crowdSignal.confidence / 100);
      posteriorProbability = (posteriorProbability * lr) / (posteriorProbability * lr + (1 - posteriorProbability));
      signalsProcessed++;
    }
    
    # If no signals processed, return low confidence
    if (signalsProcessed === 0) {
      return this.createNoSignalResult();
    }
    
    # Convert probability to confidence percentage
    const confidence = posteriorProbability * 100;
    
    # Determine severity based on highest severity signal
    let finalSeverity = 'INFO';
    const severityOrder = ['EMERGENCY', 'ALERT', 'WARNING', 'INFO'];
    const allSignals = [ruleSignal, mlSignal, socialSignal, crowdSignal];
    
    for (const severity of severityOrder) {
      for (const signal of allSignals) {
        if (signal && signal.severity === severity) {
          finalSeverity = severity;
          break;
        }
      }
      if (finalSeverity !== 'INFO') break;
    }
    
    return {
      confidence: parseFloat(confidence.toFixed(1)),
      severity: finalSeverity,
      contributingSources: allSignals
        .filter(s => s !== null && s.confidence !== undefined)
        .map((s, i) => ['ruleBased', 'mlPrediction', 'socialMedia', 'crowdReport'][i]),
      signalDetails: {
        ruleBased: ruleSignal ? { confidence: ruleSignal.confidence, severity: ruleSignal.severity } : null,
        mlPrediction: mlSignal ? { confidence: mlSignal.confidence, severity: mlSignal.severity } : null,
        socialMedia: socialSignal ? { confidence: socialSignal.confidence, severity: socialSignal.severity } : null,
        crowdReport: crowdSignal ? { confidence: crowdSignal.confidence, severity: crowdSignal.severity } : null
      },
      fusionMethod: 'bayesian',
      timestamp: Date.now(),
      engine: 'E09_FusionConfidence'
    };
  }

  /**
   * Fuse signals using Dempster-Shafer theory (simplified)
   * @returns {Object} Fused result
   */
  fuseDempsterShafer(ruleSignal, mlSignal, socialSignal, crowdSignal) {
    # Simplified Dempster-Shafer implementation
    # In reality, this would involve mass functions and belief/plausibility intervals
    
    # For now, we'll fall back to weighted average with a note
    this.log('debug', 'Using simplified Dempster-Shafer (falling back to weighted average)');
    return this.fuseWeightedAverage(ruleSignal, mlSignal, socialSignal, crowdSignal);
  }

  /**
   * Apply temporal consistency check to reduce false positives
   * @param {Object} fusionResult - Result from fusion
   * @returns {Object} Temporally consistent result
   */
  applyTemporalConsistency(fusionResult) {
    # Skip if result is very low confidence (likely noise)
    if (fusionResult.confidence < this.confidenceThresholds.low) {
      return fusionResult;
    }
    
    # Check recent similar events to boost confidence for persistent threats
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    # Get recent fusions from last hour
    const recentFusions = Array.from(this.recentFusions.values())
      .filter(fusion => fusion.timestamp > oneHourAgo);
    
    if (recentFusions.length === 0) {
      # No recent events, return as-is
      return fusionResult;
    }
    
    # Check for similar events (same type, nearby location)
    # For simplicity, we'll just check if we've had any recent high-confidence events
    const recentHighConfidence = recentFusions
      .filter(f => f.confidence >= this.confidenceThresholds.high);
    
    let consistencyBonus = 0;
    if (recentHighConfidence.length > 0) {
      # Boost confidence if we've seen similar high-confidence events recently
      consistencyBonus = Math.min(10, recentHighConfidence.length * 2);
    }
    
    # Apply consistency bonus
    const adjustedConfidence = Math.min(100, fusionResult.confidence + consistencyBonus);
    
    # Also apply a small penalty for isolated events (might be false positives)
    if (recentFusions.length === 0 && fusionResult.confidence > this.confidenceThresholds.medium) {
      const isolationPenalty = 5;
      adjustedConfidence = Math.max(0, adjustedConfidence - isolationPenalty);
    }
    
    return {
      ...fusionResult,
      confidence: parseFloat(adjustedConfidence.toFixed(1)),
      temporalConsistencyBonus: consistencyBonus,
      recentSimilarEvents: recentHighConfidence.length
    };
  }

  /**
   * Make recommendation based on fused confidence and severity
   * @param {Object} fusionResult - Result from fusion
   * @returns {Object} Recommendation object
   */
  makeRecommendation(fusionResult) {
    const { confidence, severity } = fusionResult;
    
    # Define action thresholds
    if (confidence >= this.confidenceThresholds.veryHigh) {
      return {
        action: 'IMMEDIATE_ALERT',
        description: 'Issue immediate alert via all channels',
        urgency: 'CRITICAL',
        channels: ['SACHET', 'SMS', 'PUSH', 'EMAIL', 'SOCIAL'],
        priority: 1
      };
    } else if (confidence >= this.confidenceThresholds.high) {
      return {
        action: 'ISSUE_ALERT',
        description: 'Issue alert via official channels',
        urgency: 'HIGH',
        channels: ['SACHET', 'SMS', 'PUSH'],
        priority: 2
      };
    } else if (confidence >= this.confidenceThresholds.medium) {
      return {
        action: 'MONITOR_CLOSELY',
        description: 'Increase monitoring frequency, prepare alert',
        urgency: 'MEDIUM',
        channels: ['INTERNAL_MONITORING'],
        priority: 3
      };
    } else if (confidence >= this.confidenceThresholds.low) {
      return {
        action: 'LOG_AND_MONITOR',
        description: 'Log event, continue normal monitoring',
        urgency: 'LOW',
        channels: ['INTERNAL_LOGGING'],
        priority: 4
      };
    } else {
      return {
        action: 'DISCARD',
        description: 'Discard as low confidence/noise',
        urgency: 'NONE',
        channels: [],
        priority: 5
      };
    }
  }

  /**
   * Create result for when no signals are available
   * @returns {Object} No signal result
   */
  createNoSignalResult() {
    return {
      confidence: 0,
      severity: 'INFO',
      contributingSources: [],
      signalDetails: {
        ruleBased: null,
        mlPrediction: null,
        socialMedia: null,
        crowdReport: null
      },
      fusionMethod: 'none',
      agreementLevel: 0,
      uncertainty: 0,
      timestamp: Date.now(),
      engine: 'E09_FusionConfidence',
      recommendation: {
        action: 'WAIT_FOR_SIGNALS',
        description: 'Waiting for input signals from detection engines',
        urgency: 'NONE',
        channels: [],
        priority: 0
      }
    };
  }

  /**
   * Store fusion result in recent history for temporal consistency
   * @param {Object} fusionResult - Result to store
   */
  storeRecentFusion(fusionResult) {
    # Create a key for this fusion (could be based on location, time, etc.)
    # For simplicity, we'll use timestamp-based key
    const key = `fusion_${fusionResult.timestamp}`;
    
    # Store the result
    this.recentFusions.set(key, fusionResult);
    
    # Limit the size of recent fusions
    if (this.recentFusions.size > this.maxRecentFusions) {
      # Remove oldest entries
      const keys = Array.from(this.recentFusions.keys());
      const keysToRemove = keys.slice(0, this.recentFusions.size - this.maxRecentFusions);
      for (const key of keysToRemove) {
        this.recentFusions.delete(key);
      }
    }
  }

  /**
   * Update fusion method
   * @param {string} method - Fusion method to use ('weightedAverage', 'bayesian', 'dempsterShafer')
   */
  setFusionMethod(method) {
    if (this.fusionMethods.includes(method)) {
      this.currentMethod = method;
      this.log('info', `Fusion method changed to: ${method}`);
    } else {
      this.log('warn', `Unknown fusion method: ${method}. Available: ${this.fusionMethods.join(', ')}`);
    }
  }

  /**
   * Update weights for fusion
   * @param {Object} newWeights - New weight values
   */
  setWeights(newWeights) {
    # Validate weights
    const totalWeight = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      this.log('warn', `Weights must sum to 1.0. Current sum: ${totalWeight}. Normalizing...`);
      
      # Normalize weights
      for (const key in newWeights) {
        if (this.weights[key] !== undefined) {
          this.weights[key] = newWeights[key] / totalWeight;
        }
      }
    } else {
      this.weights = { ...this.weights, ...newWeights };
    }
    
    this.log('info', `Updated fusion weights: ${JSON.stringify(this.weights)}`);
  }

  /**
   * Get engine statistics
   * @returns {Object} Engine statistics
   */
  getStatistics() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const recentFusions = Array.from(this.recentFusions.values())
      .filter(f => f.timestamp > oneDayAgo);
    
    const hourlyFusions = recentFusions.filter(f => f.timestamp > oneHourAgo);
    
    # Count recommendations by action
    const actionCounts = {};
    recentFusions.forEach(fusion => {
      const action = fusion.recommendation?.action || 'UNKNOWN';
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });
    
    # Average confidence
    const avgConfidence = recentFusions.length > 0
      ? recentFusions.reduce((sum, f) => sum + f.confidence, 0) / recentFusions.length
      : 0;
    
    return {
      totalFusionsToday: recentFusions.length,
      fusionsLastHour: hourlyFusions.length,
      averageConfidence: parseFloat(avgConfidence.toFixed(1)),
      actionDistribution: actionCounts,
      currentMethod: this.currentMethod,
      currentWeights: { ...this.weights },
      confidenceThresholds: { ...this.confidenceThresholds },
      timestamp: now
    };
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      engine: 'E09_FusionConfidence',
      initialized: this.isInitialized,
      fusionMethod: this.currentMethod,
      availableMethods: this.fusionMethods,
      currentWeights: { ...this.weights },
      confidenceThresholds: { ...this.confidenceThresholds },
      recentFusionsCount: this.recentFusions.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set up logging (simplified version)
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    if (__DEV__) {
      console.log(`[E09_Fusion][${level.toUpperCase()}] ${message}`, metadata);
    }
    # In production, might send to centralized logging
  }

  /**
   * Update engine status in storage
   */
  async updateEngineStatus(engineId, status) {
    try {
      # In real implementation, would use AsyncStorage or similar
      # For now, just log
      this.log('info', `Engine ${engineId} status updated to ${status}`);
    } catch (error) {
      this.log('warn', `Could not update engine status: ${error.message}`);
    }
  }

  /**
   * Shutdown the fusion and confidence engine
   */
  async shutdown() {
    this.log('info', 'Shutting down Fusion & Confidence Engine');
    this.isInitialized = false;
    return true;
  }
}

// Export singleton instance
const fusionEngine = new FusionConfidenceEngine();
export default fusionEngine;
