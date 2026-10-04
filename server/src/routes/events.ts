import express from 'express';
import { Event } from '../models/Event.js';

const router = express.Router();

router.get('/live', async (req, res) => {
    try {
        const typeLimit = req.query.type ? { type: req.query.type as string } : {};
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

        const docs = await Event.find(typeLimit).sort({ createdAt: -1 }).limit(limit);

        // For backwards compatibility with the existing prototype UI
        const events = docs.map(e => ({
            id: e.id, type: e.type, source: e.source, severity: e.severity,
            latitude: e.location?.lat || 0, longitude: e.location?.lng || 0,
            title: e.place, description: e.description, timestamp: e.timestamp, magnitude: e.magnitude
        }));

        res.json({ events });
    } catch (err) {
        console.error('[Routing]', err);
        res.status(500).json({ error: 'Server Fault' });
    }
});

export default router;
