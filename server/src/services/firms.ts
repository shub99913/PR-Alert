import axios from 'axios';
import { config } from '../config.js';
import { DisasterEvent } from '../store.js';

const FIRMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';

export async function fetchFIRMS(): Promise<DisasterEvent[]> {
    if (!config.nasaFirmsApiKey) {
        console.log('[FIRMS] No API key configured, skipping wildfire data');
        return [];
    }

    try {
        const url = `${FIRMS_BASE}/${config.nasaFirmsApiKey}/VIIRS_SNPP_NRT/world/1`;
        const { data } = await axios.get(url, { timeout: 30000 });

        const lines = data.split('\n');
        const headers = lines[0].split(',');
        const latIdx = headers.indexOf('latitude');
        const lonIdx = headers.indexOf('longitude');
        const brightnessIdx = headers.indexOf('bright_ti4');
        const dateIdx = headers.indexOf('acq_date');
        const timeIdx = headers.indexOf('acq_time');
        const confidenceIdx = headers.indexOf('confidence');

        const events: DisasterEvent[] = [];

        // Sample every 10th point to avoid overwhelming the map
        for (let i = 1; i < Math.min(lines.length, 5000); i += 10) {
            const cols = lines[i]?.split(',');
            if (!cols || cols.length < 5) continue;

            const lat = parseFloat(cols[latIdx]);
            const lon = parseFloat(cols[lonIdx]);
            const brightness = parseFloat(cols[brightnessIdx]) || 300;
            const confidence = cols[confidenceIdx] || 'nominal';

            if (isNaN(lat) || isNaN(lon)) continue;

            const severity = brightness > 400 ? 'critical' : brightness > 350 ? 'high' : brightness > 320 ? 'moderate' : 'low';

            let timestamp = new Date().toISOString();
            try {
                const parsedDate = new Date(`${cols[dateIdx]}T${(cols[timeIdx] || '0000').replace(/(\d{2})(\d{2})/, '$1:$2')}:00Z`);
                if (!isNaN(parsedDate.getTime())) timestamp = parsedDate.toISOString();
            } catch (e) {
                // Ignore and use fallback
            }

            events.push({
                id: `firms-${lat.toFixed(3)}-${lon.toFixed(3)}-${cols[dateIdx]}`,
                source: 'firms',
                type: 'wildfire',
                title: `Fire Hotspot (${brightness.toFixed(0)}K)`,
                description: `Wildfire hotspot detected. Brightness: ${brightness.toFixed(0)}K, Confidence: ${confidence}`,
                latitude: lat,
                longitude: lon,
                severity,
                timestamp,
            });
        }

        console.log(`[FIRMS] Fetched ${events.length} wildfire hotspots`);
        return events;
    } catch (err: any) {
        console.error('[FIRMS] Fetch error:', err.message);
        return [];
    }
}
