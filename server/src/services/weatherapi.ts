import axios from 'axios';
import { DisasterEvent } from '../store.js';

// Major global cities to poll for weather alerts since WeatherAPI requires a location query
const MAJOR_CITIES = [
    'London', 'New York', 'Tokyo', 'Sydney', 'Paris', 'Berlin',
    'Moscow', 'Beijing', 'Delhi', 'Mumbai', 'Sao Paulo', 'Mexico City',
    'Cairo', 'Johannesburg', 'Los Angeles', 'Toronto', 'Dubai', 'Singapore',
    'Jakarta', 'Istanbul'
];

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
    if (lower.includes('hurricane') || lower.includes('cyclone') || lower.includes('tropical') || lower.includes('tornado') || lower.includes('typhoon')) return 'cyclone';
    if (lower.includes('fire') || lower.includes('wildfire')) return 'wildfire';
    if (lower.includes('tsunami')) return 'tsunami';
    if (lower.includes('volcano')) return 'volcano';
    return 'weather';
}

export async function fetchWeatherAPIAlerts(): Promise<DisasterEvent[]> {
    const apiKey = process.env.WEATHER_API_KEY;
    if (!apiKey) {
        return [];
    }

    const allAlerts: DisasterEvent[] = [];

    // Fetch alerts for each major city
    for (const city of MAJOR_CITIES) {
        try {
            const url = `http://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${encodeURIComponent(city)}&days=1&alerts=yes`;
            const { data } = await axios.get(url, { timeout: 10000 });

            if (data?.alerts?.alert && Array.isArray(data.alerts.alert)) {
                for (const alert of data.alerts.alert) {
                    
                    const eventItem: DisasterEvent = {
                        id: `weatherapi-${Buffer.from(alert.headline || city).toString('base64').substring(0, 16)}`,
                        source: 'weather',
                        type: mapType(alert.event),
                        title: alert.headline || alert.event || `Weather Alert in ${city}`,
                        description: (alert.desc || '').substring(0, 500),
                        latitude: data.location.lat,
                        longitude: data.location.lon,
                        severity: mapSeverity(alert.severity),
                        timestamp: alert.effective || new Date().toISOString(),
                        url: '',
                        raw: {
                            event: alert.event,
                            areaDesc: alert.areas,
                            urgency: alert.urgency,
                            certainty: alert.certainty,
                            instruction: alert.instruction
                        },
                    };

                    // Check for duplicates before pushing
                    if (!allAlerts.find(a => a.id === eventItem.id)) {
                        allAlerts.push(eventItem);
                    }
                }
            }
        } catch (err: any) {
            console.error(`[WeatherAPI] Failed to fetch for ${city}:`, err.message);
        }
    }

    return allAlerts;
}
