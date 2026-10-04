import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { useStore } from '../../store/useStore';

// We need to declare leaflet.heat module since it doesn't have types
declare module 'leaflet' {
    function heatLayer(latlngs: [number, number, number][], options?: any): any;
}

export function HeatmapLayer() {
    const map = useMap();
    const { events, activeLayers } = useStore();

    useEffect(() => {
        if (!(L as any).heatLayer) return;

        const severityIntensity: Record<string, number> = {
            critical: 1.0,
            high: 0.7,
            moderate: 0.4,
            low: 0.2,
        };

        const points: [number, number, number][] = events
            .filter((e: any) =>
                activeLayers.has(e.type) &&
                typeof e.latitude === 'number' && !isNaN(e.latitude) &&
                typeof e.longitude === 'number' && !isNaN(e.longitude)
            )
            .map((e: any) => [
                e.latitude,
                e.longitude,
                (severityIntensity[e.severity] || 0.3) * (e.magnitude ? Math.min(e.magnitude / 5, 1.5) : 0.5),
            ]);

        if (points.length === 0) return;

        const heatLayerInstance = (L as any).heatLayer(points, {
            radius: 25,
            blur: 20,
            maxZoom: 10,
            max: 1.0,
            gradient: {
                0.2: '#00e676',
                0.4: '#ffd600',
                0.6: '#ff9100',
                0.8: '#ff1744',
                1.0: '#d50000',
            },
        }).addTo(map);

        return () => {
            if (heatLayerInstance) {
                map.removeLayer(heatLayerInstance);
            }
        };
    }, [events, activeLayers, map]);

    return null;
}
