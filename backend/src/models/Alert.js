import mongoose from 'mongoose';

const DispatchRecordSchema = new mongoose.Schema({
  channel: { type: String, required: true, enum: ['sms', 'email', 'push', 'whatsapp', 'webhook', 'social_media', 'siren', 'cell_broadcast', 'radio', 'tv', 'operator_dashboard'] },
  recipient: { type: String, required: true },
  status: { type: String, required: true, enum: ['pending', 'sent', 'delivered', 'failed', 'bounced', 'rejected'] },
  sentAt: { type: Date },
  deliveredAt: { type: Date },
  failedAt: { type: Date },
  error: { type: String },
  providerResponse: { type: mongoose.Schema.Types.Mixed },
  retryCount: { type: Number, default: 0 },
  cost: { type: Number },
}, { _id: false });

const AlertSchema = new mongoose.Schema({
  eventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true }],
  disasterType: { type: String, required: true, enum: ['earthquake', 'flood', 'cyclone', 'wildfire', 'landslide', 'heatwave', 'tsunami', 'air_quality', 'volcano', 'storm_surge', 'drought', 'cold_wave', 'thunderstorm', 'hail', 'tornado', 'avalanche'] },
  severity: { type: String, required: true, enum: ['info', 'warning', 'alert', 'emergency'] },
  confidence: { type: Number, required: true, min: 0, max: 1 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  affectedArea: {
    type: { type: String, enum: ['Polygon', 'MultiPolygon'] },
    coordinates: { type: [[[Number]]] },
  },
  affectedPopulation: { type: Number },
  messages: [{
    lang: { type: String, required: true },
    channel: { type: String, required: true },
    content: { type: String, required: true },
    templateId: { type: String },
  }],
  capXml: { type: String, required: true },
  status: { type: String, required: true, enum: ['draft', 'issued', 'cancelled', 'expired'], default: 'draft' },
  issuedAt: { type: Date },
  expiresAt: { type: Date },
  cancelledAt: { type: Date },
  dispatches: [DispatchRecordSchema],
  issuedBy: { type: String },
  cancelReason: { type: String },
  relatedAlerts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Alert' }],
}, { timestamps: true });

AlertSchema.index({ createdAt: -1 });
AlertSchema.index({ 'location.coordinates': '2dsphere' });
AlertSchema.index({ status: 1 });
AlertSchema.index({ disasterType: 1 });

export const Alert = mongoose.model('Alert', AlertSchema);