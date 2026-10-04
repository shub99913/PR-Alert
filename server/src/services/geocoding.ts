import axios from 'axios';

let lastCallTime = 0;

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
    try {
        // Rate limit: 1 req/sec per Nominatim policy
        const now = Date.now();
        const wait = Math.max(0, 1100 - (now - lastCallTime));
        if (wait > 0) await new Promise(r => setTimeout(r, wait));
        lastCallTime = Date.now();

        const { data } = await axios.get('https://nominatim.openstreetmap.org/reverse', {
            params: { lat, lon, format: 'json', zoom: 10 },
            headers: { 'User-Agent': 'DisasterDashboard/1.0' },
            timeout: 10000,
        });

        return data.display_name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    } catch {
        return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
    }
}
