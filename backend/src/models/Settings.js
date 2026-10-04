import mongoose from 'mongoose';

const SettingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
  description: { type: String },
  category: { type: String, enum: ['general', 'alerts', 'channels', 'ml', 'crowd', 'sachet', 'integration'], default: 'general' },
  isPublic: { type: Boolean, default: false },
}, { timestamps: true });

export const Settings = mongoose.model('Settings', SettingsSchema);