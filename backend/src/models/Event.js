import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  source: { type: String, required: true, enum: ['usgs', 'imd', 'gdacs', 'firms', 'openaq', 'crowd', 'social', 'operator', 'satellite'] },
  sourceId: { type: String, required: true },
  disasterType: { type: String, required: true, enum: ['earthquake', 'flood', 'cyclone', 'wildfire', 'landslide', 'heatwave', 'tsunami', 'air_quality', 'volcano', 'storm_surge', 'drought', 'cold_wave', 'thunderstorm', 'hail', 'tornado', 'avalanche'] },
  severity: { type: String, required: true, enum: ['info', 'warning', 'alert', 'emergency'] },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [lon, lat]
  },
  area: {
    type: { type: String, enum: ['Polygon', 'MultiPolygon'] },
    coordinates: { type: [[[Number]]] },
  },
  properties: { type: mongoose.Schema.Types.Mixed, default: {} },
  timestamp: { type: Date, required: true },
  receivedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
  deduplicationKey: { type: String },
  processingVersion: { type: String },
  rawData: { type: mongoose.Schema.Types.Mixed },
  reporterId: { type: String },
  reporterTrustScore: { type: Number, min: 0, max: 1 },
}, { timestamps: true });

EventSchema.index({ 'location.coordinates': '2dsphere' });
EventSchema.index({ 'properties.time': -1 });
EventSchema.index({ 'properties.type': 1 });
EventSchema.index({ 'properties.mag': -1 });
EventSchema.index({ source: 1, sourceId: 1 }, { unique: true });

export const Event = mongoose.model('Event', EventSchema);