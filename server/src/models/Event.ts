import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    type: { type: String, required: true }, // earthquake, flood, wildfire, etc.
    source: { type: String, required: true }, // USGS, FIRMS, Weather
    magnitude: { type: Number },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    place: { type: String },
    timestamp: { type: Date, required: true },
    depth: { type: Number },
    severity: { type: String, enum: ['critical', 'high', 'moderate', 'low'], default: 'moderate' },
    additional: { type: Object }
}, { timestamps: true });

// Geospatial index for rapid boundary checking
EventSchema.index({ 'location.lng': 1, 'location.lat': 1 });

export const Event = mongoose.model('Event', EventSchema);
