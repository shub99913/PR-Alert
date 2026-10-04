import { 
  CrowdReport, 
  DisasterType, 
  CrowdReportSchema,
  Severity 
} from '@pr-alert/schemas';
import { 
  haversineDistance, 
  clusterPoints, 
  getClusterCentroid,
  createPoint,
  pointInRadius 
} from '@pr-alert/geospatial';
import { config, createEngineLogger } from '@pr-alert/core';

const logger = createEngineLogger('crowd');

/**
 * Crowd report with verification status
 */
export interface VerifiedCrowdReport {
  report: any;
  verificationScore: number;
  trustLevel: 'unverified' | 'low' | 'medium' | 'high' | 'verified';
  clusterId?: string;
  similarReports: number;
}

/**
 * Crowd Report Engine
 */
export class CrowdReportEngine {
  private reports: Map<string, any> = new Map();
  private userReports: Map<string, string[]> = new Map();
  private clusters: Map<string, any> = new Map();
  private userTrustScores: Map<string, number> = new Map();
  private verificationQueue: string[] = [];
  private logger = createEngineLogger('crowd-reports');
  private deduplicationWindowMs = 30 * 60 * 1000; // 30 minutes
  private clusterRadiusMeters = 500;
  private minClusterSize = 2;

  constructor() {
    // Initialize with some trusted users
    this.userTrustScores.set('official_imd', 1.0);
    this.userTrustScores.set('official_ndma', 1.0);
    this.userTrustScores.set('verified_ngo_1', 0.9);
  }

  /**
   * Submit a crowd report
   */
  async submitReport(report: any): Promise<{ success: boolean; reportId: string; verificationStatus: string }> {
    const reportId = `cr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate report
    const validation = this.validateReport(report);
    if (!validation.valid) {
      return { success: false, reportId, verificationStatus: `Invalid: ${validation.error}` };
    }

    const newReport = {
      ...report,
      _id: reportId,
      timestamp: new Date().toISOString(),
      status: 'pending',
      verification: {
        verified: false,
        verifiedBy: null,
        verifiedAt: null,
        voteCount: 0,
        agreeVotes: 0,
        disagreeVotes: 0,
        trustScore: this.calculateInitialTrustScore(report),
      },
      clusterId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.reports.set(reportId, newReport);

    // Track user reports
    if (report.userId) {
      const userReports = this.userReports.get(report.userId) || [];
      userReports.push(reportId);
      this.userReports.set(report.userId, userReports);
    }

    // Check for clustering
    await this.checkAndAssignCluster(newReport);

    // Add to verification queue if needed
    if (this.shouldQueueForVerification(newReport)) {
      this.verificationQueue.push(reportId);
    }

    logger.info({ reportId, disasterType: report.disasterType }, 'Crowd report submitted');

    return { 
      success: true, 
      reportId, 
      verificationStatus: 'pending' 
    };
  }

  /**
   * Validate a crowd report
   */
  private validateReport(report: any): { valid: boolean; error?: string } {
    if (!report.disasterType) {
      return { valid: false, error: 'Disaster type is required' };
    }
    if (!report.severity) {
      return { valid: false, error: 'Severity is required' };
    }
    if (!report.location || !report.location.coordinates) {
      return { valid: false, error: 'Location with coordinates is required' };
    }
    if (!report.description || report.description.length < 10) {
      return { valid: false, error: 'Description must be at least 10 characters' };
    }
    if (report.description.length > 5000) {
      return { valid: false, error: 'Description too long (max 5000 chars)' };
    }
    if (report.media && report.media.length > 5) {
      return { valid: false, error: 'Maximum 5 media items allowed' };
    }
    return { valid: true };
  }

  /**
   * Calculate initial trust score for a report
   */
  private calculateInitialTrustScore(report: any): number {
    let score = 0.3; // Base score

    // User trust score
    if (report.userId) {
      const userTrust = this.getUserTrustScore(report.userId);
      score += userTrust * 0.3;
    } else if (report.anonymous) {
      score -= 0.1; // Anonymous reports start lower
    }

    // Media presence
    if (report.media && report.media.length > 0) {
      score += Math.min(report.media.length * 0.1, 0.3);
    }

    // Detail level
    if (report.description && report.description.length > 100) {
      score += 0.1;
    }

    // Contact info provided
    if (report.contactInfo) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Get user trust score
   */
  getUserTrustScore(userId: string): number {
    return this.userTrustScores.get(userId) || 0.5;
  }

  /**
   * Update user trust score
   */
  updateUserTrustScore(userId: string, delta: number): void {
    const current = this.getUserTrustScore(userId);
    const newScore = Math.max(0, Math.min(1, current + delta));
    this.userTrustScores.set(userId, newScore);
  }

  /**
   * Check if report should be queued for verification
   */
  private shouldQueueForVerification(report: any): boolean {
    // Queue if trust score is medium, or if it's a severe/critical report
    if (report.verification.trustScore < 0.7) return true;
    if (['severe', 'critical'].includes(report.severity)) return true;
    return false;
  }

  /**
   * Check and assign cluster
   */
  private async checkAndAssignCluster(report: any): Promise<void> {
    const nearbyReports = this.findNearbyReports(report);
    
    if (nearbyReports.length + 1 >= this.minClusterSize) {
      const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const allReports = [report, ...nearbyReports];
      
      const cluster = {
        id: clusterId,
        reportIds: allReports.map(r => r._id),
        centroid: this.calculateCentroid(allReports),
        bounds: this.calculateBounds(allReports),
        disasterType: report.disasterType,
        severity: this.determineClusterSeverity(allReports),
        count: allReports.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Assign cluster to reports
      for (const r of allReports) {
        r.clusterId = cluster.id;
        r.updatedAt = new Date().toISOString();
      }

      this.clusters.set(clusterId, cluster);
      logger.info({ clusterId, count: cluster.count }, 'Cluster created');
    }
  }

  /**
   * Find nearby reports within cluster radius
   */
  private findNearbyReports(report: any): any[] {
    const nearby: any[] = [];
    const reportPoint = createPoint(report.location.coordinates[0], report.location.coordinates[1]);
    
    for (const [id, r] of this.reports.entries()) {
      if (r._id === report._id) continue;
      if (r.disasterType !== report.disasterType) continue;
      if (r.status !== 'pending' && r.status !== 'verified') continue;
      
      const otherPoint = createPoint(r.location.coordinates[0], r.location.coordinates[1]);
      const distance = haversineDistance(reportPoint, otherPoint);
      
      if (distance <= this.clusterRadiusMeters) {
        nearby.push(r);
      }
    }
    
    return nearby;
  }

  /**
   * Calculate cluster centroid
   */
  private calculateCentroid(reports: any[]): { lat: number; lon: number } {
    let sumLat = 0, sumLon = 0;
    for (const r of reports) {
      sumLon += r.location.coordinates[0];
      sumLat += r.location.coordinates[1];
    }
    return {
      lat: sumLat / reports.length,
      lon: sumLon / reports.length,
    };
  }

  /**
   * Calculate cluster bounds
   */
  private calculateBounds(reports: any[]): { north: number; south: number; east: number; west: number } {
    let north = -90, south = 90, east = -180, west = 180;
    for (const r of reports) {
      const [lon, lat] = r.location.coordinates;
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lon);
      west = Math.min(west, lon);
    }
    return { north, south, east, west };
  }

  /**
   * Determine cluster severity (highest severity among reports)
   */
  private determineClusterSeverity(reports: any[]): string {
    const severityOrder = { info: 0, minor: 1, moderate: 2, severe: 3, critical: 4 };
    let maxSeverity = 'info';
    for (const r of reports) {
      if (severityOrder[r.severity] > severityOrder[maxSeverity]) {
        maxSeverity = r.severity;
      }
    }
    return maxSeverity;
  }

  /**
   * Vote on a report (crowd verification)
   */
  async vote(reportId: string, userId: string, vote: 'agree' | 'disagree'): Promise<{ success: boolean; votes: { agree: number; disagree: number } }> {
    const report = this.reports.get(reportId);
    if (!report) {
      return { success: false, votes: { agree: 0, disagree: 0 } };
    }

    // Check if user already voted
    const existingVote = report.verification.votes?.find((v: any) => v.userId === userId);
    if (existingVote) {
      return { 
        success: false, 
        votes: { agree: report.verification.agreeVotes, disagree: report.verification.disagreeVotes } 
      };
    }

    // Record vote
    if (!report.verification.votes) report.verification.votes = [];
    report.verification.votes.push({ userId, vote, timestamp: new Date().toISOString() });

    if (vote === 'agree') {
      report.verification.agreeVotes++;
    } else {
      report.verification.disagreeVotes++;
    }
    report.verification.voteCount++;

    // Check for verification threshold
    const totalVotes = report.verification.agreeVotes + report.verification.disagreeVotes;
    if (totalVotes >= 5) {
      const agreeRatio = report.verification.agreeVotes / totalVotes;
      if (agreeRatio >= 0.6) {
        await this.verifyReport(report._id, 'crowd', 'Crowd verified');
      } else if (agreeRatio <= 0.3) {
        await this.rejectReport(report._id, 'crowd', 'Crowd rejected');
      }
    }

    report.updatedAt = new Date().toISOString();

    return { 
      success: true, 
      votes: { agree: report.verification.agreeVotes, disagree: report.verification.disagreeVotes } 
    };
  }

  /**
   * Official verification
   */
  async verifyReport(reportId: string, verifiedBy: string, notes?: string): Promise<boolean> {
    const report = this.reports.get(reportId);
    if (!report) return false;

    report.verification.verified = true;
    report.verification.verifiedBy = verifiedBy;
    report.verification.verifiedAt = new Date().toISOString();
    report.verification.notes = notes;
    report.status = 'verified';
    report.updatedAt = new Date().toISOString();

    // Update user trust score
    if (report.userId) {
      this.updateUserTrustScore(report.userId, 0.1);
    }

    logger.info({ reportId, verifiedBy }, 'Report verified');
    return true;
  }

  /**
   * Reject a report
   */
  async rejectReport(reportId: string, rejectedBy: string, reason?: string): Promise<boolean> {
    const report = this.reports.get(reportId);
    if (!report) return false;

    report.verification.verified = false;
    report.verification.rejectedBy = rejectedBy;
    report.verification.rejectedAt = new Date().toISOString();
    report.verification.rejectionReason = reason;
    report.status = 'rejected';
    report.updatedAt = new Date().toISOString();

    // Decrease user trust score
    if (report.userId) {
      this.updateUserTrustScore(report.userId, -0.15);
    }

    logger.info({ reportId, rejectedBy, reason }, 'Report rejected');
    return true;
  }

  /**
   * Escalate report to official channels
   */
  async escalateReport(reportId: string, escalatedBy: string): Promise<boolean> {
    const report = this.reports.get(reportId);
    if (!report) return false;

    report.status = 'escalated';
    report.escalatedBy = escalatedBy;
    report.escalatedAt = new Date().toISOString();
    report.updatedAt = new Date().toISOString();

    logger.info({ reportId, escalatedBy }, 'Report escalated to official channels');
    return true;
  }

  /**
   * Get report by ID
   */
  getReport(reportId: string): any | null {
    return this.reports.get(reportId) || null;
  }

  /**
   * Get reports by user
   */
  getUserReports(userId: string): any[] {
    const reportIds = this.userReports.get(userId) || [];
    return reportIds.map(id => this.reports.get(id)).filter(Boolean);
  }

  /**
   * Get reports in area
   */
  getReportsInArea(lat: number, lon: number, radiusMeters: number = 5000): any[] {
    const center = createPoint(lon, lat);
    const results: any[] = [];
    
    for (const report of this.reports.values()) {
      const reportPoint = createPoint(report.location.coordinates[0], report.location.coordinates[1]);
      const distance = haversineDistance(createPoint(lon, lat), reportPoint);
      if (distance <= radiusMeters) {
        results.push({ ...report, distance });
      }
    }
    
    return results.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get reports by type
   */
  getReportsByType(disasterType: string, limit: number = 100): any[] {
    const results: any[] = [];
    for (const report of this.reports.values()) {
      if (report.disasterType === disasterType) {
        results.push(report);
        if (results.length >= limit) break;
      }
    }
    return results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get verified reports
   */
  getVerifiedReports(limit: number = 100): any[] {
    const results: any[] = [];
    for (const report of this.reports.values()) {
      if (report.verification.verified) {
        results.push(report);
        if (results.length >= limit) break;
      }
    }
    return results.sort((a, b) => new Date(b.verification.verifiedAt).getTime() - new Date(a.verification.verifiedAt).getTime());
  }

  /**
   * Get clusters
   */
  getClusters(): any[] {
    return Array.from(this.clusters.values());
  }

  /**
   * Get cluster by ID
   */
  getCluster(clusterId: string): any | null {
    return this.clusters.get(clusterId) || null;
  }

  /**
   * Get engine stats
   */
  getStats(): any {
    const reports = Array.from(this.reports.values());
    const verified = reports.filter(r => r.verification.verified).length;
    const pending = reports.filter(r => r.status === 'pending').length;
    const rejected = reports.filter(r => r.status === 'rejected').length;
    const escalated = reports.filter(r => r.status === 'escalated').length;

    return {
      totalReports: reports.length,
      verified,
      pending,
      rejected,
      escalated,
      clusters: this.clusters.size,
      activeUsers: this.userReports.size,
      averageTrustScore: this.calculateAverageTrustScore(),
      verificationRate: reports.length > 0 ? verified / reports.length : 0,
    };
  }

  private calculateAverageTrustScore(): number {
    const scores = Array.from(this.userTrustScores.values());
    if (scores.length === 0) return 0.5;
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  /**
   * Search reports
   */
  searchReports(query: {
    disasterType?: string;
    severity?: string;
    status?: string;
    userId?: string;
    clusterId?: string;
    lat?: number;
    lon?: number;
    radius?: number;
    startTime?: string;
    endTime?: string;
    limit?: number;
  }): any[] {
    let results = Array.from(this.reports.values());

    if (query.disasterType) results = results.filter(r => r.disasterType === query.disasterType);
    if (query.severity) results = results.filter(r => r.severity === query.severity);
    if (query.status) results = results.filter(r => r.status === query.status);
    if (query.userId) results = results.filter(r => r.userId === query.userId);
    if (query.clusterId) results = results.filter(r => r.clusterId === query.clusterId);
    if (query.startTime) results = results.filter(r => new Date(r.timestamp) >= new Date(query.startTime!));
    if (query.endTime) results = results.filter(r => new Date(r.timestamp) <= new Date(query.endTime!));
    if (query.lat && query.lon && query.radius) {
      const center = createPoint(query.lon, query.lat);
      results = results.filter(r => {
        const point = createPoint(r.location.coordinates[0], r.location.coordinates[1]);
        return haversineDistance(center, createPoint(r.location.coordinates[0], r.location.coordinates[1])) <= (query.radius || 5000);
      });
    }

    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return results.slice(0, query.limit || 100);
  }

  /**
   * Get verification queue
   */
  getVerificationQueue(): string[] {
    return [...this.verificationQueue];
  }

  /**
   * Process verification queue
   */
  async processVerificationQueue(): Promise<number> {
    let processed = 0;
    while (this.verificationQueue.length > 0 && processed < 10) {
      const reportId = this.verificationQueue.shift()!;
      const report = this.reports.get(reportId);
      if (report && report.status === 'pending') {
        // Auto-verify high-trust reports
        if (report.verification.trustScore >= 0.8) {
          await this.verifyReport(reportId, 'auto', 'Auto-verified high trust score');
        }
        processed++;
      }
    }
    return processed;
  }
}

// Singleton instance
export const crowdReportEngine = new CrowdReportEngine();

export { CrowdReportEngine };