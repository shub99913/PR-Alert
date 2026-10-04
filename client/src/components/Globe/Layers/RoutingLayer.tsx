import React, { useState, useRef, useEffect } from 'react';
import { ScreenSpaceEventHandler, ScreenSpaceEvent, Entity, PolylineGraphics, PointGraphics } from 'resium';
import { ScreenSpaceEventType, Cartesian3, Cartographic, Color, Math as CesiumMath } from 'cesium';
import axios from 'axios';
import toast from 'react-hot-toast';

import { useStore } from '../../../store/useStore';

export function RoutingLayer({ viewerRef }: { viewerRef: any }) {
    const [origin, setOrigin] = useState<{ lat: number, lng: number } | null>(null);
    const [destination, setDestination] = useState<{ lat: number, lng: number } | null>(null);
    const [routePath, setRoutePath] = useState<Cartesian3[]>([]);
    const { routeDetails, setRouteDetails } = useStore();

    // Listen to store clears
    useEffect(() => {
        if (routeDetails === null) {
            setOrigin(null);
            setDestination(null);
            setRoutePath([]);
        }
    }, [routeDetails]);

    const handleMapClick = async (movement: any) => {
        if (!viewerRef.current || !viewerRef.current.cesiumElement) return;
        const viewer = viewerRef.current.cesiumElement;
        const cartesian = viewer.camera.pickEllipsoid(movement.position, viewer.scene.globe.ellipsoid);
        
        if (cartesian) {
            const cartographic = Cartographic.fromCartesian(cartesian);
            const lng = CesiumMath.toDegrees(cartographic.longitude);
            const lat = CesiumMath.toDegrees(cartographic.latitude);

            if (!origin || (origin && destination)) {
                // Start a new route
                setOrigin({ lat, lng });
                setDestination(null);
                setRoutePath([]);
                setRouteDetails(null);
                toast('📍 Origin set. Click destination.', { icon: '🗺️' });
            } else if (origin && !destination) {
                // Set destination and calculate route
                setDestination({ lat, lng });
                toast('📍 Destination set. Calculating route...', { icon: '🚗' });
                await calculateRoute(origin, { lat, lng });
            }
        }
    };

    const calculateRoute = async (start: { lat: number, lng: number }, end: { lat: number, lng: number }) => {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
            const { data } = await axios.get(url);
            
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                const coords = route.geometry.coordinates; // Array of [lng, lat]
                
                const positions = coords.map((c: number[]) => Cartesian3.fromDegrees(c[0], c[1]));
                setRoutePath(positions);
                
                setRouteDetails({
                    distance: route.distance / 1000, // km
                    duration: route.duration / 60 // minutes
                });
                toast.success('Route calculated!');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to calculate route.');
            setOrigin(null);
            setDestination(null);
        }
    };

    return (
        <>
            <ScreenSpaceEventHandler>
                <ScreenSpaceEvent action={handleMapClick} type={ScreenSpaceEventType.LEFT_CLICK} />
            </ScreenSpaceEventHandler>

            {/* Render Origin */}
            {origin && (
                <Entity position={Cartesian3.fromDegrees(origin.lng, origin.lat)}>
                    <PointGraphics pixelSize={12} color={Color.GREEN} outlineColor={Color.WHITE} outlineWidth={2} />
                </Entity>
            )}

            {/* Render Destination */}
            {destination && (
                <Entity position={Cartesian3.fromDegrees(destination.lng, destination.lat)}>
                    <PointGraphics pixelSize={12} color={Color.RED} outlineColor={Color.WHITE} outlineWidth={2} />
                </Entity>
            )}

            {/* Render Route Polyline */}
            {routePath.length > 0 && (
                <Entity>
                    <PolylineGraphics
                        positions={routePath}
                        width={5}
                        material={Color.YELLOW.withAlpha(0.8)}
                        clampToGround={true}
                    />
                </Entity>
            )}

        </>
    );
}
