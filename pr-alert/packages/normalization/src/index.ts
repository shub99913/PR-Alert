import { 
  DisasterEvent, 
  NormalizedEvent,
  DisasterType,
  Severity,
  SourceType,
  Feature,
  PointSchema,
  DisasterEventSchema
} from '@pr-alert/schemas';
import { createPoint, haversineDistance, bufferGeometry, createCircle } from '@pr-alert/geospatial';
import { config, createEngineLogger } from '@pr-alert/core';

const logger = createEngineLogger('normalization');

/**
 * Unit conversion utilities
 */
export function convertUnits(
  value: number, 
  fromUnit: string, 
  toUnit: string
): number | null {
  const conversions: Record<string, Record<string, number>> = {
    // Length
    'km': { 'm': 1000, 'mi': 0.621371, 'ft': 3280.84 },
    'm': { 'km': 0.001, 'mi': 0.000621371, 'ft': 3.28084 },
    'mi': { 'km': 1.60934, 'm': 1609.34, 'ft': 5280 },
    'ft': { 'km': 0.0003048, 'm': 0.3048, 'mi': 0.000189394 },
    
    // Speed
    'km/h': { 'm/s': 0.277778, 'mph': 0.621371, 'kt': 0.539957 },
    'm/s': { 'km/h': 3.6, 'mph': 2.23694, 'kt': 1.94384 },
    'mph': { 'km/h': 1.60934, 'm/s': 0.44704, 'kt': 0.868976 },
    'kt': { 'km/h': 1.852, 'm/s': 0.514444, 'mph': 1.15078 },
    
    // Pressure
    'hPa': { 'mb': 1, 'kPa': 0.1, 'inHg': 0.02953, 'mmHg': 0.750062 },
    'mb': { 'hPa': 1, 'kPa': 0.1, 'inHg': 0.02953, 'mmHg': 0.750062 },
    'kPa': { 'hPa': 10, 'mb': 10, 'inHg': 0.2953, 'mmHg': 7.50062 },
    'inHg': { 'hPa': 33.8639, 'mb': 33.8639, 'kPa': 3.38639, 'mmHg': 25.4 },
    'mmHg': { 'hPa': 1.33322, 'mb': 1.33322, 'kPa': 0.133322, 'inHg': 0.0393701 },
    
    // Temperature
    'C': { 'F': (c: number) => c * 9/5 + 32, 'K': (c: number) => c + 273.15 },
    'F': { 'C': (f: number) => (f - 32) * 5/9, 'K': (f: number) => (f - 32) * 5/9 + 273.15 },
    'K': { 'C': (k: number) => k - 273.15, 'F': (k: number) => (k - 273.15) * 9/5 + 32 },
  };
  
  if (fromUnit === toUnit) return value;
  
  const conversion = conversions[fromUnit]?.[toUnit];
  if (!conversion) return null;
  
  return typeof conversion === 'function' 
    ? conversion(value) 
    : value * conversion;
}

/**
 * Convert temperature
 */
export function convertTemperature(value: number, fromUnit: 'C' | 'F' | 'K', toUnit: 'C' | 'F' | 'K'): number {
  const result = convertUnits(value, fromUnit, toUnit);
  return result ?? value;
}

/**
 * Normalize magnitude value to standard scale (Mw)
 */
export function normalizeMagnitude(magnitude: number, scale: string): number {
  // Convert various magnitude scales to Mw (moment magnitude)
  const scaleConversions: Record<string, (m: number) => number> = {
    'Mw': (m) => m,
    'Mb': (m) => m <= 6.5 ? m + 0.15 : m + 0.25,  // Body wave magnitude
    'Ms': (m) => m <= 8.0 ? m - 0.2 : m - 0.4,    // Surface wave magnitude
    'Ml': (m) => m,                                 // Local magnitude (Richter)
    'Md': (m) => m,                                 // Duration magnitude
    'M': (m) => m,                                  // Generic
  };
  
  const converter = scaleConversions[scale] || scaleConversions['Mw'];
  return converter(magnitude);
}

/**
 * Normalize depth to kilometers
 */
export function normalizeDepth(depth: number, unit: string): number {
  return convertUnits(depth, unit, 'km') ?? depth;
}

/**
 * Normalize wind speed to km/h
 */
export function normalizeWindSpeed(speed: number, unit: string): number {
  const result = convertUnits(speed, unit, 'km/h');
  return result ?? speed;
}

/**
 * Normalize pressure to hPa
 */
export function normalizePressure(pressure: number, unit: string): number {
  const result = convertUnits(pressure, unit, 'hPa');
  return result ?? pressure;
}

/**
 * Normalize precipitation to mm
 */
export function normalizePrecipitation(value: number, unit: string): number {
  return convertUnits(value, unit, 'mm') ?? value;
}

/**
 * Disaster type normalization - map source-specific types to standard types
 */
export function normalizeDisasterType(sourceType: string, rawType: string): string {
  const typeMap: Record<string, Record<string, string>> = {
    'usgs': {
      'earthquake': 'earthquake',
      'quarry blast': 'explosion',
      'ice quake': 'earthquake',
      'volcanic eruption': 'volcano',
    },
    'gdacs': {
      'EQ': 'earthquake',
      'FL': 'flood',
      'TC': 'cyclone',
      'FL': 'flood',
      'VO': 'volcano',
      'DR': 'drought',
      'WF': 'wildfire',
    },
    'firms': {
      'fire': 'wildfire',
    },
    'imd': {
      'cyclone': 'cyclone',
      'heavy rainfall': 'flood',
      'heat wave': 'heatwave',
      'cold wave': 'cold_wave',
      'thunderstorm': 'thunderstorm',
    },
  };
  
  return typeMap[rawType]?.[rawType] || rawType;
}

/**
 * Normalize severity to standard levels
 */
export function normalizeSeverity(
  source: string,
  rawSeverity: string | number,
  disasterType: string
): 'info' | 'warning' | 'alert' | 'emergency' {
  // Source-specific severity mappings
  const severityMaps: Record<string, (s: string | number) => 'info' | 'warning' | 'alert' | 'emergency'> = {
    'usgs': (s) => {
      const mag = typeof s === 'number' ? s : parseFloat(String(s));
      if (mag >= 7.0) return 'emergency';
      if (mag >= 6.0) return 'alert';
      if (mag >= 5.0) return 'warning';
      return 'info';
    },
    'gdacs': (s) => {
      const severityMap: Record<string, 'info' | 'warning' | 'alert' | 'emergency'> = {
        'green': 'info',
        'yellow': 'warning',
        'orange': 'alert',
        'red': 'emergency',
      };
      return severityMap[String(s).toLowerCase()] || 'info';
    },
    'imd': (s) => {
      const severityMap: Record<string, 'info' | 'warning' | 'alert' | 'emergency'> = {
        'normal': 'info',
        'watch': 'warning',
        'alert': 'alert',
        'warning': 'emergency',
      };
      return severityMap[String(s).toLowerCase()] || 'info';
    },
  };
  
  const mapper = severityMaps[source];
  if (mapper && typeof rawSeverity !== 'undefined') {
    return mapper(rawSeverity);
  }
  
  // Generic numeric severity (0-1 scale)
  if (typeof rawSeverity === 'number') {
    if (rawSeverity >= 0.8) return 'emergency';
    if (rawSeverity >= 0.6) return 'alert';
    if (rawSeverity >= 0.4) return 'warning';
    return 'info';
  }
  
  // String severity
  const severityMap: Record<string, 'info' | 'warning' | 'alert' | 'emergency'> = {
    'info': 'info',
    'low': 'info',
    'minor': 'info',
    'moderate': 'warning',
    'medium': 'warning',
    'high': 'alert',
    'severe': 'alert',
    'critical': 'emergency',
    'extreme': 'emergency',
    'warning': 'warning',
    'alert': 'alert',
    'emergency': 'emergency',
  };
  
  return severityMap[String(rawSeverity).toLowerCase()] || 'info';
}

/**
 * Deduplication key generation
 */
export function generateDeduplicationKey(event: {
  source: string;
  disasterType: string;
  location: { coordinates: [number, number] };
  timestamp: Date;
  properties: Record<string, any>;
}): string {
  const [lon, lat] = event.location.coordinates;
  // Round coordinates to ~1km precision for dedup
  const latKey = Math.round(event.location.coordinates[1] * 100) / 100;
  const lonKey = Math.round(event.location.coordinates[0] * 100) / 100;
  
  // Time window: round to nearest hour
  const timeKey = new Date(event.timestamp).getTime();
  const hourKey = Math.floor(timeKey / (60 * 60 * 1000));
  
  // Include key properties for earthquake dedup
  const magKey = event.properties.magnitude ? Math.round(event.properties.magnitude * 10) / 10 : '';
  
  return `${event.source}:${event.disasterType}:${latKey}:${lonKey}:${hourKey}:${magKey}`;
}

/**
 * Event enrichment - add computed fields
 */
export async function enrichEvent(event: any): Promise<any> {
  const enriched = { ...event };
  
  // Add computed distance from major cities (placeholder)
  // enriched.distanceToMajorCities = await calculateDistancesToMajorCities(event.location);
  
  // Add affected radius for earthquakes
  if (event.disasterType === 'earthquake' && event.properties.magnitude) {
    const mag = event.properties.magnitude;
    // Empirical formula: log10(radius) = 0.5*M - 1.5
    const radiusKm = Math.pow(10, 0.5 * event.properties.magnitude - 1.5);
    event.properties.affectedRadiusKm = Math.round(radiusKm * 10) / 10;
  }
  
  // Add affected population estimate (placeholder)
  // enriched.properties.affectedPopulation = await estimatePopulation(event.area || event.location);
  
  return enriched;
}

/**
 * Deduplication engine
 */
export class DeduplicationEngine {
  private seenKeys = new Map<string, { event: any; timestamp: number }>();
  private maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  setMaxAge(ms: number): void {
    this.maxAge = ms;
  }
  
  isDuplicate(key: string): boolean {
    const existing = this.seenKeys.get(key);
    if (!existing) return false;
    
    // Check if entry is expired
    if (Date.now() - existing.timestamp > this.maxAge) {
      this.seenKeys.delete(key);
      return false;
    }
    
    return true;
  }
  
  add(key: string, event: any): void {
    this.seenKeys.set(key, { event, timestamp: Date.now() });
    this.cleanup();
  }
  
  getExisting(key: string): any | null {
    const existing = this.seenKeys.get(key);
    return existing?.event || null;
  }
  
  private cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.seenKeys.entries()) {
      if (now - value.timestamp > this.maxAge) {
        this.seenKeys.delete(key);
      }
    }
  }
  
  clear(): void {
    this.seenKeys.clear();
  }
  
  size(): number {
    return this.seenKeys.size;
  }
}

// Singleton instance
export const deduplicationEngine = new DeduplicationEngine();

export default {
  convertUnits,
  convertTemperature,
  normalizeMagnitude,
  normalizeDepth,
  normalizeWindSpeed,
  normalizePressure,
  normalizePrecipitation,
  normalizeDisasterType,
  normalizeSeverity,
  normalizeDepth,
  generateDeduplicationKey,
  enrichEvent,
  DeduplicationEngine,
  deduplicationEngine,
};