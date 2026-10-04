// E16 Crowd Report Engine
// Citizen disaster reporting, crowdsourced verification, and community intelligence

/**
 * E16 Crowd Report Engine
 * Enables citizens to report disasters, hazards, and observations.
 * Includes verification, geolocation, media upload, and integration
 * with detection engines (E07, E08, E09).
 * 
 * Features:
 * - Multi-type report submission (disaster, hazard, observation, damage, need)
 * - Media attachments (photos, videos, audio)
 * - Geolocation with accuracy metadata
 * - Anonymous and authenticated reporting
 * - Crowd verification/voting
 * - Report clustering and deduplication
 * - Integration with E07 Rules, E08 ML, E09 Fusion
 * - Trust/reputation scoring for reporters
 * - Official validation workflow
 */

class CrowdReportEngine {
  constructor(config = {}) {
    this.config = {
      // Report types
      reportTypes: config.reportTypes || [
        'earthquake_feeling',     // Did you feel it?
        'flood_observation',      // Water level, flooding
        'landslide_sighting',     // Landslide observed
        'fire_outbreak',          // Fire/smoke observed
        'cyclone_damage',         // Wind damage, storm surge
        'infrastructure_damage',  // Building, road, bridge damage
        'utility_outage',         // Power, water, comms outage
        'evacuation_need',        // People need evacuation
        'medical_emergency',      // Medical help needed
        'supply_shortage',        // Food, water, medicine shortage
        'hazard_spotting',        // Crack, gas leak, chemical smell
        'traffic_disruption',     // Road blocked, accident
        'other'                   // Other observation
      ],
      
      // Severity levels for reports
      severityLevels: config.severityLevels || [
        'info',       // Informational
        'minor',      // Minor issue
        'moderate',   // Moderate concern
        'severe',     // Severe situation
        'critical'    // Life-threatening
      ],
      
      // Media settings
      media: {
        enabled: config.media?.enabled !== false,
        maxPhotos: config.media?.maxPhotos || 5,
        maxVideoDurationSec: config.media?.maxVideoDurationSec || 60,
        maxAudioDurationSec: config.media?.maxAudioDurationSec || 30,
        allowedFormats: config.media?.allowedFormats || ['image/jpeg', 'image/png', 'video/mp4', 'audio/m4a']
      },
      
      // Geolocation
      geolocation: {
        required: config.geolocation?.required !== false,
        minAccuracyMeters: config.geolocation?.minAccuracyMeters || 100,
        allowManualEntry: config.geolocation?.allowManualEntry !== false
      },
      
      // Verification
      verification: {
        enabled: config.verification?.enabled !== false,
        minVotesForVerified: config.verification?.minVotesForVerified || 3,
        trustedReporterThreshold: config.verification?.trustedReporterThreshold || 0.8,
        autoEscalateAfterVotes: config.verification?.autoEscalateAfterVotes || 5
      },
      
      // Clustering/deduplication
      clustering: {
        enabled: config.clustering?.enabled !== false,
        radiusMeters: config.clustering?.radiusMeters || 500,
        timeWindowMinutes: config.clustering?.timeWindowMinutes || 30,
        minReportsForCluster: config.clustering?.minReportsForCluster || 2
      },
      
      // Reporter reputation
      reputation: {
        enabled: config.reputation?.enabled !== false,
        initialScore: config.reputation?.initialScore || 50,
        maxScore: config.reputation?.maxScore || 100,
        minScore: config.reputation?.minScore || 0,
        decayRate: config.reputation?.decayRate || 0.99, // per day
        weights: {
          verifiedReport: config.reputation?.weights?.verifiedReport || 10,
          falseReport: config.reputation?.weights?.falseReport || -15,
          helpfulReport: config.reputation?.weights?.helpfulReport || 5,
          voteAgreement: config.reputation?.weights?.voteAgreement || 2,
          voteDisagreement: config.reputation?.weights?.voteDisagreement || -1
        }
      },
      
      // Integration
      integration: {
        e07Rules: config.integration?.e07Rules !== false,
        e08ML: config.integration?.e08ML !== false,
        e09Fusion: config.integration?.e09Fusion !== false,
        e10Decision: config.integration?.e10Decision !== false,
        e15Feedback: config.integration?.e15Feedback !== false
      }
    };

    // Storage
    this.reports = new Map(); // reportId -> report
    this.userReports = new Map(); // userId -> reportIds[]
    this.clusters = new Map(); // clusterId -> { reportIds, centroid, bounds }
    this.votes = new Map(); // reportId -> { userId -> vote }
    this.reporterScores = new Map(); // userId -> { score, history, level }
    this.verifiedReports = new Set(); // reportIds that are verified
    this.escalatedReports = new Set(); // reportIds escalated to official
    
    // Stats
    this.stats = {
      totalReports: 0,
      byType: {},
      bySeverity: {},
      verified: 0,
      clusters: 0,
      activeReporters: 0
    };
    
    console.log('[E16] Crowd Report Engine initialized');
    console.log(`  Report types: ${this.config.reportTypes.length}`);
    console.log(`  Clustering: ${this.config.clustering.enabled ? 'ENABLED' : 'DISABLED'} (${this.config.clustering.radiusMeters}m, ${this.config.clustering.timeWindowMinutes}min)`);
    console.log(`  Reputation: ${this.config.reputation.enabled ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  Verification: ${this.config.verification.enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  /**
   * Submit a crowd report
   */
  async submitReport(reportData) {
    const {
      userId,           // Optional for anonymous
      type,             // Required: one of reportTypes
      severity,         // Required: one of severityLevels
      location,         // Required: { lat, lon, accuracy?, address? }
      description,      // Required: text description
      timestamp = new Date().toISOString(),
      media = [],       // Array of { type: 'photo'|'video'|'audio', uri, metadata }
      contactInfo,      // Optional contact for follow-up
      anonymous = false,
      metadata = {}     // Additional structured data
    } = reportData;

    // Validate required fields
    if (!type || !severity || !location || !description) {
      throw new Error('Missing required fields: type, severity, location, description');
    }

    if (!this.config.reportTypes.includes(type)) {
      throw new Error(`Invalid report type: ${type}`);
    }

    if (!this.config.severityLevels.includes(severity)) {
      throw new Error(`Invalid severity: ${severity}`);
    }

    if (!location.lat || !location.lon) {
      throw new Error('Location must have lat and lon');
    }

    if (this.config.geolocation.required && location.accuracy && location.accuracy > this.config.geolocation.minAccuracyMeters) {
      console.warn(`[E16] Location accuracy ${location.accuracy}m exceeds minimum ${this.config.geolocation.minAccuracyMeters}m`);
    }

    // Validate media
    if (media.length > this.config.media.maxPhotos) {
      throw new Error(`Too many media items (max ${this.config.media.maxPhotos})`);
    }

    // Create report
    const reportId = `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const report = {
      id: reportId,
      userId: anonymous ? null : userId,
      anonymous,
      type,
      severity,
      location: {
        lat: location.lat,
        lon: location.lon,
        accuracy: location.accuracy,
        address: location.address
      },
      description,
      timestamp,
      media,
      contactInfo,
      metadata,
      status: 'submitted', // submitted, verified, rejected, escalated, resolved
      votes: { up: 0, down: 0, agree: 0, disagree: 0 },
      verification: {
        verified: false,
        verifiedBy: null,
        verifiedAt: null,
        voteCount: 0,
        consensus: null
      },
      clusterId: null,
      escalated: false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Store report
    this.reports.set(reportId, report);
    
    // Track user reports
    if (userId) {
      if (!this.userReports.has(userId)) {
        this.userReports.set(userId, []);
      }
      this.userReports.get(userId).push(reportId);
      
      // Initialize reputation if new
      if (!this.reporterScores.has(userId)) {
        this._initReporterScore(userId);
      }
    }

    // Update stats
    this.stats.totalReports++;
    this.stats.byType[type] = (this.stats.byType[type] || 0) + 1;
    this.stats.bySeverity[severity] = (this.stats.bySeverity[severity] || 0) + 1;
    
    // Check for clustering
    if (this.config.clustering.enabled) {
      await this._checkAndCreateCluster(report);
    }

    // Integrate with detection engines
    if (this.config.integration.e07Rules || this.config.integration.e08ML || this.config.integration.e09Fusion) {
      this._emitToDetectionEngines(report);
    }

    console.log(`[E16] Report submitted: ${reportId} (${type}, ${severity}) by ${anonymous ? 'anonymous' : userId}`);
    
    return { success: true, reportId };
  }

  /**
   * Initialize reporter reputation score
   */
  _initReporterScore(userId) {
    this.reporterScores.set(userId, {
      score: this.config.reputation.initialScore,
      history: [],
      level: this._calculateLevel(this.config.reputation.initialScore),
      totalReports: 0,
      verifiedReports: 0,
      falseReports: 0,
      helpfulVotes: 0
    });
  }

  /**
   * Calculate reputation level from score
   */
  _calculateLevel(score) {
    if (score >= 80) return 'expert';
    if (score >= 60) return 'trusted';
    if (score >= 40) return 'regular';
    if (score >= 20) return 'new';
    return 'unreliable';
  }

  /**
   * Update reporter score
   */
  _updateReporterScore(userId, action) {
    if (!this.config.reputation.enabled || !userId) return;
    
    const reporter = this.reporterScores.get(userId);
    if (!reporter) return;
    
    const weights = this.config.reputation.weights;
    let delta = 0;
    
    switch (action) {
      case 'verified_report': delta = weights.verifiedReport; break;
      case 'false_report': delta = weights.falseReport; break;
      case 'helpful_report': delta = weights.helpfulReport; break;
      case 'vote_agree': delta = weights.voteAgreement; break;
      case 'vote_disagree': delta = weights.voteDisagreement; break;
    }
    
    reporter.score = Math.max(this.config.reputation.minScore, 
      Math.min(this.config.reputation.maxScore, reporter.score + delta));
    reporter.level = this._calculateLevel(reporter.score);
    reporter.history.push({ action, delta, timestamp: new Date().toISOString(), score: reporter.score });
    
    // Keep last 100 history entries
    if (reporter.history.length > 100) {
      reporter.history = reporter.history.slice(-100);
    }
  }

  /**
   * Vote on a report (crowd verification)
   */
  async voteOnReport(reportId, userId, vote, confidence = 1.0) {
    // vote: 'agree' (confirm), 'disagree' (reject), 'up' (helpful), 'down' (not helpful)
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, error: 'Report not found' };
    }
    
    if (report.userId === userId) {
      return { success: false, error: 'Cannot vote on own report' };
    }
    
    if (!this.votes.has(reportId)) {
      this.votes.set(reportId, new Map());
    }
    
    const reportVotes = this.votes.get(reportId);
    const previousVote = reportVotes.get(userId);
    
    // Remove previous vote effect
    if (previousVote) {
      if (previousVote === 'agree') report.votes.agree--;
      else if (previousVote === 'disagree') report.votes.disagree--;
      else if (previousVote === 'up') report.votes.up--;
      else if (previousVote === 'down') report.votes.down--;
      
      // Update previous voter's reputation
      if (previousVote === 'agree' || previousVote === 'disagree') {
        this._updateReporterScore(userId, 'vote_disagree');
      }
    }
    
    // Apply new vote
    reportVotes.set(userId, vote);
    if (vote === 'agree') report.votes.agree++;
    else if (vote === 'disagree') report.votes.disagree++;
    else if (vote === 'up') report.votes.up++;
    else if (vote === 'down') report.votes.down--;
    
    report.verification.voteCount = report.votes.agree + report.votes.disagree;
    
    // Update reporter reputation
    if (vote === 'agree' || vote === 'disagree') {
      // Check if vote agrees with consensus
      const consensus = report.verification.consensus;
      if (consensus && ((consensus === 'confirmed' && vote === 'agree') || (consensus === 'rejected' && vote === 'disagree'))) {
        this._updateReporterScore(userId, 'vote_agree');
      } else {
        this._updateReporterScore(userId, 'vote_disagree');
      }
    }
    
    // Check for verification threshold
    if (this.config.verification.enabled && report.verification.voteCount >= this.config.verification.minVotesForVerified) {
      await this._checkVerificationConsensus(report);
    }
    
    // Check for auto-escalation
    if (report.verification.voteCount >= this.config.verification.autoEscalateAfterVotes) {
      await this._escalateReport(reportId, 'auto_escalation_votes');
    }
    
    report.updatedAt = new Date().toISOString();
    
    return { success: true, votes: report.votes, verification: report.verification };
  }

  /**
   * Check verification consensus
   */
  async _checkVerificationConsensus(report) {
    const totalVotes = report.votes.agree + report.votes.disagree;
    if (totalVotes === 0) return;
    
    const agreeRatio = report.votes.agree / totalVotes;
    
    if (agreeRatio >= 0.6) { // 60% agreement threshold
      report.verification.verified = true;
      report.verification.consensus = 'confirmed';
      report.verification.verifiedAt = new Date().toISOString();
      report.status = 'verified';
      this.verifiedReports.add(report.id);
      this.stats.verified++;
      
      // Update reporter reputation
      if (report.userId) {
        this._updateReporterScore(report.userId, 'verified_report');
        const reporter = this.reporterScores.get(report.userId);
        if (reporter) reporter.verifiedReports++;
      }
      
      // Emit to fusion engine
      if (this.config.integration.e09Fusion) {
        this._emitVerifiedReport(report);
      }
    } else if (agreeRatio <= 0.4) {
      report.verification.consensus = 'rejected';
      report.status = 'rejected';
      
      // Update reporter reputation negatively
      if (report.userId) {
        this._updateReporterScore(report.userId, 'false_report');
        const reporter = this.reporterScores.get(report.userId);
        if (reporter) reporter.falseReports++;
      }
    }
    
    console.log(`[E16] Verification consensus for ${report.id}: ${report.verification.consensus} (${(agreeRatio * 100).toFixed(1)}% agree)`);
  }

  /**
   * Escalate report to official channels
   */
  async _escalateReport(reportId, reason) {
    const report = this.reports.get(reportId);
    if (!report || report.escalated) return;
    
    report.escalated = true;
    report.status = 'escalated';
    report.escalationReason = reason;
    report.escalatedAt = new Date().toISOString();
    this.escalatedReports.add(reportId);
    
    console.log(`[E16] Report ${reportId} escalated: ${reason}`);
    
    // Would integrate with E14 CAP/SACHET for official alert
    if (this.config.integration.e10Decision) {
      this._emitEscalatedReport(report);
    }
  }

  /**
   * Get report by ID
   */
  getReport(reportId) {
    return this.reports.get(reportId);
  }

  /**
   * Get reports by user
   */
  getUserReports(userId) {
    const reportIds = this.userReports.get(userId) || [];
    return reportIds.map(id => this.reports.get(id)).filter(Boolean);
  }

  /**
   * Get reports in area
   */
  getReportsInArea(lat, lon, radiusMeters = 5000, timeWindowHours = 24) {
    const cutoff = Date.now() - timeWindowHours * 3600000;
    const results = [];
    
    for (const report of this.reports.values()) {
      const reportTime = new Date(report.timestamp).getTime();
      if (reportTime < cutoff) continue;
      
      const distance = this._haversine(lat, lon, report.location.lat, report.location.lon);
      if (distance <= radiusMeters) {
        results.push({ ...report, distance });
      }
    }
    
    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get reports by type
   */
  getReportsByType(type, limit = 100) {
    const results = [];
    for (const report of this.reports.values()) {
      if (report.type === type) {
        results.push(report);
        if (results.length >= limit) break;
      }
    }
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get verified reports
   */
  getVerifiedReports(limit = 100) {
    const results = [];
    for (const reportId of this.verifiedReports) {
      const report = this.reports.get(reportId);
      if (report) {
        results.push(report);
        if (results.length >= limit) break;
      }
    }
    return results.sort((a, b) => new Date(b.verification.verifiedAt).getTime() - new Date(a.verification.verifiedAt).getTime());
  }

  /**
   * Get clusters
   */
  getClusters() {
    return Array.from(this.clusters.values());
  }

  /**
   * Get reporter reputation
   */
  getReporterScore(userId) {
    return this.reporterScores.get(userId) || null;
  }

  /**
   * Get leaderboard
   */
  getLeaderboard(limit = 10) {
    return Array.from(this.reporterScores.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get engine stats
   */
  getStats() {
    return {
      ...this.stats,
      clusters: this.clusters.size,
      activeReporters: this.reporterScores.size,
      escalated: this.escalatedReports.size,
      verificationRate: this.stats.totalReports > 0 ? this.stats.verified / this.stats.totalReports : 0
    };
  }

  /**
   * Haversine distance
   */
  _haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = deg => deg * Math.PI / 180;
    const φ1 = toRad(lat1), φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1), Δλ = toRad(lon2 - lon1);
    const a = Math.sin(Δφ/2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  /**
   * Check and create cluster
   */
  async _checkAndCreateCluster(report) {
    const { radiusMeters, timeWindowMinutes, minReportsForCluster } = this.config.clustering;
    const timeWindowMs = timeWindowMinutes * 60000;
    const cutoff = Date.now() - timeWindowMs;
    
    // Find nearby reports
    const nearby = [];
    for (const [id, r] of this.reports) {
      if (r.id === report.id) continue;
      if (new Date(r.timestamp).getTime() < cutoff) continue;
      
      const distance = this._haversine(report.location.lat, report.location.lon, r.location.lat, r.location.lon);
      if (distance <= radiusMeters) {
        nearby.push({ report: r, distance });
      }
    }
    
    if (nearby.length + 1 >= minReportsForCluster) {
      // Create or update cluster
      const allReports = [report, ...nearby.map(n => n.report)];
      const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Calculate centroid
      const avgLat = allReports.reduce((sum, r) => sum + r.location.lat, 0) / allReports.length;
      const avgLon = allReports.reduce((sum, r) => sum + r.location.lon, 0) / allReports.length;
      
      // Calculate bounds
      const lats = allReports.map(r => r.location.lat);
      const lons = allReports.map(r => r.location.lon);
      
      const cluster = {
        id: clusterId,
        reportIds: allReports.map(r => r.id),
        centroid: { lat: avgLat, lon: avgLon },
        bounds: {
          north: Math.max(...lats),
          south: Math.min(...lats),
          east: Math.max(...lons),
          west: Math.min(...lons)
        },
        type: report.type,
        severity: this._calculateClusterSeverity(allReports),
        count: allReports.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Assign cluster to reports
      for (const r of allReports) {
        r.clusterId = clusterId;
      }
      
      this.clusters.set(clusterId, cluster);
      this.stats.clusters = this.clusters.size;
      
      console.log(`[E16] Cluster created: ${clusterId} with ${cluster.count} reports (${report.type})`);
      
      // Emit cluster to detection engines
      if (this.config.integration.e07Rules || this.config.integration.e08ML) {
        this._emitCluster(cluster);
      }
    }
  }

  /**
   * Calculate cluster severity
   */
  _calculateClusterSeverity(reports) {
    const severityOrder = { info: 0, minor: 1, moderate: 2, severe: 3, critical: 4 };
    let maxSeverity = 0;
    for (const r of reports) {
      const level = severityOrder[r.severity] || 0;
      if (level > maxSeverity) maxSeverity = level;
    }
    return Object.keys(severityOrder).find(k => severityOrder[k] === maxSeverity) || 'moderate';
  }

  /**
   * Emit report to detection engines (E07, E08, E09)
   */
  _emitToDetectionEngines(report) {
    // Convert crowd report to detection signal
    const signal = {
      source: 'crowd_report',
      reportId: report.id,
      type: report.type,
      severity: report.severity,
      location: report.location,
      timestamp: report.timestamp,
      confidence: this._calculateReportConfidence(report),
      metadata: {
        description: report.description,
        mediaCount: report.media.length,
        reporterReputation: report.userId ? this.getReporterScore(report.userId)?.score : 50
      }
    };
    
    console.log(`[E16] Emitting crowd signal to detection engines: ${report.type}`);
    // In production, emit event for E07/E08/E09 consumption
  }

  /**
   * Emit verified report to fusion engine
   */
  _emitVerifiedReport(report) {
    const signal = {
      source: 'crowd_verified',
      reportId: report.id,
      type: report.type,
      severity: report.severity,
      location: report.location,
      timestamp: report.timestamp,
      confidence: 0.8, // High confidence for verified
      metadata: {
        description: report.description,
        voteCount: report.verification.voteCount,
        agreeRatio: report.votes.agree / (report.votes.agree + report.votes.disagree)
      }
    };
    
    console.log(`[E16] Emitting verified crowd report to fusion: ${report.id}`);
  }

  /**
   * Emit escalated report
   */
  _emitEscalatedReport(report) {
    console.log(`[E16] Emitting escalated report to decision engine: ${report.id}`);
  }

  /**
   * Emit cluster to detection engines
   */
  _emitCluster(cluster) {
    console.log(`[E16] Emitting cluster to detection engines: ${cluster.id} (${cluster.count} reports)`);
  }

  /**
   * Calculate report confidence based on reporter reputation and media
   */
  _calculateReportConfidence(report) {
    let confidence = 0.3; // Base confidence for crowd report
    
    // Reputation bonus
    if (report.userId) {
      const score = this.getReporterScore(report.userId)?.score || 50;
      confidence += (score / 100) * 0.3; // Up to 0.3 from reputation
    }
    
    // Media bonus
    if (report.media.length > 0) {
      confidence += 0.1 * report.media.length; // 0.1 per media item
    }
    
    // Severity adjustment
    const severityConfidence = { info: 0.1, minor: 0.2, moderate: 0.3, severe: 0.4, critical: 0.5 };
    confidence += severityConfidence[report.severity] || 0;
    
    return Math.min(0.9, confidence); // Cap at 0.9 for crowd reports
  }

  /**
   * Official verification (by authority)
   */
  async officialVerify(reportId, verified, notes = '', officialId = 'official') {
    const report = this.reports.get(reportId);
    if (!report) return { success: false, error: 'Report not found' };
    
    report.verification.verified = verified;
    report.verification.verifiedBy = officialId;
    report.verification.verifiedAt = new Date().toISOString();
    report.verification.consensus = verified ? 'confirmed' : 'rejected';
    report.status = verified ? 'verified' : 'rejected';
    
    if (verified) {
      this.verifiedReports.add(reportId);
      this.stats.verified++;
      
      if (report.userId) {
        this._updateReporterScore(report.userId, 'verified_report');
        const reporter = this.reporterScores.get(report.userId);
        if (reporter) reporter.verifiedReports++;
      }
      
      if (this.config.integration.e09Fusion) {
        this._emitVerifiedReport(report);
      }
    }
    
    report.updatedAt = new Date().toISOString();
    
    console.log(`[E16] Official verification: ${reportId} ${verified ? 'confirmed' : 'rejected'} by ${officialId}`);
    
    return { success: true, reportId };
  }

  /**
   * Apply daily reputation decay
   */
  applyDailyDecay() {
    if (!this.config.reputation.enabled) return;
    
    for (const [userId, reporter] of this.reporterScores) {
      reporter.score = Math.max(this.config.reputation.minScore, 
        reporter.score * this.config.reputation.decayRate);
      reporter.level = this._calculateLevel(reporter.score);
    }
    
    console.log('[E16] Applied daily reputation decay');
  }

  /**
   * Search reports
   */
  searchReports(query) {
    const {
      type, severity, userId, clusterId, verified, 
      lat, lon, radius, startTime, endTime, limit = 100
    } = query;
    
    let results = Array.from(this.reports.values());
    
    if (type) results = results.filter(r => r.type === type);
    if (severity) results = results.filter(r => r.severity === severity);
    if (userId) results = results.filter(r => r.userId === userId);
    if (clusterId) results = results.filter(r => r.clusterId === clusterId);
    if (verified !== undefined) results = results.filter(r => r.verification.verified === verified);
    if (startTime) results = results.filter(r => new Date(r.timestamp).getTime() >= new Date(startTime).getTime());
    if (endTime) results = results.filter(r => new Date(r.timestamp).getTime() <= new Date(endTime).getTime());
    if (lat && lon && radius) {
      results = results.filter(r => this._haversine(lat, lon, r.location.lat, r.location.lon) <= radius);
    }
    
    return results
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Shutdown
   */
  shutdown() {
    console.log('[E16] Crowd Report Engine shutdown');
  }
}

module.exports = { CrowdReportEngine };