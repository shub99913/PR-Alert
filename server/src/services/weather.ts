import axios from 'axios';
import { DisasterEvent } from '../store.js';

const WEATHER_GOV_ALERTS = 'https://api.weather.gov/alerts/active';

function mapSeverity(sev: string): DisasterEvent['severity'] {
    switch (sev?.toLowerCase()) {
        case 'extreme': return 'critical';
        case 'severe': return 'high';
        case 'moderate': return 'moderate';
        default: return 'low';
    }
}

function mapType(event: string): DisasterEvent['type'] {
    const lower = (event || '').toLowerCase();
    if (lower.includes('flood') || lower.includes('rain')) return 'flood';
    if (lower.includes('hurricane') || lower.includes('cyclone') || lower.includes('tropical') || lower.includes('tornado')) return 'cyclone';
    if (lower.includes('fire') || lower.includes('wildfire')) return 'wildfire';
    if (lower.includes('tsunami')) return 'tsunami';
    if (lower.includes('volcano')) return 'volcano';
    return 'weather';
}

export async function fetchWeatherAlerts(): Promise<DisasterEvent[]> {
    try {
        const { data } = await axios.get(WEATHER_GOV_ALERTS, {
            timeout: 15000,
            headers: {
                'User-Agent': 'DisasterDashboard/1.0 (disaster-dashboard@example.com)',
                'Accept': 'application/geo+json',
            },
        });

        if (!data.features) return [];

        return data.features.slice(0, 200).map((f: any) => {
            const props = f.properties;

            // Get centroid from geometry or affectedZones
            let lat = 0, lon = 0;
            if (f.geometry?.coordinates) {
                const coords = f.geometry.coordinates.flat(Infinity);
                // Average all coordinate pairs
                let sumLat = 0, sumLon = 0, count = 0;
                for (let i = 0; i < coords.length - 1; i += 2) {
                    sumLon += coords[i];
                    sumLat += coords[i + 1];
                    count++;
                }
                if (count) {
                    lon = sumLon / count;
                    lat = sumLat / count;
                }
            }

            // Fallback: try geocode from areaDesc
            if (lat === 0 && lon === 0 && props.geocode?.UGC) {
                // Use approximate center of US as fallback for US alerts
                lat = 39.8283;
                lon = -98.5795;
            }

            return {
                id: `weather-${props.id}`,
                source: 'weather' as const,
                type: mapType(props.event),
                title: props.headline || props.event || 'Weather Alert',
                description: (props.description || '').substring(0, 500),
                latitude: lat,
                longitude: lon,
                severity: mapSeverity(props.severity),
                timestamp: props.onset || props.effective || new Date().toISOString(),
                url: `https://alerts.weather.gov/cap/wwacapget.php?x=${props.id}`,
                raw: {
                    event: props.event,
                    areaDesc: props.areaDesc,
                    urgency: props.urgency,
                    certainty: props.certainty,
                    senderName: props.senderName,
                },
            };
        });
    } catch (err: any) {
        console.error('[Weather.gov] Fetch error:', err.message);
        return [];
    }
}
