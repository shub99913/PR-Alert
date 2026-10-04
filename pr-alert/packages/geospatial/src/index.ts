import { 
  point, 
  polygon, 
  multiPolygon, 
  featureCollection,
  distance as turfDistance,
  buffer as turfBuffer,
  bbox as turfBbox,
  centroid as turfCentroid,
  booleanPointInPolygon,
  booleanPointInCircle,
  circle as turfCircle,
  polygonToLine,
  lineString,
  area as turfArea,
  intersect,
  difference,
  union,
  truncate,
  transformRotate,
  transformTranslate,
  transformScale,
  along,
  lineSlice,
  lineSliceAlong,
  nearestPoint,
  nearestPointOnLine,
  rhumbDestination,
  rhumbDistance,
  rhumbBearing,
  destination,
  bearing,
  square,
  circle as turfCircleHelper,
  polygonToLineString,
  feature,
  properties,
  geometry,
} from '@turf/turf';
import type { 
  Point, 
  Polygon, 
  MultiPolygon, 
  Feature, 
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
  BBox,
  Position,
  Coord,
} from '@turf/turf';

/**
 * Earth radius in meters
 */
export const EARTH_RADIUS_M = 6371000;
export const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 */
export function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function rad2deg(rad: number): number {
  return rad * (180 / Math.PI);
}

/**
 * Haversine distance between two points in meters
 */
export function haversineDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = EARTH_RADIUS_M;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance between two GeoJSON points in meters
 */
export function distance(
  pointA: Feature<Point> | Position, 
  pointB: Feature<Point> | Position,
  options?: { units?: 'meters' | 'kilometers' | 'miles' | 'degrees' }
): number {
  const coordA = 'geometry' in pointA ? pointA.geometry.coordinates : pointA;
  const coordB = 'geometry' in pointB ? pointB.geometry.coordinates : pointB;
  
  const dist = turfDistance(
    feature(point(coordA)),
    feature(point(coordB)),
    options
  );
  
  return options?.units === 'kilometers' ? dist * 1000 : dist;
}

/**
 * Create a point feature
 */
export function createPoint(lon: number, lat: number, properties?: GeoJsonProperties): Feature<Point> {
  return feature(point([lon, lat]), properties);
}

/**
 * Create a polygon feature
 */
export function createPolygon(
  coordinates: Position[][][], 
  properties?: GeoJsonProperties
): Feature<Polygon> {
  return feature(polygon(coordinates), properties);
}

/**
 * Create a circle polygon (approximation) from center and radius in meters
 */
export function createCircle(
  center: Position, 
  radiusMeters: number, 
  steps = 64,
  properties?: GeoJsonProperties
): Feature<Polygon> {
  const circleFeature = turfCircle(center, radiusMeters / 1000, { 
    steps, 
    units: 'kilometers' 
  });
  return feature(circleFeature.geometry.coordinates as Position[][][], properties);
}

/**
 * Buffer a geometry by distance in meters
 */
export function bufferGeometry(
  geometry: Feature<any> | Geometry,
  radiusMeters: number,
  steps = 64
): Feature<Polygon | MultiPolygon> {
  return turfBuffer(geometry, radiusMeters / 1000, { 
    units: 'kilometers', 
    steps 
  });
}

/**
 * Check if a point is inside a polygon
 */
export function pointInPolygon(
  point: Feature<Point> | Position, 
  polygon: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon
): boolean {
  const pt = 'geometry' in point ? point : feature(point);
  const poly = 'geometry' in polygon ? polygon : feature(polygon);
  return booleanPointInPolygon(pt, poly);
}

/**
 * Check if a point is within a radius of a center point
 */
export function pointInRadius(
  point: Feature<Point> | Position,
  center: Feature<Point> | Position,
  radiusMeters: number
): boolean {
  const dist = distance(point, center);
  return dist <= radiusMeters;
}

/**
 * Get bounding box of a geometry
 */
export function getBBox(geometry: Feature<any> | Geometry): BBox {
  return turfBbox(geometry);
}

/**
 * Get centroid of a geometry
 */
export function getCentroid(geometry: Feature<any> | Geometry): Feature<Point> {
  return turfCentroid(geometry);
}

/**
 * Calculate area of a polygon in square meters
 */
export function calculateArea(polygon: Feature<Polygon | MultiPolygon> | Polygon | MultiPolygon): number {
  return turfArea(polygon) * 1_000_000; // Convert km² to m²
}

/**
 * Calculate bounding box from center point and radius
 */
export function bboxFromCenter(center: Position, radiusMeters: number): BBox {
  const radiusKm = radiusMeters / 1000;
  const [lon, lat] = center;
  
  // Approximate: 1 degree ≈ 111km at equator
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(deg2rad(lat)));
  
  return [
    lon - lonDelta,
    lat - latDelta,
    lon + lonDelta,
    lat + latDelta
  ];
}

/**
 * Convert bounds to polygon
 */
export function bboxToPolygon(bbox: BBox): Feature<Polygon> {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return feature(polygon([[
    [minLon, minLat],
    [maxLon, minLat],
    [maxLon, maxLat],
    [minLon, maxLat],
    [minLon, minLat]
  ]]));
}

/**
 * Calculate affected population estimate (rough approximation)
 * Uses population density grid - placeholder for real integration
 */
export async function estimateAffectedPopulation(
  polygon: Feature<Polygon | MultiPolygon>,
  populationDensity: number = 400 // people per km² default for India
): Promise<number> {
  const areaKm2 = turfArea(polygon);
  return Math.round(areaKm2 * populationDensity);
}

/**
 * Get administrative boundaries containing a point
 * Placeholder - would integrate with actual boundary data
 */
export async function getAdminBoundaries(
  point: Feature<Point> | Position,
  levels: ('country' | 'state' | 'district' | 'tehsil')[]
): Promise<Record<string, Feature<Polygon>>> {
  // Placeholder - integrate with actual boundary datasets (Census, GADM, etc.)
  return {};
}

/**
 * Generate grid points within a polygon for sampling
 */
export function generateGridPoints(
  polygon: Feature<Polygon>,
  cellSizeKm: number = 1
): FeatureCollection<Point> {
  const bbox = getBBox(polygon);
  const [minLon, minLat, maxLon, maxLat] = bbox;
  
  const points: Feature<Point>[] = [];
  const latStep = cellSizeKm / 111;
  const lonStep = cellSizeKm / (111 * Math.cos(deg2rad((minLat + maxLat) / 2)));
  
  for (let lat = minLat; lat <= maxLat; lat += latStep) {
    for (let lon = minLon; lon <= maxLon; lon += lonStep) {
      const pt = feature(point([lon, lat]));
      if (booleanPointInPolygon(pt, feature(polygon))) {
        points.push(pt);
      }
    }
  }
  
  return featureCollection(points);
}

/**
 * Simplify geometry for display/storage
 */
export function simplifyGeometry(
  geometry: Feature<any> | Geometry,
  toleranceKm: number = 0.1,
  highQuality = false
): Feature<any> {
  return truncate(geometry, { 
    precision: Math.round(1 / (toleranceKm * 100)), // Convert km to coordinate precision
    coordinates: 2,
    mutate: false 
  });
}

/**
 * Get points along a line at regular intervals
 */
export function getPointsAlongLine(
  line: Feature<LineString>,
  intervalKm: number
): FeatureCollection<Point> {
  const points: Feature<Point>[] = [];
  const lengthKm = turfDistance(line.geometry.coordinates[0], line.geometry.coordinates.slice(-1)[0], { units: 'kilometers' });
  
  for (let d = 0; d <= lengthKm; d += intervalKm) {
    const pt = along(line, d, { units: 'kilometers' });
    points.push(pt);
  }
  
  return featureCollection(points);
}

/**
 * Find nearest point on a line from a given point
 */
export function findNearestOnLine(
  line: Feature<LineString>,
  point: Feature<Point> | Position
): Feature<Point> {
  return nearestPointOnLine(line, point);
}

/**
 * Create a sector (pie slice) from center, bearing range, and radius
 */
export function createSector(
  center: Position,
  startBearing: number,
  endBearing: number,
  radiusMeters: number,
  steps = 32
): Feature<Polygon> {
  const points: Position[] = [center];
  const radiusKm = radiusMeters / 1000;
  const bearingSteps = Math.max(1, Math.floor(steps * Math.abs(endBearing - startBearing) / 360));
  
  for (let i = 0; i <= bearingSteps; i++) {
    const bearing = startBearing + (endBearing - startBearing) * (i / bearingSteps);
    const dest = destination(center, radiusKm, bearing, { units: 'kilometers' });
    points.push(dest.geometry.coordinates);
  }
  
  points.push(center); // Close the polygon
  return feature(polygon([points]));
}

/**
 * Convert bearing from degrees to standard (0-360)
 */
export function normalizeBearing(bearing: number): number {
  return ((bearing % 360) + 360) % 360;
}

/**
 * Calculate midpoint between two points
 */
export function midpoint(pointA: Position, pointB: Position): Position {
  const [lon1, lat1] = pointA;
  const [lon2, lat2] = pointB;
  
  const lat1Rad = deg2rad(lat1);
  const lat2Rad = deg2rad(lat2);
  const lon1Rad = deg2rad(lon1);
  const lon2Rad = deg2rad(lon2);
  
  const bx = Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad);
  const by = Math.cos(lat2Rad) * Math.sin(lon2Rad - lon1Rad);
  
  const lat3Rad = Math.atan2(
    Math.sin(lat1Rad) + Math.sin(lat2Rad),
    Math.sqrt((Math.cos(lat1Rad) + bx) ** 2 + by ** 2)
  );
  const lon3Rad = lon1Rad + Math.atan2(by, Math.cos(lat1Rad) + bx);
  
  return [rad2deg(lon3Rad), rad2deg(lat3Rad)];
}

/**
 * Calculate the intersection area of two polygons
 */
export function intersectionArea(
  polyA: Feature<Polygon> | Polygon,
  polyB: Feature<Polygon> | Polygon
): number {
  const result = intersect(feature(polyA), feature(polyB));
  if (!result || result.geometry.type !== 'Polygon') return 0;
  return calculateArea(result);
}

/**
 * Calculate Jaccard similarity (IoU) of two polygons
 */
export function polygonIoU(
  polyA: Feature<Polygon> | Polygon,
  polyB: Feature<Polygon> | Polygon
): number {
  const intersection = intersectionArea(polyA, polyB);
  if (intersection === 0) return 0;
  
  const areaA = calculateArea(polyA);
  const areaB = calculateArea(polyB);
  const union = areaA + areaB - intersection;
  
  return intersection / union;
}

/**
 * Cluster nearby points using simple distance-based clustering
 */
export function clusterPoints(
  points: Feature<Point>[],
  maxDistanceMeters: number = 1000
): Feature<Point>[][] {
  const clusters: Feature<Point>[][] = [];
  const unassigned = [...points];
  
  while (unassigned.length > 0) {
    const seed = unassigned.shift()!;
    const cluster = [seed];
    
    for (let i = unassigned.length - 1; i >= 0; i--) {
      if (distance(seed, unassigned[i]) <= maxDistanceMeters) {
        cluster.push(unassigned.splice(i, 1)[0]);
      }
    }
    
    clusters.push(cluster);
  }
  
  return clusters;
}

/**
 * Get representative point for a cluster (centroid)
 */
export function getClusterCentroid(cluster: Feature<Point>[]): Feature<Point> {
  if (cluster.length === 1) return cluster[0];
  
  const coords = cluster.map(p => p.geometry.coordinates);
  const centroid = feature(point([
    coords.reduce((sum, c) => sum + c[0], 0) / coords.length,
    coords.reduce((sum, c) => sum + c[1], 0) / coords.length
  ]));
  
  return centroid;
}

/**
 * Convert MMI intensity to approximate PGA (Peak Ground Acceleration)
 */
export function mmiToPga(mmi: number): number {
  // Wald et al. (1999) approximate conversion
  // PGA in %g
  return Math.exp((mmi - 1.78) / 1.55) / 100 * 9.81;
}

/**
 * Convert PGA to MMI intensity
 */
export function pgaToMmi(pga: number): number {
  // PGA in m/s²
  return 1.78 + 1.55 * Math.log(pga / 9.81 * 100);
}

/**
 * Estimate intensity at distance from earthquake
 * Using Atkinson & Wald (2007) GMPE approximation
 */
export function estimateIntensityAtDistance(
  magnitude: number,
  distanceKm: number,
  depthKm: number = 10
): number {
  // Simplified GMPE - replace with proper model
  const R = Math.sqrt(distanceKm ** 2 + depthKm ** 2);
  const pga = 10 ** (0.5 * magnitude - 1.5 * Math.log10(R) - 2.5); // Very rough
  return pgaToMmi(pga);
}

/**
 * Generate shake map grid for an earthquake
 */
export function generateShakeMapGrid(
  epicenter: Position,
  magnitude: number,
  depthKm: number,
  radiusKm: number = 200,
  gridSpacingKm: number = 5
): FeatureCollection<Point> {
  const epicenterFeature = feature(point(epicenter));
  const bbox = bboxFromCenter(epicenter, radiusKm * 1000);
  const polygon = bboxToPolygon(bbox);
  
  const grid = generateGridPoints(polygon, gridSpacingKm);
  
  return featureCollection(grid.features.map(pt => {
    const coords = pt.geometry.coordinates;
    const dist = distance(epicenterFeature, pt);
    const intensity = estimateIntensityAtDistance(
      magnitude, 
      dist / 1000, 
      depthKm
    );
    
    return feature(point(coords), {
      intensity: Math.round(intensity * 10) / 10,
      pga: Math.round(mmiToPga(intensity) * 1000) / 1000,
      distanceKm: Math.round(dist / 1000 * 10) / 10,
    });
  }));
}

export default {
  haversineDistance,
  distance,
  createPoint,
  createPolygon,
  createCircle,
  bufferGeometry,
  pointInPolygon,
  pointInRadius,
  getBBox,
  getCentroid,
  calculateArea,
  bboxFromCenter,
  bboxToPolygon,
  estimateAffectedPopulation,
  getAdminBoundaries,
  generateGridPoints,
  simplifyGeometry,
  getPointsAlongLine,
  findNearestOnLine,
  createSector,
  normalizeBearing,
  midpoint,
  intersectionArea,
  polygonIoU,
  clusterPoints,
  getClusterCentroid,
  mmiToPga,
  pgaToMmi,
  estimateIntensityAtDistance,
  generateShakeMapGrid,
};