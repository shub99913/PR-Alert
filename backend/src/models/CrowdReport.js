import mongoose from 'mongoose';

const MediaSchema = new mongoose.Schema({
  type: { type: String, required: true, enum: ['photo', 'video', 'audio'] },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  mimeType: { type: String },
  size: { type: Number },
  metadata: { type: mongoose.Schema.Types.Mixed },
}, { _id: false });

const VerificationSchema = new mongoose.Schema({
  verified: { type: Boolean, default: false },
  verifiedBy: { type: String },
  verifiedAt: { type: Date },
  voteCount: { type: Number, default: 0 },
  agreeVotes: { type: Number, default: 0 },
  disagreeVotes: { type: Number, default: 0 },
  trustScore: { type: Number, min: 0, max: 1 },
}, { _id: false });

const CrowdReportSchema = new mongoose.Schema({
  userId: { type: String, sparse: true },
  anonymous: { type: Boolean, default: false },
  disasterType: { type: String, required: true, enum: ['earthquake', 'flood', 'cyclone', 'wildfire', 'landslide', 'heatwave', 'tsunami', 'air_quality', 'volcano', 'storm_surge', 'drought', 'cold_wave', 'thunderstorm', 'hail', 'tornado', 'avalanche'] },
  severity: { type: String, required: true, enum: ['info', 'minor', 'moderate', 'severe', 'critical'] },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  description: { type: String, required: true, minlength: 10, maxlength: 5000 },
  media: [MediaSchema],
  timestamp: { type: Date, default: Date.now },
  status: { type: String, required: true, enum: ['pending', 'verified', 'rejected', 'escalated'], default: 'pending' },
  verification: { type: VerificationSchema, default: () => ({}) },
  contactInfo: { type: String },
  clusterId: { type: String },
}, { timestamps: true });

CrowdReportSchema.index({ createdAt: -1 });
CrowdReportSchema.index({ 'location.coordinates': '2dsphere' });
CrowdReportSchema.index({ status: 1 });
CrowdReportSchema.index({ disasterType: 1 });

export const CrowdReport = mongoose.model('CrowdReport', CrowdReportSchema);