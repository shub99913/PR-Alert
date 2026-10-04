import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

router.get('/', (_req, res) => {
    res.json(store.getCrowdReports());
});

router.post('/', (req, res) => {
    try {
        const { type, description, latitude, longitude, reporterName, photoUrl } = req.body;

        if (!description || latitude == null || longitude == null) {
            return res.status(400).json({ error: 'Description, latitude, and longitude are required' });
        }

        const report = store.addCrowdReport({
            type: type || 'other',
            description,
            latitude,
            longitude,
            reporterName,
            photoUrl,
        });

        // Also add as an event visible on map
        store.addEvents([{
            id: `crowd-${report.id}`,
            source: 'crowd',
            type: 'other',
            title: `Crowd Report: ${type || 'Incident'}`,
            description,
            latitude,
            longitude,
            severity: 'moderate',
            timestamp: report.createdAt,
        }]);

        // Emit via WebSocket
        const io = req.app.get('io');
        if (io) {
            io.emit('new_crowd_report', report);
        }

        res.status(201).json(report);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
