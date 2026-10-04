import mongoose from 'mongoose';

const AlertSchema = new mongoose.Schema({
    eventId: { type: String, required: true },
    type: { type: String, required: true },
    severity: { type: String, enum: ['critical', 'high', 'moderate', 'low'], required: true },
    area: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
        radiusKm: { type: Number, required: true }
    },
    message: { type: String, required: true },
    channels: { type: [String], required: true }, // ['sms', 'push', 'email']
    status: { type: String, enum: ['sent', 'failed', 'partial', 'pending'], default: 'pending' },
    sentAt: { type: Date }
}, { timestamps: true });

export const Alert = mongoose.model('Alert', AlertSchema);
