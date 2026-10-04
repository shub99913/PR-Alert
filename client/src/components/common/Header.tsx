import React, { useState, useEffect, useCallback, memo } from 'react';
import { useStore } from '../../store/useStore';
import { Activity, Bell, UserPlus, Moon, Sun, Globe } from 'lucide-react';

interface Props {
    onRegisterClick: () => void;
}

export const Header = memo(function Header({ onRegisterClick }: Props) {
    const events = useStore(state => state.events);
    const alerts = useStore(state => state.alerts);
    const connectionStatus = useStore(state => state.connectionStatus);
    const theme = useStore(state => state.theme);
    const setTheme = useStore(state => state.setTheme);
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 10000); // 10s instead of 1s
        return () => clearInterval(timer);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    }, [theme, setTheme]);

    return (
        <header style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px',
            height: '80px',
            background: theme === 'light' ? 'linear-gradient(90deg, #FFFFFF 0%, #EAF3FA 100%)' : 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Center Background Watermark (Globe pattern) */}
            {theme === 'light' && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    opacity: 0.03,
                    pointerEvents: 'none'
                }}>
                    <Globe size={300} />
                </div>
            )}

            {/* LEFT */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', zIndex: 10, gap: '24px', paddingLeft: '16px' }}>
                <img src="/globe-logo.png" alt="Globe" style={{ width: 64, height: 64, objectFit: 'contain' }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'Montserrat, sans-serif', lineHeight: '1', letterSpacing: '1px' }}>
                        <span style={{ color: theme === 'light' ? '#0B2A4A' : '#fff' }}>PRA</span>
                        <span style={{ color: '#087FE5' }}>LERT</span>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '2px', color: 'var(--text-secondary)', marginTop: '4px', fontFamily: 'Montserrat, sans-serif' }}>
                        PREDICTION RISK ALERT
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Global Insights. Local Impact.
                    </div>
                </div>
            </div>

            {/* CENTER */}
            <div style={{
                flexShrink: 0,
                display: 'flex',
                justifyContent: 'center',
                gap: '24px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '3px',
                color: theme === 'light' ? 'var(--navy)' : 'var(--text-secondary)',
                opacity: 0.8,
                zIndex: 10
            }}>
                <span>MONITOR</span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span>ANALYZE</span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span>FORECAST</span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span>ALERT</span>
                <span style={{ opacity: 0.3 }}>·</span>
                <span style={{ color: 'var(--accent)' }}>SAVE LIVES</span>
            </div>

            {/* RIGHT */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <Activity size={14} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{events.length}</span> Events
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <Bell size={14} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{alerts.length}</span> Alerts
                </div>

                <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />

                <button 
                    onClick={onRegisterClick}
                    style={{ 
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    <UserPlus size={14} /> Register
                </button>

                <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />

                {/* Theme Toggle */}
                <button 
                    onClick={toggleTheme}
                    style={{ 
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                    }}
                    title="Toggle Theme"
                >
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </button>

                {/* Live Status */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    background: connectionStatus === 'connected' ? 'var(--low-bg)' : 'var(--critical-bg)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: connectionStatus === 'connected' ? 'var(--low)' : 'var(--critical)'
                }}>
                    <div className="live-dot" style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: connectionStatus === 'connected' ? 'var(--low)' : 'var(--critical)',
                        boxShadow: connectionStatus === 'connected' ? '0 0 8px var(--low)' : '0 0 8px var(--critical)'
                    }} />
                    {connectionStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
                </div>

                {/* Time */}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                    {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </header>
    );
});
