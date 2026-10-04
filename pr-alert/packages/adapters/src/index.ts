import { 
  DisasterEvent, 
  SourceType, 
  DisasterType, 
  Severity,
  Feature,
  FeatureCollection,
  PointSchema 
} from '@pr-alert/schemas';
import { createPoint, haversineDistance } from '@pr-alert/geospatial';
import { config, createEngineLogger } from '@pr-alert/core';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface RawEvent {
  sourceId: string;
  disasterType: string;
  rawData: any;
  fetchedAt: Date;
}

export interface AdapterConfig {
  name: SourceType;
  enabled: boolean;
  pollIntervalMs: number;
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

export interface NormalizedEvent {
  source: SourceType;
  sourceId: string;
  disasterType: string;
  severity: 'info' | 'warning' | 'alert' | 'emergency';
  confidence: number;
  location: { type: 'Point'; coordinates: [number, number] };
  area?: { type: 'Polygon'; coordinates: number[][][] };
  properties: Record<string, any>;
  timestamp: Date;
  rawData: any;
}

export abstract class BaseAdapter {
  protected name: SourceType;
  protected config: AdapterConfig;
  protected httpClient: AxiosInstance;
  protected logger = createEngineLogger(`adapter:${this.name}`);
  private pollTimer?: NodeJS.Timeout;
  private isRunning = false;

  constructor(adapterConfig: AdapterConfig) {
    this.config = adapterConfig;
    this.httpClient = axios.create({
      timeout: this.config.timeoutMs,
      headers: {
        'User-Agent': 'PR-Alert/1.0 (+https://pr-alert.org)',
      },
    });

    // Request interceptor for logging
    this.httpClient.interceptors.request.use((config) => {
      this.logger.debug({ url: config.url, method: config.method }, 'Outgoing request');
      return config;
    });

    // Response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.warn({ 
          url: error.config?.url, 
          status: error.response?.status,
          message: error.message 
        }, 'Request failed');
        return Promise.reject(error);
      }
    );
  }

  getName(): SourceType {
    return this.name;
  }

  getConfig(): AdapterConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Fetch raw events from the source
   */
  abstract fetchRawEvents(): Promise<RawEvent[]>;

  /**
   * Normalize raw event to standard format
   */
  abstract normalize(rawEvent: RawEvent): NormalizedEvent | NormalizedEvent[] | null;

  /**
   * Validate if the adapter can handle a given raw event
   */
  canHandle(rawData: any): boolean {
    return true;
  }

  /**
   * Start polling
   */
  startPolling(onEvents: (events: NormalizedEvent[]) => Promise<void>): void {
    if (this.isRunning) {
      this.logger.warn('Adapter already running');
      return;
    }

    if (!this.config.enabled) {
      this.logger.info('Adapter disabled, not starting');
      return;
    }

    this.isRunning = true;
    this.logger.info(`Starting polling every ${this.config.pollIntervalMs}ms`);

    // Initial fetch
    this.fetchAndProcess(onEvents).catch(err => 
      this.logger.error({ err }, 'Initial fetch failed')
    );

    // Set up interval
    this.pollTimer = setInterval(() => {
      this.fetchAndProcess(onEvents).catch(err => 
        this.logger.error({ err }, 'Polling fetch failed')
      );
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.isRunning = false;
    this.logger.info('Stopped polling');
  }

  /**
   * Fetch and process events with retry logic
   */
  private async fetchAndProcess(
    onEvents: (events: NormalizedEvent[]) => Promise<void>
  ): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const rawEvents = await this.fetchRawEvents();
        
        if (rawEvents.length === 0) {
          this.logger.debug('No events returned from source');
          return;
        }

        const normalizedEvents: NormalizedEvent[] = [];
        
        for (const rawEvent of rawEvents) {
          try {
            const normalized = this.normalize(rawEvent);
            if (normalized) {
              if (Array.isArray(normalized)) {
                normalizedEvents.push(...normalized);
              } else {
                normalizedEvents.push(normalized);
              }
            }
          } catch (err) {
            this.logger.warn({ err, rawEvent }, 'Failed to normalize event');
          }
        }

        if (normalizedEvents.length > 0) {
          this.logger.info({ count: normalizedEvents.length }, 'Normalized events ready');
          await onEvents(normalizedEvents);
        }

        return; // Success
      } catch (error) {
        lastError = error as Error;
        this.logger.warn({ attempt, maxRetries: this.config.maxRetries, error: error.message }, 'Fetch attempt failed');
        
        if (attempt < this.config.maxRetries) {
          await this.sleep(this.config.retryDelayMs * attempt);
        }
      }
    }

    this.logger.error({ err: lastError, maxRetries: this.config.maxRetries }, 'All retry attempts failed');
    throw lastError;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details?: any }> {
    try {
      const events = await this.fetchRawEvents();
      return { healthy: true, details: { lastEventCount: events.length } };
    } catch (error) {
      return { healthy: false, details: { error: (error as Error).message } };
    }
  }
}

/**
 * USGS Earthquake Adapter
 */
export class USGSAdapter extends BaseAdapter {
  name: SourceType = 'usgs';
  
  constructor() {
    super({
      name: 'usgs',
      enabled: true,
      pollIntervalMs: 5 * 60 * 1000, // 5 minutes
      timeoutMs: 30000,
      maxRetries: 3,
      retryDelayMs: 5000,
    });
  }

  async fetchRawEvents(): Promise<RawEvent[]> {
    const url = config.USGS_EARTHQUAKE_URL;
    
    this.logger.debug({ url }, 'Fetching USGS earthquake data');
    
    const response = await this.httpClient.get<FeatureCollection>(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.data.features) {
      throw new Error('Invalid USGS response: missing features');
    }

    return response.data.features.map((feature: Feature) => ({
      sourceId: feature.id,
      disasterType: 'earthquake',
      rawData: feature,
      fetchedAt: new Date(),
    }));
  }

  normalize(rawEvent: RawEvent): NormalizedEvent | null {
    const feature = rawEvent.rawData;
    const props = feature.properties;
    const coords = feature.geometry.coordinates;
    
    if (!coords || coords.length < 2) {
      this.logger.warn({ id: feature.id }, 'Missing coordinates');
      return null;
    }

    const [lon, lat, depth] = coords;
    const magnitude = props.mag ?? 0;
    const time = props.time ? new Date(props.time) : new Date();
    
    // Determine severity based on magnitude
    let severity: 'info' | 'warning' | 'alert' | 'emergency' = 'info';
    if (magnitude >= 7.0) severity = 'emergency';
    else if (magnitude >= 6.0) severity = 'alert';
    else if (magnitude >= 5.0) severity = 'warning';
    else if (magnitude >= 4.0) severity = 'info';
    
    // Confidence based on data quality
    let confidence = 0.9;
    if (props.status === 'reviewed') confidence = 0.95;
    else if (props.status === 'automatic') confidence = 0.8;
    
    // Reduce confidence for low-quality data
    if (props.gap && props.gap > 180) confidence -= 0.1;
    if (props.rms && props.rms > 1.0) confidence -= 0.1;
    if (props.nst && props.nst < 6) confidence -= 0.1;
    
    confidence = Math.max(0.3, Math.min(1.0, confidence));

    // Calculate affected radius based on magnitude (km)
    const affectedRadiusKm = this.calculateAffectedRadius(magnitude);

    return {
      source: 'usgs',
      sourceId: feature.id,
      disasterType: 'earthquake',
      severity,
      confidence,
      location: { type: 'Point', coordinates: [lon, lat] },
      properties: {
        magnitude,
        depth: depth ?? null,
        place: props.place,
        type: props.type,
        status: props.status,
        nst: props.nst,
        gap: props.gap,
        rms: props.rms,
        net: props.net,
        id: props.ids?.split(',')[0] || feature.id,
        affectedRadiusKm,
        mmi: props.mmi,
        cdi: props.cdi,
        alert: props.alert,
        tsunami: props.tsunami ?? 0,
      },
      timestamp: time,
      rawData: feature,
    };
  }

  /**
   * Calculate affected radius in km based on magnitude
   * Using empirical relationships (Wells & Coppersmith, 1994)
   */
  private calculateAffectedRadius(magnitude: number): number {
    if (magnitude < 4.0) return 10;
    if (magnitude < 5.0) return 20;
    if (magnitude < 6.0) return 50;
    if (magnitude < 7.0) return 100;
    if (magnitude < 8.0) return 200;
    return 300;
  }
}

/**
 * GDACS Adapter
 */
export class GDACSAdapter extends BaseAdapter {
  name: SourceType = 'gdacs';
  
  constructor() {
    super({
      name: 'gdacs',
      enabled: true,
      pollIntervalMs: 15 * 60 * 1000, // 15 minutes
      timeoutMs: 30000,
      maxRetries: 3,
      retryDelayMs: 10000,
    });
  }

  async fetchRawEvents(): Promise<RawEvent[]> {
    const url = `${config.GDACS_API_URL}?fromdate=${this.getFromDate()}&todate=${this.getToDate()}`;
    
    this.logger.debug({ url }, 'Fetching GDACS events');
    
    try {
      const response = await this.httpClient.get(url, {
        headers: { Accept: 'application/json' },
      });

      // GDACS returns XML, parse it
      // This is a simplified version - real implementation would use xml2js
      return [];
    } catch (error) {
      this.logger.warn({ error: error.message }, 'GDACS fetch failed');
      return [];
    }
  }

  normalize(rawEvent: RawEvent): NormalizedEvent | null {
    // Implement GDACS-specific normalization
    return null;
  }

  private getFromDate(): string {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
  }

  private getToDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * NASA FIRMS Fire Adapter
 */
export class FIRMSAdapter extends BaseAdapter {
  name: SourceType = 'firms';
  
  constructor() {
    super({
      name: 'firms',
      enabled: true,
      pollIntervalMs: 60 * 60 * 1000, // 1 hour
      timeoutMs: 60000,
      maxRetries: 2,
      retryDelayMs: 30000,
    });
  }

  async fetchRawEvents(): Promise<RawEvent[]> {
    // FIRMS provides CSV data
    // This is a placeholder - real implementation would parse CSV
    this.logger.debug('FIRMS adapter not fully implemented');
    return [];
  }

  normalize(rawEvent: RawEvent): NormalizedEvent | null {
    return null;
  }
}

/**
 * OpenWeatherMap Adapter
 */
export class OpenWeatherAdapter extends BaseAdapter {
  name: SourceType = 'openweather';
  
  constructor() {
    super({
      name: 'openweather',
      enabled: !!config.OPENWEATHER_API_KEY,
      pollIntervalMs: 10 * 60 * 1000, // 10 minutes
      timeoutMs: 20000,
      maxRetries: 3,
      retryDelayMs: 10000,
    });
  }

  async fetchRawEvents(): Promise<RawEvent[]> {
    if (!config.OPENWEATHER_API_KEY) {
      this.logger.warn('OpenWeather API key not configured');
      return [];
    }

    // Would fetch weather alerts for India region
    // This is a placeholder
    return [];
  }

  normalize(rawEvent: RawEvent): NormalizedEvent | null {
    return null;
  }
}

/**
 * IMD (India Meteorological Department) Adapter
 */
export class IMDAdapter extends BaseAdapter {
  name: SourceType = 'imd';
  
  constructor() {
    super({
      name: 'imd',
      enabled: false, // Requires API access
      pollIntervalMs: 10 * 60 * 1000,
      timeoutMs: 30000,
      maxRetries: 3,
      retryDelayMs: 10000,
    });
  }

  async fetchRawEvents(): Promise<RawEvent[]> {
    // IMD weather alerts and cyclone warnings
    // Requires official API access
    return [];
  }

  normalize(rawEvent: RawEvent): NormalizedEvent | null {
    return null;
  }
}

/**
 * Adapter Registry
 */
export class AdapterRegistry {
  private adapters: Map<SourceType, BaseAdapter> = new Map();
  private logger = createEngineLogger('adapter-registry');
  private eventCallback?: (events: any[]) => Promise<void>;

  register(adapter: BaseAdapter): void {
    if (this.adapters.has(adapter.getName())) {
      this.logger.warn({ name: adapter.getName() }, 'Adapter already registered, replacing');
    }
    this.adapters.set(adapter.getName(), adapter);
    this.logger.info({ name: adapter.getName() }, 'Adapter registered');
  }

  unregister(name: SourceType): void {
    const adapter = this.adapters.get(name);
    if (adapter) {
      adapter.stopPolling();
      this.adapters.delete(name);
      this.logger.info({ name }, 'Adapter unregistered');
    }
  }

  get(name: SourceType): BaseAdapter | undefined {
    return this.adapters.get(name);
  }

  getAll(): BaseAdapter[] {
    return Array.from(this.adapters.values());
  }

  getEnabled(): BaseAdapter[] {
    return this.getAll().filter(a => a.isEnabled());
  }

  setEventCallback(callback: (events: any[]) => Promise<void>): void {
    this.eventCallback = callback;
  }

  async startAll(): Promise<void> {
    if (!this.eventCallback) {
      throw new Error('Event callback not set');
    }

    for (const adapter of this.getEnabled()) {
      try {
        adapter.startPolling(this.eventCallback);
        this.logger.info({ name: adapter.getName() }, 'Adapter started');
      } catch (error) {
        this.logger.error({ err: error, name: adapter.getName() }, 'Failed to start adapter');
      }
    }
  }

  async stopAll(): Promise<void> {
    for (const adapter of this.getAll()) {
      adapter.stopPolling();
    }
    this.logger.info('All adapters stopped');
  }

  async healthCheckAll(): Promise<Record<SourceType, { healthy: boolean; details?: any }>> {
    const results: Record<string, any> = {};
    
    for (const [name, adapter] of this.adapters) {
      results[name] = await adapter.healthCheck();
    }
    
    return results as Record<SourceType, { healthy: boolean; details?: any }>;
  }
}

// Factory function to create default registry
export function createDefaultAdapterRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  
  registry.register(new USGSAdapter());
  registry.register(new GDACSAdapter());
  registry.register(new FIRMSAdapter());
  registry.register(new OpenWeatherAdapter());
  registry.register(new IMDAdapter());
  
  return registry;
}

export { BaseAdapter, AdapterConfig, RawEvent, NormalizedEvent, AdapterRegistry };
export { USGSAdapter, GDACSAdapter, FIRMSAdapter, OpenWeatherAdapter, IMDAdapter };