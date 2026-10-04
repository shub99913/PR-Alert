import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
    userId: { type: String },
    type: { type: String, required: true },
    description: { type: String, required: true },
    location: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true }
    },
    photoUrl: { type: String },
    verified: { type: Boolean, default: false }
}, { timestamps: true });

export const Report = mongoose.model('Report', ReportSchema);
