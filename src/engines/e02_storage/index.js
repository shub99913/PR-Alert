
/**
 * E02: Event Schema & Storage Engine
 * Adapted for React Native/Expo mobile environment
 * 
 * Responsibilities:
 * - Define what a disaster event looks like (schema)
 * - Store all data in a queryable database
 * - Prevent duplicates
 * - Provide data access layer for other engines
 */

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Event schema definition
const EVENT_SCHEMA = {
  // Core identifiers
  id: { type: 'string', required: true }, // Unique event ID (UUID or source-specific)
  source: { type: 'string', required: true }, // Data source (usgs, openweather, etc.)
  sourceId: { type: 'string', required: true }, // ID from the source system
  
  // Event classification
  type: { type: 'string', required: true }, // earthquake, flood, cyclone, etc.
  subtype: { type: 'string' }, // More specific classification (e.g., flash_flood, tropical_cyclone)
  
  // Temporal data
  timestamp: { type: 'number', required: true }, // Unix timestamp in milliseconds
  updatedAt: { type: 'number' }, // Last update time
  
  // Geospatial data
  location: {
    type: 'object',
    required: true,
    properties: {
      latitude: { type: 'number', required: true },
      longitude: { type: 'number', required: true },
      accuracy: { type: 'number' }, // Accuracy in meters
      altitude: { type: 'number' }, // Elevation in meters
    }
  },
  
  // Event properties (varies by type)
  properties: {
    type: 'object',
    required: true
  },
  
  // Severity and impact
  severity: { 
    type: 'string', 
    enum: ['INFO', 'WARNING', 'ALERT', 'EMERGENCY'], 
    default: 'INFO' 
  },
  confidence: { 
    type: 'number', 
    min: 0, 
    max: 100, 
    default: 0 
  }, // 0-100%
  
  // Affected area
  affectedArea: {
    type: 'object',
    properties: {
      radius: { type: 'number' }, // Radius in meters from location
      geojson: { type: 'object' }, // GeoJSON polygon for complex areas
      places: { type: 'array', items: { type: 'string' } } // Affected place names
    }
  },
  
  // Metadata
  metadata: {
    type: 'object',
    properties: {
      ingestedAt: { type: 'number' }, // When we received this event
      processedBy: { type: 'array', items: { type: 'string' } }, // List of engines that processed this
      tags: { type: 'array', items: { type: 'string' } },
      rawData: { type: 'string' } // Original data from source (for debugging)
    }
  }
};

// Event types supported
const EVENT_TYPES = {
  EARTHQUAKE: 'earthquake',
  FLOOD: 'flood',
  CYCLONE: 'cyclone',
  WILDFIRE: 'wildfire',
  TSUNAMI: 'tsunami',
  VOLCANO: 'volcano',
  LANDSLIDE: 'landslide',
  EXTREME_WEATHER: 'extreme_weather',
  MAN_MADE: 'man_made'
};

// Storage keys
const STORAGE_KEYS = {
  EVENTS: 'disaster_events',
  EVENT_INDEX: 'disaster_event_index', // For quick lookup by sourceId
  LAST_SYNC: 'disaster_last_sync',
  ENGINE_STATUS: 'disaster_engine_status'
};

class EventStorageEngine {
  constructor() {
    this.isInitialized = false;
    this.events = []; // In-memory cache
    this.eventIndex = new Map(); // sourceId -> eventId mapping for deduplication
  }

  /**
   * Initialize the storage engine
   * Loads events from persistent storage and sets up indices
   */
  async initialize() {
    try {
      await this.loadFromStorage();
      this.buildIndex();
      this.isInitialized = true;
      this.log('info', 'Event Storage Engine (E02) initialized successfully');
      
      // Update engine status
      await this.updateEngineStatus('E02', 'active');
      
      return true;
    } catch (error) {
      this.log('error', `Failed to initialize Event Storage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load events from persistent storage (AsyncStorage)
   */
  async loadFromStorage() {
    try {
      const eventsJson = await AsyncStorage.getItem(STORAGE_KEYS.EVENTS);
      const indexJson = await AsyncStorage.getItem(STORAGE_KEYS.EVENT_INDEX);
      
      if (eventsJson) {
        this.events = JSON.parse(eventsJson);
      } else {
        this.events = [];
      }
      
      if (indexJson) {
        const indexData = JSON.parse(indexJson);
        // Rebuild Map from array
        this.eventIndex = new Map(Object.entries(indexData));
      } else {
        this.eventIndex = new Map();
      }
      
      this.log('info', `Loaded ${this.events.length} events from storage`);
    } catch (error) {
      this.log('warn', `Could not load from storage, starting fresh: ${error.message}`);
      this.events = [];
      this.eventIndex = new Map();
    }
  }

  /**
   * Save events to persistent storage
   */
  async saveToStorage() {
    try {
      // Save events
      await AsyncStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(this.events));
      
      // Save index (convert Map to plain object for JSON serialization)
      const indexObject = Object.fromEntries(this.eventIndex);
      await AsyncStorage.setItem(STORAGE_KEYS.EVENT_INDEX, JSON.stringify(indexObject));
      
      this.log('debug', `Saved ${this.events.length} events to storage`);
    } catch (error) {
      this.log('error', `Failed to save events to storage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build search indices for fast lookup
   */
  buildIndex() {
    this.eventIndex.clear();
    this.events.forEach(event => {
      if (event.sourceId) {
        this.eventIndex.set(event.sourceId, event.id);
      }
    });
    this.log('debug', `Built index for ${this.eventIndex.size} events`);
  }

  /**
   * Validate an event against the schema
   * @param {Object} event - Event to validate
   * @returns {Object} { isValid: boolean, errors: Array<string> }
   */
  validateEvent(event) {
    const errors = [];
    
    // Check required fields
    const requiredFields = ['id', 'source', 'sourceId', 'type', 'timestamp', 'location'];
    for (const field of requiredFields) {
      if (!(field in event) || event[field] === undefined || event[field] === null) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate location object
    if (event.location) {
      if (typeof event.location.latitude !== 'number' || 
          typeof event.location.longitude !== 'number') {
        errors.push('Location must have valid latitude and longitude numbers');
      }
      
      // Basic coordinate validation
      if (event.location.latitude < -90 || event.location.latitude > 90) {
        errors.push('Latitude must be between -90 and 90');
      }
      if (event.location.longitude < -180 || event.location.longitude > 180) {
        errors.push('Longitude must be between -180 and 180');
      }
    }
    
    // Validate timestamp
    if (event.timestamp !== undefined) {
      if (typeof event.timestamp !== 'number' || event.timestamp <= 0) {
        errors.push('Timestamp must be a positive number');
      }
      
      // Check if timestamp is reasonable (not too far in past/future)
      const now = Date.now();
      const oneYear = 365 * 24 * 60 * 60 * 1000;
      if (Math.abs(event.timestamp - now) > oneYear * 2) { // Allow 2 years variance
        errors.push('Timestamp seems unreasonable (too far from current time)');
      }
    }
    
    // Validate severity
    if (event.severity && !['INFO', 'WARNING', 'ALERT', 'EMERGENCY'].includes(event.severity)) {
      errors.push('Severity must be one of: INFO, WARNING, ALERT, EMERGENCY');
    }
    
    // Validate confidence
    if (event.confidence !== undefined && 
        (typeof event.confidence !== 'number' || 
         event.confidence < 0 || event.confidence > 100)) {
      errors.push('Confidence must be a number between 0 and 100');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Add a new event to storage
   * Handles deduplication based on sourceId
   * @param {Object} event - Event to add
   * @returns {Object} { success: boolean, eventId: string, isDuplicate: boolean }
   */
  async addEvent(event) {
    // Validate event
    const validation = this.validateEvent(event);
    if (!validation.isValid) {
      this.log('warn', `Invalid event rejected: ${validation.errors.join(', ')}`);
      return { success: false, errors: validation.errors };
    }
    
    // Ensure we have an ID
    if (!event.id) {
      event.id = this.generateEventId();
    }
    
    // Set timestamps if not provided
    const now = Date.now();
    if (!event.timestamp) {
      event.timestamp = now;
    }
    if (!event.updatedAt) {
      event.updatedAt = now;
    }
    if (!event.metadata.ingestedAt) {
      event.metadata.ingestedAt = now;
    }
    
    // Check for duplicate by sourceId
    let isDuplicate = false;
    let existingEventId = null;
    
    if (event.sourceId && this.eventIndex.has(event.sourceId)) {
      existingEventId = this.eventIndex.get(event.sourceId);
      isDuplicate = true;
      
      // For duplicates, we might want to update the existing event
      // depending on the source and data freshness
      const existingEvent = this.events.find(e => e.id === existingEventId);
      if (existingEvent) {
        // Simple strategy: keep the newer event
        if (event.timestamp >= existingEvent.timestamp) {
          // Replace the existing event with newer data
          await this.updateEvent(existingEventId, event);
          this.log('info', `Updated duplicate event from ${event.source}:${event.sourceId}`);
          return { success: true, eventId: existingEventId, isDuplicate: true, updated: true };
        } else {
          // Ignore older duplicate
          this.log('info', `Ignored older duplicate event from ${event.source}:${event.sourceId}`);
          return { success: true, eventId: existingEventId, isDuplicate: true, ignored: true };
        }
      }
    }
    
    // Add new event
    this.events.push(event);
    
    // Update index
    if (event.sourceId) {
      this.eventIndex.set(event.sourceId, event.id);
    }
    
    // Persist to storage
    await this.saveToStorage();
    
    this.log('info', `Added new event: ${event.type} from ${event.source} (ID: ${event.id})`);
    
    return { success: true, eventId: event.id, isDuplicate: false };
  }

  /**
   * Update an existing event
   * @param {string} eventId - ID of event to update
   * @param {Object} updates - Partial event object with fields to update
   * @returns {Object} { success: boolean, event: Object }
   */
  async updateEvent(eventId, updates) {
    const index = this.events.findIndex(event => event.id === eventId);
    if (index === -1) {
      return { success: false, error: 'Event not found' };
    }
    
    // Merge updates with existing event
    const updatedEvent = {
      ...this.events[index],
      ...updates,
      updatedAt: Date.now() // Always update timestamp
    };
    
    // Validate the updated event
    const validation = this.validateEvent(updatedEvent);
    if (!validation.isValid) {
      this.log('warn', `Invalid event update rejected: ${validation.errors.join(', ')}`);
      return { success: false, errors: validation.errors };
    }
    
    // Replace in array
    this.events[index] = updatedEvent;
    
    // Persist changes
    await this.saveToStorage();
    
    this.log('info', `Updated event: ${eventId}`);
    
    return { success: true, event: updatedEvent };
  }

  /**
   * Get an event by ID
   * @param {string} eventId - Event ID to lookup
   * @returns {Object|null} Event object or null if not found
   */
  getEventById(eventId) {
    return this.events.find(event => event.id === eventId) || null;
  }

  /**
   * Get an event by sourceId (for deduplication checking)
   * @param {string} sourceId - Source-specific ID
   * @returns {Object|null} Event object or null if not found
   */
  getEventBySourceId(sourceId) {
    if (!sourceId) return null;
    const eventId = this.eventIndex.get(sourceId);
    if (!eventId) return null;
    return this.getEventById(eventId);
  }

  /**
   * Get events by type
   * @param {string} type - Event type (earthquake, flood, etc.)
   * @param {number} limit - Maximum number of events to return
   * @param {number} offset - Offset for pagination
   * @returns {Array} Matching events
   */
  getEventsByType(type, limit = 50, offset = 0) {
    const filtered = this.events
      .filter(event => event.type === type)
      .sort((a, b) => b.timestamp - a.timestamp); // Newest first
    
    return filtered.slice(offset, offset + limit);
  }

  /**
   * Get events by time range
   * @param {number} startTime - Start timestamp (inclusive)
   * @param {number} endTime - End timestamp (inclusive)
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Matching events
   */
  getEventsByTimeRange(startTime, endTime, limit = 100) {
    const filtered = this.events
      .filter(event => event.timestamp >= startTime && event.timestamp <= endTime)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return filtered.slice(0, limit);
  }

  /**
   * Get events near a location
   * @param {Object} center - { latitude: number, longitude: number }
   * @param {number} radiusMeters - Search radius in meters
   * @param {number} limit - Maximum number of events to return
   * @returns {Array} Matching events with distance
   */
  getEventsNearLocation(center, radiusMeters, limit = 50) {
    if (!center.latitude || !center.longitude) {
      return [];
    }
    
    const eventsWithDistance = this.events
      .map(event => {
        if (!event.location || !event.location.latitude || !event.location.longitude) {
          return null;
        }
        
        const distance = this.calculateDistance(
          center.latitude, center.longitude,
          event.location.latitude, event.location.longitude
        );
        
        return distance <= radiusMeters 
          ? { ...event, distance: distance } 
          : null;
      })
      .filter(event => event !== null)
      .sort((a, b) => a.distance - b.distance); // Closest first
    
    return eventsWithDistance.slice(0, limit);
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @returns {number} Distance in meters
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  /**
   * Remove old events to prevent storage bloat
   * @param {number} maxAgeMs - Maximum age in milliseconds to keep events
   */
  async pruneOldEvents(maxAgeMs = 30 * 24 * 60 * 60 * 1000) { // Default 30 days
    const cutoffTime = Date.now() - maxAgeMs;
    
    const initialCount = this.events.length;
    this.events = this.events.filter(event => 
      event.timestamp >= cutoffTime || 
      event.severity === 'EMERGENCY' // Always keep emergencies
    );
    
    const removedCount = initialCount - this.events.length;
    
    if (removedCount > 0) {
      // Rebuild index after removal
      this.buildIndex();
      
      // Save to storage
      await this.saveToStorage();
      
      this.log('info', `Pruned ${removedCount} old events (older than ${maxAgeMs}ms)`);
    }
    
    return removedCount;
  }

  /**
   * Get storage statistics
   * @returns {Object} Storage stats
   */
  getStatistics() {
    const typeCounts = {};
    this.events.forEach(event => {
      typeCounts[event.type] = (typeCounts[event.type] || 0) + 1;
    });
    
    const severityCounts = {};
    this.events.forEach(event => {
      severityCounts[event.severity] = (severityCounts[event.severity] || 0) + 1;
    });
    
    return {
      totalEvents: this.events.length,
      indexedEvents: this.eventIndex.size,
      typeCounts,
      severityCounts,
      oldestEvent: this.events.length > 0 
        ? Math.min(...this.events.map(e => e.timestamp)) 
        : null,
      newestEvent: this.events.length > 0 
        ? Math.max(...this.events.map(e => e.timestamp)) 
        : null,
      storageSizeEstimate: JSON.stringify(this.events).length // Rough estimate
    };
  }

  /**
   * Generate a unique event ID
   * @returns {string} UUID-like identifier
   */
  generateEventId() {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Set up logging (simplified version)
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    if (__DEV__) {
      console.log(`[E02_Storage][${level.toUpperCase()}] ${message}`, metadata);
    }
    // In production, might send to centralized logging
  }

  /**
   * Update engine status in storage
   */
  async updateEngineStatus(engineId, status) {
    try {
      const statusJson = await AsyncStorage.getItem(STORAGE_KEYS.ENGINE_STATUS);
      const engineStatus = statusJson ? JSON.parse(statusJson) : {};
      
      engineStatus[engineId] = {
        status: status,
        lastUpdated: Date.now(),
        engine: engineId
      };
      
      await AsyncStorage.setItem(STORAGE_KEYS.ENGINE_STATUS, JSON.stringify(engineStatus));
    } catch (error) {
      this.log('warn', `Could not update engine status: ${error.message}`);
    }
  }

  /**
   * Get engine status
   */
  async getEngineStatus() {
    try {
      const statusJson = await AsyncStorage.getItem(STORAGE_KEYS.ENGINE_STATUS);
      return statusJson ? JSON.parse(statusJson) : {};
    } catch (error) {
      this.log('error', `Could not get engine status: ${error.message}`);
      return {};
    }
  }

  /**
   * Clear all events (for testing/reset)
   * @param {boolean} confirm - Safety check
   */
  async clearAllEvents(confirm = false) {
    if (!confirm) {
      throw new Error('Must confirm with true to clear all events');
    }
    
    this.events = [];
    this.eventIndex.clear();
    
    await AsyncStorage.removeItem(STORAGE_KEYS.EVENTS);
    await AsyncStorage.removeItem(STORAGE_KEYS.EVENT_INDEX);
    
    this.log('info', 'All events cleared from storage');
    
    return { success: true, message: 'All events cleared' };
  }
}

// Export singleton instance
const storageEngine = new EventStorageEngine();
export default storageEngine;
