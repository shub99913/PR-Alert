import { z } from 'zod';

/**
 * Base GeoJSON types
 */
export const PositionSchema = z.tuple([z.number(), z.number()]); // [lon, lat]

export const PointSchema = z.object({
  type: z.literal('Point'),
  coordinates: PositionSchema,
});

export const PolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(z.array(z.number()))),
});

export const MultiPolygonSchema = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(z.array(z.number())))),
});

export const GeometrySchema = z.union([PointSchema, PolygonSchema, MultiPolygonSchema]);

export const GeoJsonPropertiesSchema = z.record(z.unknown());

export const FeatureSchema = z.object({
  type: z.literal('Feature'),
  geometry: GeometrySchema,
  properties: GeoJsonPropertiesSchema.optional(),
  id: z.union([z.string(), z.number()]).optional(),
});

export const FeatureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(FeatureSchema),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});

/**
 * Disaster event types
 */
export const DisasterTypeSchema = z.enum([
  'earthquake',
  'flood',
  'cyclone',
  'wildfire',
  'landslide',
  'heatwave',
  'tsunami',
  'air_quality',
  'volcano',
  'storm_surge',
  'drought',
  'cold_wave',
  'thunderstorm',
  'hail',
  'tornado',
  'avalanche',
]);

export type DisasterType = z.infer<typeof DisasterTypeSchema>;

/**
 * Severity levels
 */
export const SeveritySchema = z.enum([
  'info',
  'warning',
  'alert',
  'emergency',
]);

export type Severity = z.infer<typeof SeveritySchema>;

/**
 * Alert status
 */
export const AlertStatusSchema = z.enum([
  'draft',
  'issued',
  'cancelled',
  'expired',
]);

export type AlertStatus = z.infer<typeof AlertStatusSchema>;

/**
 * Dispatch channels
 */
export const ChannelSchema = z.enum([
  'sms',
  'email',
  'push',
  'whatsapp',
  'webhook',
  'social_media',
  'siren',
  'cell_broadcast',
  'radio',
  'tv',
  'operator_dashboard',
]);

export type Channel = z.infer<typeof ChannelSchema>;

/**
 * Source types
 */
export const SourceTypeSchema = z.enum([
  'usgs',
  'imd',
  'gdacs',
  'firms',
  'openaq',
  'openweather',
  'crowd',
  'social_media',
  'operator',
  'satellite',
]);

export type SourceType = z.infer<typeof SourceTypeSchema>;

/**
 * Core Event Schema - Normalized disaster event
 */
export const DisasterEventSchema = z.object({
  _id: z.string().optional(), // MongoDB ObjectId as string
  source: SourceTypeSchema,
  sourceId: z.string(), // Unique ID from source
  disasterType: DisasterTypeSchema,
  severity: SeveritySchema,
  confidence: z.number().min(0).max(1),
  
  // Location - GeoJSON Point
  location: PointSchema,
  
  // Optional affected area polygon
  area: PolygonSchema.optional(),
  
  // Event properties (flexible)
  properties: z.record(z.unknown()).default({}),
  
  // Timestamps
  timestamp: z.string().datetime(), // Event occurrence time
  receivedAt: z.string().datetime(), // When we received it
  processedAt: z.string().datetime().optional(),
  
  // Processing metadata
  processingVersion: z.string().optional(),
  rawData: z.unknown().optional(), // Original source data for debugging
  
  // Deduplication
  deduplicationKey: z.string().optional(),
  
  // For crowd reports
  reporterId: z.string().optional(),
  reporterTrustScore: z.number().min(0).max(1).optional(),
});

export type DisasterEvent = z.infer<typeof DisasterEventSchema>;

/**
 * Alert Schema
 */
export const AlertSchema = z.object({
  _id: z.string().optional(),
  eventIds: z.array(z.string()).min(1),
  disasterType: DisasterTypeSchema,
  severity: SeveritySchema,
  confidence: z.number().min(0).max(1),
  
  // Alert location (epicenter/center)
  location: PointSchema,
  
  // Affected area polygon
  affectedArea: PolygonSchema.optional(),
  affectedPopulation: z.number().int().nonnegative().optional(),
  
  // Messages per language and channel
  messages: z.array(z.object({
    lang: z.string().min(2).max(5),
    channel: z.string(),
    content: z.string(),
    templateId: z.string().optional(),
  })).min(1),
  
  // CAP XML
  capXml: z.string(),
  
  // Status
  status: AlertStatusSchema.default('draft'),
  
  // Timestamps
  issuedAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  updatedAt: z.string().datetime().default(() => new Date().toISOString()),
  
  // Dispatch tracking
  dispatches: z.array(z.object({
    channel: z.string(),
    recipient: z.string(),
    status: z.enum(['pending', 'sent', 'delivered', 'failed', 'bounced']),
    sentAt: z.string().datetime().optional(),
    deliveredAt: z.string().datetime().optional(),
    error: z.string().optional(),
    providerResponse: z.unknown().optional(),
  })).default([]),
  
  // Audit
  issuedBy: z.string().optional(), // system | operator_id
  cancelReason: z.string().optional(),
  relatedAlerts: z.array(z.string()).default([]),
});

export type Alert = z.infer<typeof AlertSchema>;

/**
 * Crowd Report Schema
 */
export const CrowdReportSchema = z.object({
  _id: z.string().optional(),
  userId: z.string().optional(),
  anonymous: z.boolean().default(false),
  disasterType: DisasterTypeSchema,
  severity: z.enum(['info', 'minor', 'moderate', 'severe', 'critical']),
  location: PointSchema,
  description: z.string().min(10).max(5000),
  media: z.array(z.object({
    type: z.enum(['photo', 'video', 'audio']),
    url: z.string().url(),
    thumbnailUrl: z.string().url().optional(),
    mimeType: z.string(),
    size: z.number().int().positive(),
    metadata: z.record(z.unknown()).optional(),
  })).max(5).default([]),
  timestamp: z.string().datetime().default(() => new Date().toISOString()),
  status: z.enum(['pending', 'verified', 'rejected', 'escalated']).default('pending'),
  verification: z.object({
    verified: z.boolean().default(false),
    verifiedBy: z.string().optional(),
    verifiedAt: z.string().datetime().optional(),
    voteCount: z.number().int().default(0),
    agreeVotes: z.number().int().default(0),
    disagreeVotes: z.number().int().default(0),
    trustScore: z.number().min(0).max(1).optional(),
  }).default({}),
  contactInfo: z.string().optional(),
  clusterId: z.string().optional(),
});

export type CrowdReport = z.infer<typeof CrowdReportSchema>;

/**
 * User Schema
 */
export const UserSchema = z.object({
  _id: z.string().optional(),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/).optional(), // E.164
  email: z.string().email().optional(),
  name: z.string().min(1).max(100).optional(),
  language: z.string().min(2).max(5).default('en'),
  location: PointSchema.optional(),
  preferences: z.object({
    minSeverity: z.enum(['info', 'warning', 'alert', 'emergency']).default('warning'),
    channels: z.array(ChannelSchema).default(['push', 'sms']),
    quietHours: z.object({
      enabled: z.boolean().default(true),
      start: z.string().regex(/^\d{2}:\d{2}$/).default('22:00'),
      end: z.string().regex(/^\d{2}:\d{2}$/).default('07:00'),
      timezone: z.string().default('Asia/Kolkata'),
    }).default({}),
    autoExpandArea: z.boolean().default(true),
    expansionRadiusKm: z.number().int().positive().default(50),
    disasterTypes: z.array(DisasterTypeSchema).default([]), // empty = all
  }).default({}),
  active: z.boolean().default(true),
  createdAt: z.string().datetime().default(() => new Date().toISOString()),
  lastActiveAt: z.string().datetime().optional(),
  pushTokens: z.array(z.object({
    token: z.string(),
    platform: z.enum(['ios', 'android', 'web']),
    updatedAt: z.string().datetime(),
  })).default([]),
  trustScore: z.number().min(0).max(100).default(50),
  roles: z.array(z.enum(['user', 'operator', 'admin', 'verifier'])).default(['user']),
});

export type User = z.infer<typeof UserSchema>;

/**
 * Dispatch Record
 */
export const DispatchRecordSchema = z.object({
  channel: ChannelSchema,
  recipient: z.string(),
  status: z.enum(['pending', 'sent', 'delivered', 'failed', 'bounced', 'rejected']),
  sentAt: z.string().datetime().optional(),
  deliveredAt: z.string().datetime().optional(),
  failedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  providerResponse: z.unknown().optional(),
  retryCount: z.number().int().default(0),
  cost: z.number().optional(),
});

export type DispatchRecord = z.infer<typeof DispatchRecordSchema>;

/**
 * CAP Alert Schema (simplified for validation)
 */
export const CapAlertSchema = z.object({
  identifier: z.string(),
  sender: z.string().email(),
  sent: z.string().datetime(),
  status: z.enum(['Actual', 'Exercise', 'Test', 'Draft']),
  msgType: z.enum(['Alert', 'Update', 'Cancel', 'Ack', 'Error']),
  scope: z.enum(['Public', 'Restricted', 'Private']),
  info: z.array(z.object({
    language: z.string().min(2).max(5),
    category: z.enum(['Geo', 'Met', 'Safety', 'Security', 'Rescue', 'Fire', 'Health', 'Env', 'Transport', 'Infra', 'CBRNE', 'Other']),
    event: z.string(),
    urgency: z.enum(['Immediate', 'Expected', 'Future', 'Past', 'Unknown']),
    severity: z.enum(['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown']),
    certainty: z.enum(['Observed', 'Likely', 'Possible', 'Unlikely', 'Unknown']),
    effective: z.string().datetime().optional(),
    onset: z.string().datetime().optional(),
    expires: z.string().datetime().optional(),
    senderName: z.string().optional(),
    headline: z.string().max(160).optional(),
    description: z.string().optional(),
    instruction: z.string().optional(),
    contact: z.string().optional(),
    area: z.array(z.object({
      areaDesc: z.string(),
      polygon: z.array(z.number()).optional(),
      circle: z.tuple([z.number(), z.number(), z.number()]).optional(),
      geocode: z.array(z.object({
        valueName: z.string(),
        value: z.string(),
      })).optional(),
    })).optional(),
    parameter: z.array(z.object({
      valueName: z.string(),
      value: z.string(),
    })).optional(),
  })).min(1),
});

export type CapAlert = z.infer<typeof CapAlertSchema>;

/**
 * API Response Schemas
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
    }),
    timestamp: z.string().datetime(),
  });

export const ApiResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    data: itemSchema.optional(),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }).optional(),
    timestamp: z.string().datetime(),
  });

/**
 * WebSocket Event Schemas
 */
export const WSEventSchema = z.object({
  type: z.enum([
    'event:new',
    'event:update',
    'alert:issued',
    'alert:cancelled',
    'alert:expired',
    'crowd_report:new',
    'crowd_report:verified',
    'user:location_update',
    'system:status',
  ]),
  payload: z.unknown(),
  timestamp: z.string().datetime(),
});

export type WSEvent = z.infer<typeof WSEventSchema>;

/**
 * Export all schemas
 */
export const Schemas = {
  Position: PositionSchema,
  Point: PointSchema,
  Polygon: PolygonSchema,
  MultiPolygon: MultiPolygonSchema,
  Geometry: GeometrySchema,
  Feature: FeatureSchema,
  FeatureCollection: FeatureCollectionSchema,
  DisasterType: DisasterTypeSchema,
  Severity: SeveritySchema,
  AlertStatus: AlertStatusSchema,
  Channel: ChannelSchema,
  SourceType: SourceTypeSchema,
  DisasterEvent: DisasterEventSchema,
  Alert: AlertSchema,
  CrowdReport: CrowdReportSchema,
  User: UserSchema,
  DispatchRecord: DispatchRecordSchema,
  CapAlert: CapAlertSchema,
  WSEvent: WSEventSchema,
};

export type {
  DisasterEvent,
  Alert,
  CrowdReport,
  User,
  DispatchRecord,
  CapAlert,
  WSEvent,
  DisasterType,
  Severity,
  AlertStatus,
  Channel,
  SourceType,
};