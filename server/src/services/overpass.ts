import axios from 'axios';

export interface Shelter {
    id: number;
    name: string;
    type: 'hospital' | 'shelter' | 'fire_station' | 'police';
    latitude: number;
    longitude: number;
}

export async function fetchNearbyShelters(lat: number, lon: number, radiusMeters = 10000): Promise<Shelter[]> {
    try {
        const query = `
      [out:json][timeout:15];
      (
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lon});
        node["amenity"="shelter"](around:${radiusMeters},${lat},${lon});
        node["emergency"="assembly_point"](around:${radiusMeters},${lat},${lon});
        node["amenity"="fire_station"](around:${radiusMeters},${lat},${lon});
        node["amenity"="police"](around:${radiusMeters},${lat},${lon});
      );
      out body;
    `;

        const { data } = await axios.post(
            'https://overpass-api.de/api/interpreter',
            `data=${encodeURIComponent(query)}`,
            { timeout: 20000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        return data.elements.map((el: any) => {
            let type: Shelter['type'] = 'shelter';
            if (el.tags?.amenity === 'hospital') type = 'hospital';
            else if (el.tags?.amenity === 'fire_station') type = 'fire_station';
            else if (el.tags?.amenity === 'police') type = 'police';

            return {
                id: el.id,
                name: el.tags?.name || el.tags?.amenity || 'Unknown',
                type,
                latitude: el.lat,
                longitude: el.lon,
            };
        });
    } catch (err: any) {
        console.error('[Overpass] Fetch error:', err.message);
        return [];
    }
}
