export interface DisasterEvent {
    id: string;
    source: 'usgs' | 'gdacs' | 'firms' | 'weather' | 'crowd';
    type: 'earthquake' | 'flood' | 'cyclone' | 'wildfire' | 'tsunami' | 'weather' | 'volcano' | 'news' | 'other';
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    magnitude?: number;
    depth?: number;
    severity: 'critical' | 'high' | 'moderate' | 'low';
    timestamp: string;
    url?: string;
    raw?: any;
}

export interface Alert {
    id: string;
    eventId?: string;
    type: string;
    severity: 'critical' | 'high' | 'moderate' | 'low';
    title: string;
    message: string;
    latitude: number;
    longitude: number;
    radius: number;
    channels: string[];
    deliveryStatus: Record<string, any>;
    createdAt: string;
    locationName?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    phone: string;
    language: string;
    latitude?: number;
    longitude?: number;
    registeredAt: string;
}

export interface CrowdReport {
    id: string;
    type: string;
    description: string;
    latitude: number;
    longitude: number;
    reporterName?: string;
    photoUrl?: string;
    createdAt: string;
}

export interface RiskData {
    latitude: number;
    longitude: number;
    radiusKm: number;
    riskScore: number;
    riskLevel: 'critical' | 'high' | 'moderate' | 'low';
    nearbyEventCount: number;
    topThreats: { id: string; type: string; severity: string; title: string }[];
}

export type Severity = 'critical' | 'high' | 'moderate' | 'low';

export const SEVERITY_COLORS: Record<Severity, string> = {
    critical: '#ff1744',
    high: '#ff9100',
    moderate: '#ffd600',
    low: '#00e676',
};

export const EVENT_TYPE_ICONS: Record<string, string> = {
    earthquake: '🔴',
    flood: '🌊',
    cyclone: '🌀',
    wildfire: '🔥',
    tsunami: '🌊',
    weather: '⛈️',
    volcano: '🌋',
    news: '📰',
    other: '⚠️',
};
