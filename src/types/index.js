// Type definitions for PR-Alert Mobile App

export interface Position {
  lat: number;
  lon: number;
}

export interface GeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // [lon, lat]
}

export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

export interface DisasterEvent {
  _id: string;
  source: string;
  sourceId: string;
  disasterType: string;
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'EMERGENCY';
  confidence: number;
  location: GeoJSONPoint;
  area?: GeoJSONPolygon;
  properties: Record<string, any>;
  timestamp: string;
  receivedAt: string;
  processedAt?: string;
}

export interface Alert {
  _id: string;
  eventIds: string[];
  disasterType: string;
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'EMERGENCY';
  confidence: number;
  location: GeoJSONPoint;
  affectedArea?: GeoJSONPolygon;
  affectedPopulation?: number;
  messages: {
    lang: string;
    channel: string;
    content: string;
    templateId?: string;
  }[];
  capXml: string;
  status: 'draft' | 'issued' | 'active' | 'cancelled' | 'expired';
  issuedAt?: string;
  expiresAt?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  dispatches: DispatchRecord[];
  issuedBy?: string;
  cancelReason?: string;
  relatedAlerts?: string[];
}

export interface DispatchRecord {
  channel: string;
  recipient: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'rejected';
  sentAt?: string;
  deliveredAt?: string;
  failedAt?: string;
  error?: string;
  providerResponse?: any;
  retryCount?: number;
  cost?: number;
}

export interface CrowdReport {
  _id: string;
  userId?: string;
  anonymous: boolean;
  disasterType: string;
  severity: 'info' | 'minor' | 'moderate' | 'severe' | 'critical';
  location: GeoJSONPoint;
  description: string;
  media: {
    type: 'photo' | 'video' | 'audio';
    url: string;
    thumbnailUrl?: string;
    mimeType: string;
    size: number;
    metadata?: Record<string, any>;
  }[];
  timestamp: string;
  status: 'pending' | 'verified' | 'rejected' | 'escalated';
  verification: {
    verified: boolean;
    verifiedBy?: string;
    verifiedAt?: string;
    voteCount: number;
    agreeVotes: number;
    disagreeVotes: number;
    trustScore?: number;
  };
  contactInfo?: string;
  clusterId?: string;
}

export interface User {
  _id: string;
  phone?: string;
  email?: string;
  name?: string;
  language: string;
  location?: GeoJSONPoint;
  preferences: {
    minSeverity: 'INFO' | 'WARNING' | 'ALERT' | 'EMERGENCY';
    channels: string[];
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    };
    autoExpandArea: boolean;
    expansionRadiusKm: number;
    disasterTypes: string[];
  };
  active: boolean;
  createdAt: string;
  lastActiveAt?: string;
  pushTokens: {
    token: string;
    platform: 'ios' | 'android' | 'web';
    updatedAt: string;
  }[];
  trustScore: number;
  roles: ('user' | 'operator' | 'admin' | 'verifier')[];
}

export interface EngineStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting';
  lastUpdate: number;
  metrics: Record<string, any>;
  version: string;
}

export interface AppSettings {
  notificationsEnabled: boolean;
  locationEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  language: string;
  severityFilter: string[];
  disasterTypeFilter: string[];
  theme: 'dark' | 'light' | 'system';
  mapStyle: 'standard' | 'satellite' | 'hybrid';
  units: 'metric' | 'imperial';
}

export interface MapMarker {
  id: string;
  coordinate: { latitude: number; longitude: number };
  title: string;
  description?: string;
  disasterType: string;
  severity: 'INFO' | 'WARNING' | 'ALERT' | 'EMERGENCY';
  eventId?: string;
  alertId?: string;
}

export interface MapCluster {
  id: string;
  coordinate: { latitude: number; longitude: number };
  count: number;
  markers: MapMarker[];
  disasterType?: string;
}

export interface NotificationData {
  alertId: string;
  title: string;
  body: string;
  data: {
    alertId: string;
    disasterType: string;
    severity: string;
    location: GeoJSONPoint;
  };
}

export interface WebSocketEvent {
  type: 'event:new' | 'event:update' | 'alert:issued' | 'alert:cancelled' | 'alert:expired' | 'crowd_report:new' | 'crowd_report:verified' | 'user:location_update' | 'system:status';
  payload: any;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

export const SEVERITY_COLORS = {
  INFO: '#3B82F6',
  WARNING: '#F59E0B',
  ALERT: '#F97316',
  EMERGENCY: '#EF4444',
};

export const SEVERITY_LABELS = {
  INFO: 'Information',
  WARNING: 'Warning',
  ALERT: 'Alert',
  EMERGENCY: 'Emergency',
};

export const DISASTER_TYPE_LABELS = {
  earthquake: 'Earthquake',
  flood: 'Flood',
  cyclone: 'Cyclone',
  wildfire: 'Wildfire',
  landslide: 'Landslide',
  heatwave: 'Heat Wave',
  tsunami: 'Tsunami',
  air_quality: 'Air Quality',
};

export const DISASTER_TYPE_ICONS = {
  earthquake: 'pulse-outline',
  flood: 'water-outline',
  cyclone: 'tornado-outline',
  wildfire: 'flame-outline',
  landslide: 'triangle-outline',
  heatwave: 'thermometer-outline',
  tsunami: 'waves-outline',
  air_quality: 'cloud-outline',
};

export const DISASTER_TYPE_COLORS = {
  earthquake: '#8B5CF6',
  flood: '#3B82F6',
  cyclone: '#EC4899',
  wildfire: '#F97316',
  landslide: '#84CC16',
  heatwave: '#F59E0B',
  tsunami: '#06B6D4',
  air_quality: '#64748B',
};

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া' },
];

export const CHANNEL_TYPES = [
  { id: 'sms', label: 'SMS', icon: 'chatbubble-outline' },
  { id: 'push', label: 'Push Notification', icon: 'notifications-outline' },
  { id: 'email', label: 'Email', icon: 'mail-outline' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp' },
  { id: 'siren', label: 'Siren', icon: 'alert-circle-outline' },
  { id: 'cell_broadcast', label: 'Cell Broadcast', icon: 'radio-outline' },
  { id: 'operator_dashboard', label: 'Operator Dashboard', icon: 'desktop-outline' },
];

export const MAP_STYLES = [
  { id: 'standard', label: 'Standard', description: 'Default map style' },
  { id: 'satellite', label: 'Satellite', description: 'Satellite imagery' },
  { id: 'hybrid', label: 'Hybrid', description: 'Satellite with labels' },
];