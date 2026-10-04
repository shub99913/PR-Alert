import mongoose from 'mongoose';

const PushTokenSchema = new mongoose.Schema({
  token: { type: String, required: true },
  platform: { type: String, required: true, enum: ['ios', 'android', 'web'] },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const PreferencesSchema = new mongoose.Schema({
  minSeverity: { type: String, enum: ['info', 'warning', 'alert', 'emergency'], default: 'warning' },
  channels: [{ type: String, enum: ['sms', 'email', 'push', 'whatsapp', 'webhook', 'social_media', 'siren', 'cell_broadcast', 'radio', 'tv', 'operator_dashboard'] }],
  quietHours: {
    enabled: { type: Boolean, default: true },
    start: { type: String, default: '22:00' },
    end: { type: String, default: '07:00' },
    timezone: { type: String, default: 'Asia/Kolkata' },
  },
  autoExpandArea: { type: Boolean, default: true },
  expansionRadiusKm: { type: Number, default: 50 },
  disasterTypes: [{ type: String, enum: ['earthquake', 'flood', 'cyclone', 'wildfire', 'landslide', 'heatwave', 'tsunami', 'air_quality', 'volcano', 'storm_surge', 'drought', 'cold_wave', 'thunderstorm', 'hail', 'tornado', 'avalanche'] }],
}, { _id: false });

const UserSchema = new mongoose.Schema({
  phone: { type: String, match: /^\+[1-9]\d{1,14}$/, sparse: true, unique: true },
  email: { type: String, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, sparse: true, unique: true },
  name: { type: String, maxlength: 100 },
  language: { type: String, default: 'en' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number] },
  },
  preferences: { type: PreferencesSchema, default: () => ({}) },
  active: { type: Boolean, default: true },
  lastActiveAt: { type: Date },
  pushTokens: [PushTokenSchema],
  trustScore: { type: Number, default: 50, min: 0, max: 100 },
  roles: [{ type: String, enum: ['user', 'operator', 'admin', 'verifier'], default: 'user' }],
}, { timestamps: true });

// Remove duplicate indexes - already defined in field definitions
UserSchema.index({ 'location.coordinates': '2dsphere' });
UserSchema.index({ active: 1 });

export const User = mongoose.model('User', UserSchema);