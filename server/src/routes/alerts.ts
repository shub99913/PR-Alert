import express from 'express';
import { Alert } from '../models/Alert.js';
import { dispatchSMS, dispatchPush, simulateCellBroadcast } from '../dispatcher/adapters.js';

const router = express.Router();

// GET all past dispatched alerts
router.get('/', async (req, res) => {
    try {
        const alerts = await Alert.find().sort({ createdAt: -1 });
        res.json(alerts);
    } catch (err) {
        res.status(500).json({ error: 'Server error fetching alerts' });
    }
});

// POST Manual Override Alert Trigger
router.post('/', async (req, res) => {
    try {
        const { type, location, radius, message, channels, severity } = req.body;

        const newAlert = await Alert.create({
            eventId: `manual-${Date.now()}`,
            type,
            severity,
            area: { type: 'Point', coordinates: [location.lng, location.lat], radiusKm: radius },
            message,
            channels,
            sentAt: new Date(),
            status: 'sent'
        });

        // Loop over requested channels
        if (channels.includes('sms')) await dispatchSMS(newAlert.id, ['+14155552671'], message);
        if (channels.includes('push')) await dispatchPush(newAlert.id, 'all-devices', message);
        if (channels.includes('cell')) await simulateCellBroadcast(newAlert.id, newAlert.area, message);

        // Ping dashboard clients
        const io = req.app.get('io');
        if (io) {
            io.emit('alert_update', newAlert);
        }

        res.status(201).json(newAlert);
    } catch (err) {
        res.status(500).json({ error: 'Failed to dispatch alert' });
    }
});

export default router;
