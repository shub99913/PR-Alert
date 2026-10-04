import { useMemo, useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { useStore } from '../../store/useStore';
import { LayerControl } from './LayerControl';
import { ShelterLayer } from './ShelterLayer';
import { HeatmapLayer } from './HeatmapLayer';
import { MapSearchControl } from './MapSearchControl';
import { MapActionTabs } from './MapActionTabs';
import { SEVERITY_COLORS, EVENT_TYPE_ICONS, type DisasterEvent, type Severity } from '../../types';

function getMagnitudeRadius(mag?: number): number {
    if (!mag) return 6;
    if (mag >= 7) return 22;
    if (mag >= 6) return 18;
    if (mag >= 5) return 14;
    if (mag >= 4) return 11;
    if (mag >= 3) return 8;
    return 5;
}

function getTypeColor(type: string, severity: Severity): string {
    const typeColors: Record<string, string> = {
        earthquake: SEVERITY_COLORS[severity],
        wildfire: '#ff6d00',
        flood: '#2979ff',
        cyclone: '#d500f9',
        tsunami: '#00b8d4',
        weather: '#ffab00',
        volcano: '#ff3d00',
        other: '#78909c',
    };
    return typeColors[type] || SEVERITY_COLORS[severity];
}

function formatTimeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function MapFlyTo() {
    const map = useMap();
    const { selectedEvent } = useStore();

    useEffect(() => {
        if (selectedEvent && typeof selectedEvent.latitude === 'number' && typeof selectedEvent.longitude === 'number') {
            map.flyTo([selectedEvent.latitude, selectedEvent.longitude], 7, {
                duration: 1.5,
            });
        }
    }, [selectedEvent, map]);

    return null;
}

function EventMarkers() {
    const { events, activeLayers, setSelectedEvent, setRightPanelTab } = useStore();

    const visibleEvents = useMemo(() => {
        return events.filter((e: any) =>
            activeLayers.has(e.type) &&
            typeof e.latitude === 'number' && !isNaN(e.latitude) &&
            typeof e.longitude === 'number' && !isNaN(e.longitude)
        );
    }, [events, activeLayers]);

    const handleAlertClick = (event: DisasterEvent) => {
        setSelectedEvent(event);
        setRightPanelTab('compose');
    };

    return (
        <>
            {visibleEvents.map((event) => {
                const color = getTypeColor(event.type, event.severity);
                const radius = event.type === 'earthquake'
                    ? getMagnitudeRadius(event.magnitude)
                    : event.type === 'wildfire' ? 5 : 8;

                return (
                    <CircleMarker
                        key={event.id}
                        center={[event.latitude, event.longitude]}
                        radius={radius}
                        pathOptions={{
                            color: color,
                            fillColor: color,
                            fillOpacity: 0.6,
                            weight: 1.5,
                            opacity: 0.9,
                            className: event.severity === 'critical' ? 'marker-critical' : event.severity === 'high' ? 'marker-high' : ''
                        }}
                        eventHandlers={{
                            click: () => setSelectedEvent(event),
                        }}
                    >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                            <strong>{EVENT_TYPE_ICONS[event.type]} {event.title}</strong>
                            <br/>
                            <span className={`severity-badge ${event.severity}`} style={{marginTop: 4, display: 'inline-block'}}>{event.severity}</span>
                        </Tooltip>
                        <Popup maxWidth={300}>
                            <div className="popup-content">
                                <h3>{EVENT_TYPE_ICONS[event.type]} {event.title}</h3>
                                <div className="popup-detail">
                                    <span>Severity</span>
                                    <span className={`severity-badge ${event.severity}`}>{event.severity}</span>
                                </div>
                                {event.magnitude != null && (
                                    <div className="popup-detail">
                                        <span>Magnitude</span>
                                        <span><strong>{event.magnitude.toFixed(1)}</strong></span>
                                    </div>
                                )}
                                {event.depth != null && (
                                    <div className="popup-detail">
                                        <span>Depth</span>
                                        <span>{event.depth.toFixed(1)} km</span>
                                    </div>
                                )}
                                <div className="popup-detail">
                                    <span>Time</span>
                                    <span>{formatTimeAgo(event.timestamp)}</span>
                                </div>
                                <div className="popup-detail">
                                    <span>Source</span>
                                    <span style={{ textTransform: 'uppercase' }}>{event.source}</span>
                                </div>
                                <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: 6, lineHeight: 1.3 }}>
                                    {(event.description || '').substring(0, 150)}
                                </p>
                                <div className="popup-actions">
                                    <button className="btn btn-danger btn-sm" onClick={() => handleAlertClick(event)}>
                                        🚨 Send Alert
                                    </button>
                                    {event.url && (
                                        <a href={event.url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm">
                                            Details ↗
                                        </a>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </CircleMarker>
                );
            })}
        </>
    );
}

function MapTracker() {
    const setMapCenter = useStore(state => state.setMapCenter);
    useMapEvents({
        moveend: (e) => {
            const center = e.target.getCenter();
            setMapCenter({ lat: center.lat, lng: center.lng });
        }
    });
    return null;
}

export function DisasterMap() {
    const [contextMenuPos, setContextMenuPos] = useState<{x: number, y: number} | null>(null);

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div className="map-container" onContextMenu={handleContextMenu} onClick={() => setContextMenuPos(null)}>
            <MapContainer
                center={[20, 0]}
                zoom={2}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
                minZoom={2}
                maxZoom={18}
                worldCopyJump={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    className="map-tiles"
                />
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    className="map-labels"
                    opacity={0.8}
                />
                <EventMarkers />
                <ShelterLayer />
                <HeatmapLayer />
                <MapSearchControl />
                <MapActionTabs />
                <MapFlyTo />
                <MapTracker />
            </MapContainer>
            <LayerControl />
            <LayerControl isContextMenu position={contextMenuPos} onClose={() => setContextMenuPos(null)} />
        </div>
    );
}
