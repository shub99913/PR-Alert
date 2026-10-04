import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    preferredLanguage: { type: String, default: 'en' },
    emergencyContacts: [{
        name: String,
        phone: String
    }],
    lastLocation: {
        lat: { type: Number },
        lng: { type: Number },
        updatedAt: { type: Date }
    }
}, { timestamps: true });

export const User = mongoose.model('User', UserSchema);
