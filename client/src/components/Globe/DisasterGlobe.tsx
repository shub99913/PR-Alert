import React, { useRef, useEffect, useMemo, useCallback, memo, useState } from 'react';
import { Viewer, Entity, PointGraphics } from 'resium';
import { Cartesian3, Color, Viewer as CesiumViewer } from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import { useStore } from '../../store/useStore';
import { SEVERITY_COLORS, EVENT_TYPE_ICONS } from '../../types';
import { CameraLayer } from './Layers/CameraLayer';
import { RoutingLayer } from './Layers/RoutingLayer';
import { GlobeSearchControl } from './GlobeSearchControl';
import { QuickAccessWidget } from './QuickAccessWidget';
import { LocateFixed } from 'lucide-react';
import toast from 'react-hot-toast';

// Memoized color cache to avoid re-creating Color objects every render
const colorCache: Record<string, Color> = {};
function getCachedColor(severity: string): Color {
    if (!colorCache[severity]) {
        const hex = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || '#6e7681';
        colorCache[severity] = Color.fromCssColorString(hex);
    }
    return colorCache[severity];
}

// Memoized location button — never re-renders unless viewerRef changes
const MyLocationButton = memo(function MyLocationButton({ viewerRef }: { viewerRef: React.RefObject<any> }) {
    const locateUser = useCallback(() => {
        if (navigator.geolocation) {
            toast.loading("Locating...", { id: "locate" });
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (viewerRef.current && viewerRef.current.cesiumElement) {
                        const viewer = viewerRef.current.cesiumElement;
                        viewer.camera.flyTo({
                            destination: Cartesian3.fromDegrees(pos.coords.longitude, pos.coords.latitude, 5000),
                            duration: 2
                        });
                        toast.success("Redirected to your location!", { id: "locate" });
                    }
                },
                (err) => {
                    console.error("Location error", err);
                    toast.error("Could not access your location", { id: "locate" });
                }
            );
        } else {
            toast.error("Geolocation is not supported");
        }
    }, [viewerRef]);

    return (
        <button 
            onClick={locateUser}
            title="My Location"
            style={{ 
                position: 'absolute', 
                top: '5px', 
                right: '120px', 
                zIndex: 1000, 
                width: '32px', 
                height: '32px', 
                background: '#303336', 
                border: '1px solid #444', 
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#484b4d'}
            onMouseOut={(e) => e.currentTarget.style.background = '#303336'}
        >
            <LocateFixed size={18} color="#fff" />
        </button>
    );
});

// Memoized event marker to prevent re-render of all markers when one changes
const EventMarker = memo(function EventMarker({ event }: { event: any }) {
    const position = useMemo(() => 
        Cartesian3.fromDegrees(event.longitude, event.latitude), 
        [event.longitude, event.latitude]
    );

    const description = useMemo(() => `
        <div style="color: black; padding: 5px;">
            <h3 style="margin-top: 0">${event.title}</h3>
            <p><strong>Severity:</strong> ${event.severity.toUpperCase()}</p>
            <p><strong>Type:</strong> ${event.type}</p>
            <p><strong>Source:</strong> ${event.source}</p>
            <p>${new Date(event.timestamp).toLocaleString()}</p>
        </div>
    `, [event.title, event.severity, event.type, event.source, event.timestamp]);

    const color = useMemo(() => getCachedColor(event.severity), [event.severity]);
    const pixelSize = event.severity === 'critical' ? 14 : event.severity === 'high' ? 10 : 8;

    return (
        <Entity
            position={position}
            name={`${EVENT_TYPE_ICONS[event.type] || '⚠️'} ${event.title}`}
            description={description}
        >
            <PointGraphics 
                pixelSize={pixelSize} 
                color={color}
                outlineColor={Color.WHITE}
                outlineWidth={1}
            />
        </Entity>
    );
});

export function DisasterGlobe() {
    const events = useStore(state => state.events);
    const mapCenter = useStore(state => state.mapCenter);
    const theme = useStore(state => state.theme);
    const viewerRef = useRef<any>(null);

    // Enable day/night cycle lighting and load Google 3D Tiles
    useEffect(() => {
        if (viewerRef.current && viewerRef.current.cesiumElement) {
            const viewer: CesiumViewer = viewerRef.current.cesiumElement;
            
            // Balanced Quality Enhancements for Performance
            viewer.scene.highDynamicRange = true;
            viewer.scene.msaaSamples = 2; // Reduced from 4 to 2 for better performance
            viewer.scene.postProcessStages.fxaa.enabled = true;
            
            // Cinematic Bloom Effect (lightweight)
            if (viewer.scene.postProcessStages.bloom) {
                viewer.scene.postProcessStages.bloom.enabled = true;
                viewer.scene.postProcessStages.bloom.uniforms.glowOnly = false;
                viewer.scene.postProcessStages.bloom.uniforms.contrast = 118;
                viewer.scene.postProcessStages.bloom.uniforms.brightness = -0.1;
            }
            
            // Fog for atmospheric scattering
            viewer.scene.fog.enabled = true;
            viewer.scene.fog.density = 0.0001;
            
            // Remove credits
            viewer.cesiumWidget.creditContainer.setAttribute('style', 'display: none;');
        }
    }, []);

    // Handle Theme Switch (Atmospheric Background)
    useEffect(() => {
        if (viewerRef.current && viewerRef.current.cesiumElement) {
            const viewer: CesiumViewer = viewerRef.current.cesiumElement;
            try {
                if (theme === 'light') {
                    if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
                    viewer.scene.backgroundColor = Color.fromCssColorString('#EAF4FB');
                    if (viewer.scene.sun) viewer.scene.sun.show = false;
                    if (viewer.scene.moon) viewer.scene.moon.show = false;
                } else {
                    if (viewer.scene.skyBox) viewer.scene.skyBox.show = true;
                    viewer.scene.backgroundColor = Color.BLACK;
                    if (viewer.scene.sun) viewer.scene.sun.show = true;
                    if (viewer.scene.moon) viewer.scene.moon.show = true;
                }
                // Request a render after theme change
                viewer.scene.requestRender();
            } catch (e) {
                console.warn("Theme switch warning:", e);
            }
        }
    }, [theme]);

    // Fly to new search locations
    useEffect(() => {
        if (mapCenter && viewerRef.current && viewerRef.current.cesiumElement) {
            const viewer: CesiumViewer = viewerRef.current.cesiumElement;
            viewer.camera.flyTo({
                destination: Cartesian3.fromDegrees(mapCenter.lng, mapCenter.lat, 200000),
                duration: 1.5
            });
        }
    }, [mapCenter]);

    // Initialize Cesium default view models for the BaseLayerPicker
    const [viewModels, setViewModels] = useState<any[]>([]);
    const [selectedViewModel, setSelectedViewModel] = useState<any>(null);

    useEffect(() => {
        import('cesium').then((Cesium: any) => {
            try {
                const vms = Cesium.createDefaultImageryProviderViewModels();
                setViewModels(vms);
                
                // Find Bing Maps Aerial with Labels
                const bingAerial = vms.find((vm: any) => vm.name === 'Bing Maps Aerial with Labels');
                if (bingAerial) {
                    setSelectedViewModel(bingAerial);
                }
            } catch (e) {
                console.error("Failed to set base layer view models", e);
            }
        });
    }, []);

    // Limit visible markers to 200 max to prevent overwhelming Cesium
    const visibleEvents = useMemo(() => events.slice(0, 200), [events]);

    if (viewModels.length === 0) {
        return (
            <div style={{ 
                height: '100%', 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                color: 'var(--text-secondary)'
            }}>
                Loading Globe...
            </div>
        );
    }

    return (
        <div style={{ height: '100%', width: '100%', position: 'relative', overflow: 'hidden', borderRadius: '4px' }}>
            <Viewer
                ref={viewerRef}
                full
                animation={false}
                timeline={false}
                baseLayerPicker={true}
                geocoder={false}
                homeButton={true}
                infoBox={true}
                sceneModePicker={true}
                navigationHelpButton={false}
                imageryProviderViewModels={viewModels.length > 0 ? viewModels : undefined}
                selectedImageryProviderViewModel={selectedViewModel || undefined}
                style={{ height: '100%', width: '100%' }}
            >
                <CameraLayer />
                <RoutingLayer viewerRef={viewerRef} />
                
                {visibleEvents.map(event => (
                    <EventMarker key={event.id} event={event} />
                ))}

                <GlobeSearchControl />
                <MyLocationButton viewerRef={viewerRef} />
                <QuickAccessWidget />
            </Viewer>
        </div>
    );
}
