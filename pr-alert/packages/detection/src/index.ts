import { 
  DisasterEvent, 
  DisasterType, 
  Severity,
  SourceType 
} from '@pr-alert/schemas';
import { 
  haversineDistance, 
  pointInPolygon, 
  createCircle,
  estimateAffectedPopulation,
  estimateIntensityAtDistance 
} from '@pr-alert/geospatial';
import { config, createEngineLogger } from '@pr-alert/core';
import { applyJsonLogic, JsonLogicRules } from 'jsonlogic-js';

const logger = createEngineLogger('detection');

/**
 * Rule definition schema
 */
export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  disasterType: DisasterType | '*';
  enabled: boolean;
  priority: number; // Higher = evaluated first
  condition: JsonLogicRules;
  severity: 'info' | 'warning' | 'alert' | 'emergency';
  confidence: number; // Base confidence if rule matches
  cooldownMs: number; // Minimum time between triggers for same event
  tags: string[];
}

/**
 * Rule match result
 */
export interface RuleMatch {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  severity: 'info' | 'warning' | 'alert' | 'emergency';
  confidence: number;
  matchedData: Record<string, any>;
  timestamp: Date;
}

/**
 * Detection result
 */
export interface DetectionResult {
  eventId: string;
  matches: RuleMatch[];
  triggered: boolean;
  maxSeverity: 'info' | 'warning' | 'alert' | 'emergency';
  maxConfidence: number;
  triggeredRules: string[];
  recommendedAction: 'none' | 'monitor' | 'issue_alert' | 'immediate_alert';
}

/**
 * Rule engine
 */
export class RuleEngine {
  private rules: Map<string, DetectionRule> = new Map();
  private lastTriggered: Map<string, number> = new Map(); // ruleId:eventKey -> timestamp
  private logger = createEngineLogger('rule-engine');

  constructor() {
    this.loadDefaultRules();
  }

  /**
   * Add or update a rule
   */
  addRule(rule: DetectionRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): DetectionRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules (optionally filtered by disaster type)
   */
  getRules(disasterType?: string): DetectionRule[] {
    const rules = Array.from(this.rules.values()).filter(r => r.enabled);
    if (disasterType) {
      return rules.filter(r => r.disasterType === disasterType || r.disasterType === '*');
    }
    return rules;
  }

  /**
   * Enable/disable a rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Evaluate an event against all applicable rules
   */
  async evaluate(event: any): Promise<DetectionResult> {
    const rules = this.getRules(event.disasterType);
    const matches: RuleMatch[] = [];
    const eventKey = this.getEventKey(event);

    for (const rule of rules) {
      // Check cooldown
      const cooldownKey = `${rule.id}:${event.source}:${event.sourceId}`;
      const lastTriggered = this.lastTriggered.get(cooldownKey);
      if (lastTriggered && Date.now() - lastTriggered < rule.cooldownMs) {
        continue;
      }

      // Evaluate rule condition
      try {
        const context = this.buildContext(event);
        const matched = applyJsonLogic(rule.condition, context);
        
        const match: RuleMatch = {
          ruleId: rule.id,
          ruleName: rule.name,
          matched,
          severity: rule.severity,
          confidence: rule.confidence,
          matchedData: matched ? this.extractMatchedData(rule.condition, context) : {},
          timestamp: new Date(),
        };

        matches.push(match);

        if (matched) {
          // Update cooldown
          this.lastTriggered.set(`${rule.id}:${event.source}:${event.sourceId}`, Date.now());
        }
      } catch (error) {
        console.error(`Rule evaluation error for ${rule.id}:`, error);
      }
    }

    return this.buildResult(event, matches);
  }

  /**
   * Build evaluation context from event
   */
  private buildContext(event: any): Record<string, any> {
    const props = event.properties || {};
    const location = event.location?.coordinates || [0, 0];
    
    return {
      event: {
        source: event.source,
        disasterType: event.disasterType,
        sourceId: event.sourceId,
        timestamp: event.timestamp,
        receivedAt: event.receivedAt,
      },
      properties: {
        magnitude: props.magnitude ?? 0,
        depth: props.depth ?? 0,
        magnitudeType: props.magnitudeType ?? '',
        nst: props.nst ?? 0,
        gap: props.gap ?? 0,
        rms: props.rms ?? 0,
        cdi: props.cdi ?? 0,
        mmi: props.mmi ?? 0,
        alert: props.alert ?? '',
        tsunami: props.tsunami ?? 0,
        place: props.place ?? '',
        windSpeed: props.windSpeed ?? 0,
        pressure: props.pressure ?? 0,
        rainfall: props.rainfall ?? 0,
        temperature: props.temperature ?? 0,
        humidity: props.humidity ?? 0,
        visibility: props.visibility ?? 0,
        affectedRadiusKm: props.affectedRadiusKm ?? 0,
      },
      location: {
        lon: event.location?.coordinates?.[0] ?? 0,
        lat: event.location?.coordinates?.[1] ?? 0,
        accuracy: event.location?.accuracy ?? 0,
      },
      metadata: {
        source: event.source,
        confidence: event.confidence ?? 0,
        receivedAt: event.receivedAt,
        processingVersion: event.processingVersion,
      },
      // Helper functions
      '_distance': (a: any, b: any) => {
        if (!a || !b) return 0;
        const [lon1, lat1] = a;
        const [lon2, lat2] = b;
        // Simple haversine
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
        return 2 * R * Math.asin(Math.sqrt(a));
      },
    };
  }

  /**
   * Extract matched data from condition
   */
  private extractMatchedData(condition: any, context: any): Record<string, any> {
    // Simple extraction - in practice, you'd traverse the condition tree
    return {};
  }

  /**
   * Build detection result from matches
   */
  private buildResult(event: any, matches: RuleMatch[]): any {
    const triggered = matches.filter(m => m.matched);
    const maxSeverity = this.getMaxSeverity(matches.map(m => m.severity));
    const maxConfidence = Math.max(0, ...matches.map(m => m.confidence));
    const triggeredRules = triggered.map(m => m.ruleId);

    let recommendedAction: 'none' | 'monitor' | 'issue_alert' | 'immediate_alert' = 'none';
    if (triggered.length > 0) {
      if (maxSeverity === 'emergency') recommendedAction = 'immediate_alert';
      else if (maxSeverity === 'alert') recommendedAction = 'issue_alert';
      else recommendedAction = 'monitor';
    }

    return {
      eventId: event.sourceId,
      matches,
      triggered: triggered.length > 0,
      maxSeverity,
      maxConfidence,
      triggeredRules,
      recommendedAction,
    };
  }

  /**
   * Get maximum severity from list
   */
  private getMaxSeverity(severities: string[]): 'info' | 'warning' | 'alert' | 'emergency' {
    const order = { info: 0, warning: 1, alert: 2, emergency: 3 };
    return severities.reduce((max, s) => order[s] > order[max] ? s : max, 'info');
  }

  /**
   * Generate event key for cooldown tracking
   */
  private getEventKey(event: any): string {
    return `${event.source}:${event.sourceId}`;
  }

  /**
   * Add a custom rule
   */
  addRule(rule: any): void {
    // Implementation in Map
  }

  /**
   * Get all rules
   */
  getRules(): any[] {
    return [];
  }
}

/**
 * Default rule set for PR-Alert
 */
export function createDefaultRules(): any[] {
  return [
    // Earthquake rules
    {
      id: 'eq-major',
      name: 'Major Earthquake (M7+)',
      description: 'Major earthquake magnitude 7.0 or higher',
      disasterType: 'earthquake',
      enabled: true,
      priority: 100,
      condition: { '>=': [{ var: 'properties.magnitude' }, 7.0] },
      severity: 'emergency',
      confidence: 0.95,
      cooldownMs: 3600000, // 1 hour
      tags: ['earthquake', 'major'],
    },
    {
      id: 'eq-strong',
      name: 'Strong Earthquake (M6-7)',
      description: 'Strong earthquake magnitude 6.0-6.9',
      disasterType: 'earthquake',
      enabled: true,
      priority: 90,
      condition: { 'and': [
        { '>=': [{ var: 'properties.magnitude' }, 6.0] },
        { '<': [{ var: 'properties.magnitude' }, 7.0] },
      ]},
      severity: 'alert',
      confidence: 0.9,
      cooldownMs: 1800000,
      tags: ['earthquake', 'strong'],
    },
    {
      id: 'eq-moderate',
      name: 'Moderate Earthquake (M5-6)',
      description: 'Moderate earthquake magnitude 5.0-5.9',
      disasterType: 'earthquake',
      enabled: true,
      priority: 80,
      condition: { 'and': [
        { '>=': [{ var: 'properties.magnitude' }, 5.0] },
        { '<': [{ var: 'properties.magnitude' }, 6.0] },
      ]},
      severity: 'warning',
      confidence: 0.85,
      cooldownMs: 900000,
      tags: ['earthquake', 'moderate'],
    },
    {
      id: 'eq-shallow',
      name: 'Shallow Significant Earthquake',
      description: 'Shallow earthquake (depth < 30km) with M5+',
      disasterType: 'earthquake',
      enabled: true,
      priority: 85,
      condition: { 'and': [
        { '>=': [{ var: 'properties.magnitude' }, 5.0] },
        { '<': [{ var: 'properties.depth' }, 30] },
      ]},
      severity: 'alert',
      confidence: 0.85,
      cooldownMs: 1800000,
      tags: ['earthquake', 'shallow'],
    },
    {
      id: 'eq-felt',
      name: 'Widely Felt Earthquake',
      description: 'Earthquake with MMI >= 5 or CDI >= 4',
      disasterType: 'earthquake',
      enabled: true,
      priority: 75,
      condition: { 'or': [
        { '>=': [{ var: 'properties.mmi' }, 5] },
        { '>=': [{ var: 'properties.cdi' }, 4] },
      ]},
      severity: 'warning',
      confidence: 0.8,
      cooldownMs: 1800000,
      tags: ['earthquake', 'felt'],
    },
    {
      id: 'eq-tsunami',
      name: 'Tsunami Risk Earthquake',
      description: 'Undersea earthquake M7+ with tsunami potential',
      disasterType: 'earthquake',
      enabled: true,
      priority: 100,
      condition: { 'and': [
        { '>=': [{ var: 'properties.magnitude' }, 7.0] },
        { '<': [{ var: 'properties.depth' }, 100] },
        { '>': [{ var: 'properties.tsunami' }, 0] },
      ]},
      severity: 'emergency',
      confidence: 0.9,
      cooldownMs: 3600000,
      tags: ['earthquake', 'tsunami'],
    },

    // Flood rules
    {
      id: 'flood-severe',
      name: 'Severe Flood Warning',
      description: 'Severe flood warning from IMD/GDACS',
      disasterType: 'flood',
      enabled: true,
      priority: 90,
      condition: { 'and': [
        { '==': [{ var: 'event.disasterType' }, 'flood'] },
        { 'in': [{ var: 'properties.severity' }, ['severe', 'extreme', 'red']] },
      ]},
      severity: 'alert',
      confidence: 0.85,
      cooldownMs: 1800000,
      tags: ['flood', 'severe'],
    },
    {
      id: 'flood-moderate',
      name: 'Moderate Flood Risk',
      description: 'Moderate flood risk detected',
      disasterType: 'flood',
      enabled: true,
      priority: 70,
      condition: { 'and': [
        { '==': [{ var: 'event.disasterType' }, 'flood'] },
        { 'in': [{ var: 'properties.severity' }, ['moderate', 'yellow', 'orange']] },
      ]},
      severity: 'warning',
      confidence: 0.75,
      cooldownMs: 1800000,
      tags: ['flood', 'moderate'],
    },

    // Cyclone rules
    {
      id: 'cyclone-severe',
      name: 'Severe Cyclone',
      description: 'Severe cyclonic storm (Category 3+)',
      disasterType: 'cyclone',
      enabled: true,
      priority: 95,
      condition: { 'and': [
        { '==': [{ var: 'event.disasterType' }, 'cyclone'] },
        { '>=': [{ var: 'properties.windSpeed' }, 178] }, // km/h, Cat 3+
      ]},
      severity: 'emergency',
      confidence: 0.9,
      cooldownMs: 3600000,
      tags: ['cyclone', 'severe'],
    },
    {
      id: 'cyclone-moderate',
      name: 'Moderate Cyclone',
      description: 'Moderate cyclonic storm (Category 1-2)',
      disasterType: 'cyclone',
      enabled: true,
      priority: 80,
      condition: { 'and': [
        { '==': [{ var: 'event.disasterType' }, 'cyclone'] },
        { '>=': [{ var: 'properties.windSpeed' }, 118] }, // km/h, Cat 1+
        { '<': [{ var: 'properties.windSpeed' }, 178] },
      ]},
      severity: 'alert',
      confidence: 0.85,
      cooldownMs: 1800000,
      tags: ['cyclone', 'moderate'],
    },

    // Wildfire rules
    {
      id: 'wildfire-large',
      name: 'Large Wildfire',
      description: 'Large wildfire detected by FIRMS',
      disasterType: 'wildfire',
      enabled: true,
      priority: 85,
      condition: { 'and': [
        { '==': [{ var: 'event.disasterType' }, 'wildfire'] },
        { '>=': [{ var: 'properties.areaHectares' }, 100] },
      ]},
      severity: 'alert',
      confidence: 0.8,
      cooldownMs: 3600000,
      tags: ['wildfire', 'large'],
    },
    {
      id: 'wildfire-firms',
      name: 'FIRMS Fire Detection',
      description: 'Fire detected by NASA FIRMS',
      disasterType: 'wildfire',
      enabled: true,
      priority: 60,
      condition: { 'and': [
        { '==': [{ var: 'event.source' }, 'firms'] },
        { '>': [{ var: 'properties.confidence' }, 50] },
      ]},
      severity: 'warning',
      confidence: 0.7,
      cooldownMs: 1800000,
      tags: ['wildfire', 'firms'],
    },

    // Heatwave rules
    {
      id: 'heatwave-extreme',
      name: 'Extreme Heatwave',
      description: 'Extreme heatwave temperature > 45°C',
      disasterType: 'heatwave',
      enabled: true,
      priority: 80,
      condition: { 'and': [
        { '==': [{ var: 'event.disasterType' }, 'heatwave'] },
        { '>=': [{ var: 'properties.temperature' }, 45] },
      ]},
      severity: 'emergency',
      confidence: 0.85,
      cooldownMs: 7200000,
      tags: ['heatwave', 'extreme'],
    },
    {
      id: 'heatwave-moderate',
      name: 'Moderate Heatwave',
      description: 'Heatwave temperature 40-45°C',
      disasterType: 'heatwave',
      enabled: true,
      priority: 60,
      condition: { 'and': [
        { '==': [{ var: 'event.disasterType' }, 'heatwave'] },
        { '>=': [{ var: 'properties.temperature' }, 40] },
        { '<': [{ var: 'properties.temperature' }, 45] },
      ]},
      severity: 'warning',
      confidence: 0.8,
      cooldownMs: 7200000,
      tags: ['heatwave', 'moderate'],
    },

    // Generic high confidence rule
    {
      id: 'high-confidence',
      name: 'High Confidence Multi-Source',
      description: 'Event confirmed by multiple sources with high confidence',
      disasterType: '*',
      enabled: true,
      priority: 50,
      condition: { 'and': [
        { '>=': [{ var: 'event.confidence' }, 0.85] },
        { '>=': [{ var: 'event.confirmationCount' }, 2] },
      ]},
      severity: 'alert',
      confidence: 0.9,
      cooldownMs: 3600000,
      tags: ['multi-source', 'verified'],
    },

    // Crowd verification rule
    {
      id: 'crowd-verified',
      name: 'Crowd Verified Report',
      description: 'Crowd report verified by multiple users',
      disasterType: '*',
      enabled: true,
      priority: 55,
      condition: { 'and': [
        { '==': [{ var: 'event.source' }, 'crowd'] },
        { '==': [{ var: 'event.verification.verified' }, true] },
        { '>=': [{ var: 'event.verification.voteCount' }, 5] },
      ]},
      severity: 'alert',
      confidence: 0.85,
      cooldownMs: 1800000,
      tags: ['crowd', 'verified'],
    },
  ];
}

export { DetectionRule, RuleMatch, DetectionResult, RuleEngine };