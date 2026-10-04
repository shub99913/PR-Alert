import { useState } from 'react';
import { useMap } from 'react-leaflet';
import { Search } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../../store/useStore';

export function MapSearchControl() {
    const map = useMap();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
                params: {
                    format: 'json',
                    q: query,
                    limit: 1
                }
            });

            if (res.data && res.data.length > 0) {
                const result = res.data[0];
                const lat = parseFloat(result.lat);
                const lon = parseFloat(result.lon);

                // Fly to coordinate
                map.flyTo([lat, lon], 12, {
                    duration: 1.5
                });
                
                // Update global map center for weather widget
                useStore.getState().setMapCenter({ lat, lng: lon });
            } else {
                alert('Location not found.');
            }
        } catch (err) {
            console.error('Search failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="map-search-control interactive-element" style={{
            position: 'absolute',
            top: 12,
            left: 50,
            zIndex: 1000,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: 8,
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: 250
        }}>
            <Search size={16} color="var(--text-secondary)" />
            <form onSubmit={handleSearch} style={{ flex: 1 }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Find location..."
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: 12,
                        outline: 'none',
                        fontFamily: 'Inter, sans-serif'
                    }}
                    disabled={isSearching}
                />
            </form>
        </div>
    );
}
