import { FC, useEffect, useState, useMemo, useCallback, memo } from 'react';
import axios from 'axios';
import { useStore } from '../../store/useStore';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Flame, Wind, Droplets, Thermometer } from 'lucide-react';
import { EVENT_TYPE_ICONS } from '../../types';

const COLORS = ['#f85149', '#d29922', '#e3a324', '#3fb950'];

const RISK_DATA = [
    { name: 'Extreme', value: 12 },
    { name: 'High', value: 28 },
    { name: 'Moderate', value: 34 },
    { name: 'Low', value: 26 },
];

function formatTimeAgo(ts: string): string {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

// Memoized single event card
const EventCard = memo(function EventCard({ event }: { event: any }) {
    return (
        <div
            className={`event-card severity-${event.severity}`}
            style={{ marginBottom: 6, padding: '10px 12px', borderRadius: 10 }}
        >
            <div className="event-card-header">
                <span className="event-card-icon">{EVENT_TYPE_ICONS[event.type] || '⚠️'}</span>
                <span className="event-card-title">{event.title}</span>
            </div>
            <div className="event-card-meta">
                <span className={`severity-badge ${event.severity}`}>{event.severity}</span>
                <span>{formatTimeAgo(event.timestamp)}</span>
                <span style={{ textTransform: 'uppercase', fontSize: 9 }}>{event.source}</span>
            </div>
        </div>
    );
});

// Memoized PieChart to avoid re-rendering on every parent update
const RiskChart = memo(function RiskChart() {
    return (
        <div style={{ width: 120, height: 120 }}>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={RISK_DATA} innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value" stroke="none">
                        {RISK_DATA.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
});

export const LeftColumn: FC = () => {
    const events = useStore(state => state.events);
    const mapCenter = useStore(state => state.mapCenter);
    const setMapCenter = useStore(state => state.setMapCenter);
    const routeDetails = useStore(state => state.routeDetails);
    const setRouteDetails = useStore(state => state.setRouteDetails);
    const [weather, setWeather] = useState<any>(null);

    // Debounced weather fetch — only re-fetch when mapCenter actually changes
    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        const fetchWeather = async (latitude: number, longitude: number) => {
            try {
                const res = await axios.get(
                    `http://localhost:5002/api/weather/current?lat=${latitude}&lon=${longitude}`,
                    { signal: controller.signal }
                );
                if (!cancelled) setWeather(res.data);
            } catch (err) {
                if (!axios.isCancel(err)) console.error("Failed to load local weather", err);
            }
        };

        if (mapCenter) {
            fetchWeather(mapCenter.lat, mapCenter.lng);
        } else {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        if (!cancelled) {
                            fetchWeather(pos.coords.latitude, pos.coords.longitude);
                            setMapCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                        }
                    },
                    () => fetchWeather(37.7749, -122.4194)
                );
            } else {
                fetchWeather(37.7749, -122.4194);
            }
        }

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [mapCenter, setMapCenter]);

    const clearRoute = useCallback(() => setRouteDetails(null), [setRouteDetails]);

    // Only show the latest 30 events (reduced from 50 to improve scroll perf)
    const displayEvents = useMemo(() => events.slice(0, 30), [events]);

    return (
        <div className="panel right" style={{ display: 'flex', flexDirection: 'column' }}>
            {routeDetails ? (
                <div className="tactical-widget interactive-element" style={{ flexShrink: 0 }}>
                    <div className="widget-title">TACTICAL ROUTING</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', alignItems: 'center' }}>
                        <div>
                            <div className="stat-value" style={{ fontSize: 24, color: 'var(--accent)' }}>{routeDetails.distance.toFixed(1)}</div>
                            <div className="stat-label" style={{ fontSize: 9 }}>DISTANCE (KM)</div>
                        </div>
                        <div>
                            <div className="stat-value" style={{ fontSize: 24 }}>{Math.round(routeDetails.duration)}</div>
                            <div className="stat-label" style={{ fontSize: 9 }}>EST. TIME (MINS)</div>
                        </div>
                        <button 
                            onClick={clearRoute}
                            style={{ background: '#ff174422', border: '1px solid #ff1744', color: '#ff1744', borderRadius: 4, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}
                        >
                            CLEAR ROUTE
                        </button>
                    </div>
                </div>
            ) : (
                <div className="tactical-widget interactive-element" style={{ flexShrink: 0 }}>
                    <div className="widget-title">TACTICAL ROUTING</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                            <input type="text" placeholder="Select origin on map..." style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} readOnly />
                        </div>
                        <div style={{ width: '1px', height: '8px', background: 'var(--border)', margin: '0 0 0 3px' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid var(--accent)' }} />
                            <input type="text" placeholder="Select destination..." style={{ flex: 1, background: 'var(--bg-primary)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '12px' }} readOnly />
                        </div>
                        <button style={{ background: 'var(--accent)', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, marginTop: '8px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
                            GENERATE ROUTE &rarr;
                        </button>
                    </div>
                </div>
            )}

            <div className="tactical-widget interactive-element" style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                    <div className="widget-title">RISK SUMMARY</div>
                    {RISK_DATA.map((d, i) => (
                        <div key={d.name} className="stat-row" style={{ marginBottom: 4 }}>
                            <div className="stat-label">
                                <span style={{ width: 8, height: 8, backgroundColor: COLORS[i], display: 'inline-block', borderRadius: '50%' }}></span>
                                {d.name}
                            </div>
                            <div className="stat-value" style={{ fontSize: 11 }}>{d.value}%</div>
                        </div>
                    ))}
                </div>
                <RiskChart />
            </div>

            <div className="tactical-widget interactive-element">
                <div className="widget-title">LOCAL WEATHER & CONDITIONS</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center' }}>
                    <div>
                        <Thermometer size={18} color="var(--text-secondary)" style={{ margin: '0 auto 4px' }} />
                        <div className="stat-label" style={{ fontSize: 9 }}>TEMP</div>
                        <div className="stat-value">{weather ? `${weather.temp}°C` : '--'}</div>
                    </div>
                    <div>
                        <Droplets size={18} color="var(--text-secondary)" style={{ margin: '0 auto 4px' }} />
                        <div className="stat-label" style={{ fontSize: 9 }}>HUMIDITY</div>
                        <div className="stat-value">{weather ? `${weather.humidity}%` : '--'}</div>
                    </div>
                    <div>
                        <Wind size={18} color="var(--text-secondary)" style={{ margin: '0 auto 4px' }} />
                        <div className="stat-label" style={{ fontSize: 9 }}>WIND</div>
                        <div className="stat-value">{weather ? `${weather.wind} km/h` : '--'}<br /><span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{(weather?.description || '').toUpperCase()}</span></div>
                    </div>
                    <div>
                        <Flame size={18} color={weather && weather.temp > 32 && weather.humidity < 20 ? "var(--critical)" : "var(--caution)"} style={{ margin: '0 auto 4px' }} />
                        <div className="stat-label" style={{ fontSize: 9 }}>FIRE THREAT</div>
                        <div className={`stat-value ${weather && weather.temp > 32 && weather.humidity < 20 ? 'red' : 'orange'}`}>
                            {weather ? (weather.temp > 32 && weather.humidity < 20 ? 'Extreme' : 'Elevated') : '--'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="tactical-widget interactive-element" style={{ padding: 0, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '12px 12px 8px' }}>
                    <div className="widget-title">LATEST NEWS ALERTS</div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 12px' }}>
                    {displayEvents.map(event => (
                        <EventCard key={event.id} event={event} />
                    ))}
                </div>
            </div>
        </div>
    );
};
