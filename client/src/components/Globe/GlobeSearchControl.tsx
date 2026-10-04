import React, { useState, memo, useCallback } from 'react';
import { Search } from 'lucide-react';
import axios from 'axios';
import { useStore } from '../../store/useStore';

export const GlobeSearchControl = memo(function GlobeSearchControl() {
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const setMapCenter = useStore(state => state.setMapCenter);

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

                // Update global map center which triggers Globe's useEffect to flyTo
                setMapCenter({ lat, lng: lon });
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
            borderRadius: 24,
            padding: '8px 16px',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: 280,
            transition: 'box-shadow 0.2s ease, border-color 0.2s ease'
        }}>
            <Search size={16} color="var(--text-secondary)" />
            <form onSubmit={handleSearch} style={{ flex: 1 }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search global location..."
                    style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: 13,
                        outline: 'none',
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500
                    }}
                    disabled={isSearching}
                />
            </form>
        </div>
    );
});
