import React, { useEffect, useState, memo, useMemo } from 'react';
import { Entity, BillboardGraphics } from 'resium';
import { Cartesian3, Color } from 'cesium';
import axios from 'axios';

// Pre-compute the camera SVG data URI once instead of inline in every render
const CAMERA_ICON_URI = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMGVlZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTQuNSA0aC01TDcgN0g0YTIgMiAwIDAgMC0yIDJ2MTBhMiAyIDAgMCAwIDIgMmgxNmEy IDAgMCAwIDItMlY5YTIgMiAwIDAgMC0yLTJoLTNsLTIuNS0zeiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTMiIHI9IjMiLz48L3N2Zz4=";

// Memoized single camera entity
const CameraEntity = memo(function CameraEntity({ cam }: { cam: any }) {
    const position = useMemo(() => 
        Cartesian3.fromDegrees(cam.lon, cam.lat), 
        [cam.lon, cam.lat]
    );

    const description = useMemo(() => `
        <div style="color: black; padding: 10px;">
            <h3 style="margin-top: 0">${cam.name}</h3>
            <p><strong>Provider:</strong> ${cam.provider || 'Unknown'}</p>
            ${cam.url ? `<img src="${cam.url}" alt="Camera Feed" style="max-width: 300px; max-height: 200px; border-radius: 4px; border: 1px solid #ccc; display: block;" />` : '<p>No preview available</p>'}
        </div>
    `, [cam.name, cam.provider, cam.url]);

    return (
        <Entity
            position={position}
            name={`📷 ${cam.name} (${cam.city || 'Unknown'})`}
            description={description}
        >
            <BillboardGraphics
                image={CAMERA_ICON_URI}
                scale={1.0}
                color={Color.CYAN}
            />
        </Entity>
    );
});

export const CameraLayer = memo(function CameraLayer() {
    const [cameras, setCameras] = useState<any[]>([]);

    useEffect(() => {
        const controller = new AbortController();
        
        axios.get('http://localhost:5002/api/cameras', { signal: controller.signal })
            .then(res => {
                if (Array.isArray(res.data)) {
                    setCameras(res.data);
                } else {
                    console.error("Cameras API did not return an array:", res.data);
                    setCameras([]);
                }
            })
            .catch(err => {
                if (!axios.isCancel(err)) {
                    console.error("Failed to fetch cameras:", err);
                }
            });

        return () => controller.abort();
    }, []);

    // Filter and limit once, memoized
    const validCameras = useMemo(() => 
        cameras
            .filter(cam => typeof cam.lon === 'number' && typeof cam.lat === 'number')
            .slice(0, 200), // Reduced from 300 to 200 for performance
        [cameras]
    );

    return (
        <>
            {validCameras.map(cam => (
                <CameraEntity key={cam.id} cam={cam} />
            ))}
        </>
    );
});
