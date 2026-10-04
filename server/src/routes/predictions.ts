import { Router } from 'express';
import { store } from '../store.js';
import { fetchNearbyShelters } from '../services/overpass.js';

const router = Router();

router.get('/risk', (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);

    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: 'lat and lon query parameters required' });
    }

    const radiusKm = parseFloat(req.query.radius as string) || 200;
    const nearbyEvents = store.getEventsNear(lat, lon, radiusKm);

    // Compute risk score (0-100) based on nearby events
    let riskScore = 0;
    const severityWeights = { critical: 30, high: 20, moderate: 10, low: 3 };
    const typeBonus: Record<string, number> = { earthquake: 5, cyclone: 8, tsunami: 10, wildfire: 4, flood: 6 };

    for (const event of nearbyEvents) {
        const weight = severityWeights[event.severity] || 5;
        const bonus = typeBonus[event.type] || 2;
        // Closer events contribute more
        const dist = haversine(lat, lon, event.latitude, event.longitude);
        const distanceFactor = Math.max(0.1, 1 - dist / radiusKm);
        riskScore += (weight + bonus) * distanceFactor;
    }

    riskScore = Math.min(100, Math.round(riskScore));

    const riskLevel = riskScore >= 70 ? 'critical' : riskScore >= 45 ? 'high' : riskScore >= 20 ? 'moderate' : 'low';

    res.json({
        latitude: lat,
        longitude: lon,
        radiusKm,
        riskScore,
        riskLevel,
        nearbyEventCount: nearbyEvents.length,
        topThreats: nearbyEvents
            .sort((a, b) => severityWeights[b.severity] - severityWeights[a.severity])
            .slice(0, 5)
            .map(e => ({ id: e.id, type: e.type, severity: e.severity, title: e.title })),
    });
});

router.get('/shelters', async (req, res) => {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const radius = parseFloat(req.query.radius as string) || 10000;

    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: 'lat and lon query parameters required' });
    }

    const shelters = await fetchNearbyShelters(lat, lon, radius);
    res.json(shelters);
});

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default router;
