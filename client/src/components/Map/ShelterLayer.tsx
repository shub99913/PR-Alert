import { useState, useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import axios from 'axios';
import L from 'leaflet';

interface Shelter {
    id: number;
    name: string;
    type: 'hospital' | 'shelter' | 'fire_station' | 'police';
    latitude: number;
    longitude: number;
}

const SHELTER_COLORS: Record<string, string> = {
    hospital: '#29b6f6',
    shelter: '#66bb6a',
    fire_station: '#ef5350',
    police: '#5c6bc0',
};

const SHELTER_ICONS: Record<string, string> = {
    hospital: '🏥',
    shelter: '⛺',
    fire_station: '🚒',
    police: '👮',
};

const getShelterIcon = (type: string) => {
    return new L.DivIcon({
        html: `<div style="font-size: 14px; background: white; border-radius: 50%; padding: 4px; border: 2px solid ${SHELTER_COLORS[type] || '#29b6f6'}; box-shadow: 0 0 5px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">🏠</div>`,
        className: 'custom-home-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
};

const API_BASE = 'http://localhost:5002/api';

function ShelterFetcher({ onShelters }: { onShelters: (s: Shelter[]) => void }) {
    const map = useMap();

    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        const fetchShelters = async () => {
            const center = map.getCenter();
            const zoom = map.getZoom();

            // Only fetch when zoomed in enough
            if (zoom < 8) {
                onShelters([]);
                return;
            }

            const radius = zoom >= 12 ? 5002 : zoom >= 10 ? 15002 : 30000;

            try {
                const { data } = await axios.get(`${API_BASE}/predictions/shelters`, {
                    params: { lat: center.lat, lon: center.lng, radius },
                });
                onShelters(data || []);
            } catch {
                // Silently fail
            }
        };

        const onMoveEnd = () => {
            clearTimeout(timeout);
            timeout = setTimeout(fetchShelters, 1000);
        };

        map.on('moveend', onMoveEnd);
        map.on('zoomend', onMoveEnd);

        return () => {
            map.off('moveend', onMoveEnd);
            map.off('zoomend', onMoveEnd);
            clearTimeout(timeout);
        };
    }, [map, onShelters]);

    return null;
}

export function ShelterLayer() {
    const [shelters, setShelters] = useState<Shelter[]>([]);

    return (
        <>
            <ShelterFetcher onShelters={setShelters} />
            {shelters.map(shelter => (
                <Marker
                    key={`shelter-${shelter.id}`}
                    position={[shelter.latitude, shelter.longitude]}
                    icon={getShelterIcon(shelter.type)}
                >
                    <Popup>
                        <div className="popup-content">
                            <h3>{SHELTER_ICONS[shelter.type] || '📍'} {shelter.name}</h3>
                            <div className="popup-detail">
                                <span>Type</span>
                                <span style={{ textTransform: 'capitalize' }}>{shelter.type.replace('_', ' ')}</span>
                            </div>
                            <div className="popup-detail">
                                <span>Coordinates</span>
                                <span>{shelter.latitude.toFixed(4)}, {shelter.longitude.toFixed(4)}</span>
                            </div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </>
    );
}
