
/**
 * E03: Geospatial Utility Engine
 * Adapted for React Native/Expo mobile environment
 * 
 * Responsibilities:
 * - Compute distances between points (Haversine formula)
 * - Check if a point is inside a zone (point-in-polygon)
 * - Calculate area sizes
 * - Perform coordinate transformations
 * - Provide geospatial calculations used by almost every other engine
 */

class GeospatialUtilityEngine {
  constructor() {
    this.isInitialized = false;
    this.earthRadius = 6371000; // meters
    
    // Initialize immediately
    this.initialize();
  }

  /**
   * Initialize the geospatial utility engine
   */
  initialize() {
    this.isInitialized = true;
    this.log('info', 'Geospatial Utility Engine (E03) initialized successfully');
    return true;
  }

  /**
   * Calculate distance between two points using Haversine formula
   * @param {number} lat1 - Latitude of point 1 in degrees
   * @param {number} lon1 - Longitude of point 1 in degrees
   * @param {number} lat2 - Latitude of point 2 in degrees
   * @param {number} lon2 - Longitude of point 2 in degrees
   * @returns {number} Distance in meters
   */
  distanceBetweenPoints(lat1, lon1, lat2, lon2) {
    // Validate inputs
    if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || 
        typeof lat2 !== 'number' || typeof lon2 !== 'number') {
      throw new Error('All coordinates must be numbers');
    }
    
    // Validate coordinate ranges
    if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
      throw new Error('Latitude must be between -90 and 90 degrees');
    }
    if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
      throw new Error('Longitude must be between -180 and 180 degrees');
    }
    
    const toRadians = (degrees) => degrees * Math.PI / 180;
    
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δφ = toRadians(lat2 - lat1);
    const Δλ = toRadians(lon2 - lon1);

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return this.earthRadius * c;
  }

  /**
   * Calculate distance between two points using Vincenty formula (more accurate for ellipsoid)
   * @param {number} lat1 - Latitude of point 1 in degrees
   * @param {number} lon1 - Longitude of point 1 in degrees
   * @param {number} lat2 - Latitude of point 2 in degrees
   * @param {number} lon2 - Longitude of point 2 in degrees
   * @returns {number} Distance in meters
   */
  distanceBetweenPointsVincenty(lat1, lon1, lat2, lon2) {
    // WGS-84 ellipsoid parameters
    const a = 6378137; // semi-major axis in meters
    const b = 6356752.314245; // semi-minor axis in meters
    const f = 1 / 298.257223563; // flattening
    
    // Convert to radians
    const toRad = (deg) => deg * Math.PI / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const L = toRad(lon2 - lon1);
    
    let U1 = Math.atan((1 - f) * Math.tan(φ1));
    let U2 = Math.atan((1 - f) * Math.tan(φ2));
    let sinU1 = Math.sin(U1);
    let cosU1 = Math.cos(U1);
    let sinU2 = Math.sin(U2);
    let cosU2 = Math.cos(U2);
    
    let λ = L;
    let λP;
    let iterLimit = 100;
    
    do {
      let sinλ = Math.sin(λ);
      let cosλ = Math.cos(λ);
      let sinσ = Math.sqrt(
        (cosU2 * sinλ) * (cosU2 * sinλ) +
        (cosU1 * sinU2 - sinU1 * cosU2 * cosλ) * (cosU1 * sinU2 - sinU1 * cosU2 * cosλ)
      );
      if (sinσ === 0) return 0; // coincident points
      
      let cosσ = sinU1 * sinU2 + cosU1 * cosU2 * cosλ;
      let σ = Math.atan2(sinσ, cosσ);
      let sinα = (cosU1 * cosU2 * sinλ) / sinσ;
      let cos²α = 1 - sinα * sinα;
      let cos2σM = cosσ - 2 * sinU1 * sinU2 / cos²α;
      if (isNaN(cos2σM)) cos2σM = 0; // equatorial line
      
      let C = f / 16 * cos²α * (4 + f * (4 - 3 * cos²α));
      λP = λ;
      λ = L + (1 - C) * f * sinα *
          (σ + C * sinσ * (cos2σM + C * cosσ * (-1 + 2 * cos2σM * cos2σM)));
    } while (Math.abs(λ - λP) > 1e-12 && --iterLimit > 0);
    
    if (iterLimit === 0) return NaN; // formula failed to converge
    
    let u² = cos²α * ((a * a - b * b) / (b * b));
    let A = 1 + u² / 16384 * (4096 + u² * (-768 + u² * (320 - 175)));
    let B = u² / 1024 * (256 + u² * (-128 + u² * (74 - 47)));
    let Δσ = B * sinσ * (cos2σM + B / 4 * (cosσ * (-1 + 2 * cos2σM * cos2σM) -
          B / 6 * cos2σM * (-3 + 4 * sinσ * sinσ) * (-3 + 4 * cos2σM * cos2σM)));
    
    let s = b * A * (σ - Δσ);
    
    return s;
  }

  /**
   * Check if a point is inside a polygon (using ray casting algorithm)
   * @param {number} pointLat - Latitude of point to check
   * @param {number} pointLon - Longitude of point to check
   * @param {Array} polygon - Array of [{latitude: number, longitude: number}] vertices
   * @returns {boolean} True if point is inside polygon
   */
  pointInPolygon(pointLat, pointLon, polygon) {
    // Validate inputs
    if (!Array.isArray(polygon) || polygon.length < 3) {
      throw new Error('Polygon must be an array with at least 3 vertices');
    }
    
    let inside = false;
    
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].longitude;
      const yi = polygon[i].latitude;
      const xj = polygon[j].longitude;
      const yj = polygon[j].latitude;
      
      const intersect = ((yi > pointLat) !== (yj > pointLat)) &&
                       (pointLon < (xj - xi) * (pointLat - yi) / (yj - yi) + xi);
      
      if (intersect) inside = !inside;
    }
    
    return inside;
  }

  /**
   * Check if a point is inside a circle
   * @param {number} pointLat - Latitude of point to check
   * @param {number} pointLon - Longitude of point to check
   * @param {number} centerLat - Latitude of circle center
   * @param {number} centerLon - Longitude of circle center
   * @param {number} radiusMeters - Radius of circle in meters
   * @returns {boolean} True if point is inside circle
   */
  pointInCircle(pointLat, pointLon, centerLat, centerLon, radiusMeters) {
    const distance = this.distanceBetweenPoints(
      pointLat, pointLon, centerLat, centerLon
    );
    return distance <= radiusMeters;
  }

  /**
   * Calculate the area of a polygon using the shoelace formula
   * @param {Array} polygon - Array of [{latitude: number, longitude: number}] vertices
   * @returns {number} Area in square meters
   */
  polygonArea(polygon) {
    // Validate inputs
    if (!Array.isArray(polygon) || polygon.length < 3) {
      throw new Error('Polygon must be an array with at least 3 vertices');
    }
    
    // Close the polygon if needed
    const closedPolygon = [...polygon];
    if (
      polygon[0].latitude !== polygon[polygon.length - 1].latitude ||
      polygon[0].longitude !== polygon[polygon.length - 1].longitude
    ) {
      closedPolygon.push(polygon[0]);
    }
    
    let area = 0;
    const toRadians = (deg) => deg * Math.PI / 180;
    
    for (let i = 0; i < closedPolygon.length - 1; i++) {
      const lat1 = toRadians(closedPolygon[i].latitude);
      const lon1 = toRadians(closedPolygon[i].longitude);
      const lat2 = toRadians(closedPolygon[i + 1].latitude);
      const lon2 = toRadians(closedPolygon[i + 1].longitude);
      
      area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    
    area = area * this.earthRadius * this.earthRadius / 2;
    return Math.abs(area);
  }

  /**
   * Calculate bounding box for a set of points
   * @param {Array} points - Array of [{latitude: number, longitude: number}]
   * @returns {Object} { minLat, maxLat, minLon, maxLon }
   */
  boundingBox(points) {
    if (!Array.isArray(points) || points.length === 0) {
      throw new Error('Points must be a non-empty array');
    }
    
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    
    for (const point of points) {
      if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
        throw new Error('Each point must have latitude and longitude numbers');
      }
      
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLon = Math.min(minLon, point.longitude);
      maxLon = Math.max(maxLon, point.longitude);
    }
    
    return { minLat, maxLat, minLon, maxLon };
  }

  /**
   * Calculate the center (centroid) of a set of points
   * @param {Array} points - Array of [{latitude: number, longitude: number}]
   * @returns {Object} { latitude: number, longitude: number }
   */
  centroid(points) {
    if (!Array.isArray(points) || points.length === 0) {
      throw new Error('Points must be a non-empty array');
    }
    
    let sumLat = 0;
    let sumLon = 0;
    
    for (const point of points) {
      if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number') {
        throw new Error('Each point must have latitude and longitude numbers');
      }
      
      sumLat += point.latitude;
      sumLon += point.longitude;
    }
    
    return {
      latitude: sumLat / points.length,
      longitude: sumLon / points.length
    };
  }

  /**
   * Calculate bearing from point 1 to point 2
   * @param {number} lat1 - Latitude of point 1 in degrees
   * @param {number} lon1 - Longitude of point 1 in degrees
   * @param {number} lat2 - Latitude of point 2 in degrees
   * @param {number} lon2 - Longitude of point 2 in degrees
   * @returns {number} Bearing in degrees (0-360, where 0 is North)
   */
  bearing(lat1, lon1, lat2, lon2) {
    const toRadians = (deg) => deg * Math.PI / 180;
    const toDegrees = (rad) => rad * 180 / Math.PI;
    
    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δλ = toRadians(lon2 - lon1);
    
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    
    let θ = Math.atan2(y, x);
    let bearing = (toDegrees(θ) + 360) % 360; // Normalize to 0-360
    
    return bearing;
  }

  /**
   * Calculate destination point given start point, bearing, and distance
   * @param {number} lat - Start latitude in degrees
   * @param {number} lon - Start longitude in degrees
   * @param {number} bearing - Bearing in degrees (0-360)
   * @param {number} distance - Distance in meters
   * @returns {Object} { latitude: number, longitude: number }
   */
  destinationPoint(lat, lon, bearing, distance) {
    const toRadians = (deg) => deg * Math.PI / 180;
    const toDegrees = (rad) => rad * 180 / Math.PI;
    
    const δ = distance / this.earthRadius; // Angular distance in radians
    const θ = toRadians(bearing); // Bearing in radians
    const φ1 = toRadians(lat);
    const λ1 = toRadians(lon);
    
    const φ2 = Math.asin(
      Math.sin(φ1) * Math.cos(δ) +
      Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
    );
    
    const λ2 = λ1 + Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );
    
    return {
      latitude: toDegrees(φ2),
      longitude: toDegrees(λ2)
    };
  }

  /**
   * Check if two bounding boxes overlap
   * @param {Object} bbox1 - { minLat, maxLat, minLon, maxLon }
   * @param {Object} bbox2 - { minLat, maxLat, minLon, maxLon }
   * @returns {boolean} True if boxes overlap
   */
  boundingBoxesOverlap(bbox1, bbox2) {
    return !(bbox2.minLat > bbox1.maxLat ||
             bbox2.maxLat < bbox1.minLat ||
             bbox2.minLon > bbox1.maxLon ||
             bbox2.maxLon < bbox1.minLon);
  }

  /**
   * Expand a bounding box by a margin (in degrees)
   * @param {Object} bbox - { minLat, maxLat, minLon, maxLon }
   * @param {number} marginDeg - Margin to expand in degrees
   * @returns {Object} Expanded bounding box
   */
  expandBoundingBox(bbox, marginDeg) {
    return {
      minLat: bbox.minLat - marginDeg,
      maxLat: bbox.maxLat + marginDeg,
      minLon: bbox.minLon - marginDeg,
      maxLon: bbox.maxLon + marginDeg
    };
  }

  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  /**
   * Convert radians to degrees
   * @param {number} radians - Angle in radians
   * @returns {number} Angle in degrees
   */
  toDegrees(radians) {
    return radians * 180 / Math.PI;
  }

  /**
   * Get engine status
   */
  getStatus() {
    return {
      engine: 'E03_GeospatialUtility',
      initialized: this.isInitialized,
      earthRadius: this.earthRadius,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set up logging (simplified version)
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    if (__DEV__) {
      console.log(`[E03_Geospatial][${level.toUpperCase()}] ${message}`, metadata);
    }
    // In production, might send to centralized logging
  }
}

// Export singleton instance
const geoEngine = new GeospatialUtilityEngine();
export default geoEngine;
