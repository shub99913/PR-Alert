import axios from 'axios';
import { DisasterEvent } from '../store.js';

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';
const USGS_DAY_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';

function getSeverity(mag: number): DisasterEvent['severity'] {
    if (mag >= 6) return 'critical';
    if (mag >= 4.5) return 'high';
    if (mag >= 2.5) return 'moderate';
    return 'low';
}

export async function fetchEarthquakes(useDay = true): Promise<DisasterEvent[]> {
    try {
        const url = useDay ? USGS_DAY_URL : USGS_URL;
        const { data } = await axios.get(url, { timeout: 15000 });

        return data.features.map((f: any) => {
            const props = f.properties;
            const [lon, lat, depthKm] = f.geometry.coordinates;
            const mag = props.mag || 0;

            return {
                id: `usgs-${f.id}`,
                source: 'usgs' as const,
                type: 'earthquake' as const,
                title: props.title || `M${mag} Earthquake`,
                description: `Magnitude ${mag} earthquake at depth ${depthKm?.toFixed(1)}km. ${props.place || ''}`,
                latitude: lat,
                longitude: lon,
                magnitude: mag,
                depth: depthKm,
                severity: getSeverity(mag),
                timestamp: new Date(props.time).toISOString(),
                url: props.url,
                raw: props,
            };
        });
    } catch (err: any) {
        console.error('[USGS] Fetch error:', err.message);
        return [];
    }
}
