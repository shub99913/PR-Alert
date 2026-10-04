
/**
 * E05: USGS Earthquake Adapter
 * Adapted for React Native/Expo mobile environment
 * 
 * Responsibilities:
 * - Convert USGS GeoJSON earthquake data to our internal event format
 * - Handle different USGS feed formats (summary, significant, etc.)
 * - Extract relevant fields and map to our schema
 * - Provide validation and error handling
 */

import BaseAdapter from './BaseAdapter';

class UsgsAdapter extends BaseAdapter {
  constructor() {
    super('usgs');
    this.sourceName = 'USGS Earthquake Hazards Program';
  }

  /**
   * Normalize USGS GeoJSON data to our internal event format
   * @param {Object} rawData - USGS GeoJSON response
   * @returns {Array} Array of normalized event objects
   */
  normalize(rawData) {
    try {
      this.log('info', `Normalizing USGS data with ${rawData.features?.length || 0} features`);
      
      if (!rawData || !rawData.features || !Array.isArray(rawData.features)) {
        this.log('warn', 'Invalid USGS data format received');
        return [];
      }
      
      const events = rawData.features
        .map(feature => this.normalizeFeature(feature))
        .filter(event => event !== null); // Remove any null/invalid events
      
      this.log('info', `Normalized ${events.length} USGS earthquake events`);
      return events;
    } catch (error) {
      this.log('error', `Failed to normalize USGS data: ${error.message}`);
      return []; // Return empty array on error to prevent pipeline failure
    }
  }

  /**
   * Normalize a single USGS GeoJSON feature
   * @param {Object} feature - Single GeoJSON feature from USGS
   * @returns {Object|null} Normalized event object or null if invalid
   */
  normalizeFeature(feature) {
    try {
      // Validate feature has required structure
      if (!feature || !feature.properties || !feature.geometry) {
        this.log('warn', 'USGS feature missing required properties or geometry');
        return null;
      }
      
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      // Validate coordinates (USGS format: [longitude, latitude, depth])
      if (!Array.isArray(coords) || coords.length < 2) {
        this.log('warn', 'USGS feature has invalid coordinates');
        return null;
      }
      
      const longitude = coords[0];
      const latitude = coords[1];
      const depth = coords.length >= 3 ? coords[2] : null; // Depth in km
      
      // Validate coordinate ranges
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        this.log('warn', `USGS feature has invalid coordinates: ${latitude}, ${longitude}`);
        return null;
      }
      
      // Determine event type based on USGS data
      // USGS primarily provides earthquake data, but we can check for other types
      let eventType = 'earthquake';
      let subtype = null;
      
      // Check if this is actually something else (though USGS is mainly earthquakes)
      if (props.type === 'quarry' || props.type === 'mine blast') {
        eventType = 'man_made';
        subtype = props.type;
      } else if (props.type === 'landslide') {
        eventType = 'landslide';
      }
      // Default is earthquake
      
      // Calculate severity based on magnitude
      const magnitude = props.mag !== null ? props.mag : 0;
      let severity = 'INFO';
      
      if (magnitude >= 8.0) {
        severity = 'EMERGENCY';
      } else if (magnitude >= 7.0) {
        severity = 'ALERT';
      } else if (magnitude >= 6.0) {
        severity = 'ALERT'; 
      } else if (magnitude >= 5.0) {
        severity = 'WARNING';
      } else if (magnitude >= 4.0) {
        severity = 'WARNING';
      } else {
        severity = 'INFO';
      }
      
      // Calculate confidence based on data quality indicators
      // USGS provides various quality metrics we can use
      let confidence = 50; // Base confidence
      
      // Increase confidence based on number of stations
      if (props.nst !== null && props.nst > 0) {
        confidence += Math.min(props.nst * 2, 30); // Up to 30 extra for station count
      }
      
      // Decrease confidence based on RMS (higher RMS = lower quality)
      if (props.rms !== null) {
        const rmsPenalty = Math.min(props.rms * 10, 20); // Up to 20 penalty for high RMS
        confidence -= rmsPenalty;
      }
      
      // Increase confidence based on gap (smaller gap = better azimuthal coverage)
      if (props.gap !== null) {
        const gapBonus = Math.max(0, (180 - props.gap)) / 2; // Bonus for gap < 180
        confidence += Math.min(gapBonus, 20); // Up to 20 bonus
      }
      
      // Ensure confidence is in valid range
      confidence = Math.max(0, Math.min(100, Math.round(confidence)));
      
      // Build the normalized event
      const event = {
        // Core identifiers
        id: `usgs_${feature.id}`, // Prefix to avoid conflicts with other sources
        source: 'usgs',
        sourceId: feature.id, // USGS event ID
        
        // Event classification
        type: eventType,
        subtype: subtype,
        
        // Temporal data
        timestamp: props.time !== null ? props.time : Date.now(),
        updatedAt: props.updated !== null ? props.updated : Date.now(),
        
        // Geospatial data
        location: {
          latitude: latitude,
          longitude: longitude,
          accuracy: Math.max(1000, Math.abs(depth || 0) * 1000), // Rough accuracy estimate
          altitude: depth !== null ? -depth * 1000 : null // Convert depth km to negative altitude in meters
        },
        
        // Event properties (earthquake-specific)
        properties: {
          magnitude: magnitude,
          magnitudeType: props.magType || null,
          place: props.place || null,
          felt: props.felt !== null ? props.felt : 0,
          cdi: props.cdi || null, // Community Decimal Intensity
          mmi: props.mmi || null, // Modified Mercalli Intensity
          alert: props.alert || null, // alert level (green, yellow, orange, red)
          tsunami: props.tsunami !== null ? props.tsunami === 1 : 0,
          sig: props.sig || null, // significance score
          net: props.net || null, // network
          code: props.code || null, // event code
          ids: props.ids || null, // comma-separated list of related event IDs
          sources: props.sources || null, // comma-separated list of contributing sources
          types: props.types || null, // comma-separated list of event types
          nst: props.nst || null, // number of stations
          dmin: props.dmin || null, // minimum horizontal distance from stations to event
          rms: props.rms || null, // root mean square of travel time residuals
          gap: props.gap || null, // azimuthal gap
          magType: props.magType || null, // magnitude type
          type: props.type || null // USGS event type (quarry, earthquake, etc.)
        },
        
        // Severity and impact
        severity: severity,
        confidence: confidence,
        
        // Affected area (approximate based on magnitude)
        affectedArea: {
          radius: this.calculateAffectedRadius(magnitude),
          places: this.extractPlaceNames(props.place || '')
        },
        
        // Metadata
        metadata: {
          ingestedAt: Date.now(),
          processedBy: ['E05_USGS_Adapter'],
          tags: ['usgs', 'earthquake', magnitude >= 5.0 ? 'significant' : 'minor'],
          rawData: JSON.stringify({
            type: 'Feature',
            properties: props,
            geometry: feature.geometry
          })
        }
      };
      
      return event;
    } catch (error) {
      this.log('error', `Failed to normalize USGS feature: ${error.message}`, { featureId: feature.id });
      return null;
    }
  }

  /**
   * Calculate approximate affected radius based on magnitude
   * This is a simplified model - real implementation would use more sophisticated models
   * @param {number} magnitude - Earthquake magnitude
   * @returns {number} Radius in meters
   */
  calculateAffectedRadius(magnitude) {
    // Simplified radius calculation based on magnitude
    // These are rough estimates for demonstration purposes
    if (magnitude >= 8.0) return 500000; // 500km
    if (magnitude >= 7.0) return 200000; // 200km
    if (magnitude >= 6.0) return 50000;  // 50km
    if (magnitude >= 5.0) return 10000;  // 10km
    if (magnitude >= 4.0) return 5000;   // 5km
    return 1000; // 1km for smaller quakes
  }

  /**
   * Extract place names from USGS place string
   * @param {string} placeString - USGS place description (e.g., "10km NE of Delhi, India")
   * @returns {Array} Array of place names
   */
  extractPlaceNames(placeString) {
    if (!placeString || typeof placeString !== 'string') {
      return [];
    }
    
    // Simple extraction - in reality, would use geocoding or NLP
    const places = [];
    
    // Look for common patterns like "of [PLACE], [COUNTRY]"
    const ofMatch = placeString.match/of\s+([^,]+)(?:,\s*([^,]+))?/i;
    if (ofMatch) {
      if (ofMatch[1]) places.push(ofMatch[1].trim());
      if (ofMatch[2]) places.push(ofMatch[2].trim());
    }
    
    // Also look for standalone place names (simplified)
    const words = placeString.split(/\s+|,\s*/);
    const knownPlaces = ['Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Bangalore', 'Hyderabad', 'Pune', 'Ahmedabad'];
    words.forEach(word => {
      if (knownPlaces.includes(word) && !places.includes(word)) {
        places.push(word);
      }
    });
    
    return places.filter(place => place.length > 0); // Remove empty strings
  }

  /**
   * Validate that we can handle the given raw data
   * @param {any} rawData - Raw data to validate
   * @returns {boolean} True if this appears to be USGS GeoJSON data
   */
  canHandle(rawData) {
    if (!rawData || typeof rawData !== 'object') {
      return false;
    }
    
    // Check for USGS GeoJSON characteristics
    return (
      rawData.type === 'FeatureCollection' &&
      Array.isArray(rawData.features) &&
      rawData.features.length > 0 &&
      rawData.features[0] &&
      rawData.features[0].type === 'Feature' &&
      rawData.features[0].properties &&
      rawData.features[0].properties.time !== undefined &&
      rawData.features[0].properties.mag !== undefined
    );
  }

  /**
   * Get metadata about this adapter
   * @returns {Object} Adapter information
   */
  getInfo() {
    return {
      ...super.getInfo(),
      description: 'Converts USGS GeoJSON earthquake data to internal event format',
      supportedFormats: ['GeoJSON FeatureCollection'],
      typicalLatency: '5 minutes (polling interval)',
      dataSource: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/'
    };
  }
}

// Export singleton instance
const usgsAdapter = new UsgsAdapter();
export default usgsAdapter;
