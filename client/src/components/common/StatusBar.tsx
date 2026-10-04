import React, { FC, useEffect, useState, memo } from 'react';
import { Globe } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const StatusBar: FC = memo(() => {
    const theme = useStore(state => state.theme);
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 5000); // Update every 5s instead of 1s
        return () => clearInterval(timer);
    }, []);

    const isLight = theme === 'light';

    return (
        <footer style={{
            height: '32px',
            background: isLight ? '#FFFFFF' : 'var(--bg-tertiary)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            color: 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            gap: '24px',
            boxShadow: isLight ? '0 -4px 12px rgba(30, 80, 120, 0.03)' : 'none',
            zIndex: 100
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>SENSOR NETWORK</span>
                <div className="live-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--low)', boxShadow: '0 0 6px var(--low)', flexShrink: 0 }} />
                <span style={{ color: 'var(--low)' }}>ONLINE</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>SATELLITES</span>
                <span style={{ color: isLight ? 'var(--navy)' : 'var(--text-primary)' }}>12 ACTIVE</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>DRONES</span>
                <span style={{ color: isLight ? 'var(--navy)' : 'var(--text-primary)' }}>8 ACTIVE</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>CAMERA TOWERS</span>
                <span style={{ color: 'var(--low)' }}>156 ONLINE</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>WEATHER STATIONS</span>
                <span style={{ color: 'var(--low)' }}>210 ONLINE</span>
            </div>

            <div style={{ flex: 1 }}></div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: 'var(--text-muted)' }}>LAST DATA UPDATE</span>
                <span style={{ color: isLight ? 'var(--navy)' : 'var(--text-primary)' }}>
                    {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
            </div>

            <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: isLight ? 'var(--accent-bg)' : 'rgba(255,255,255,0.05)', 
                padding: '4px 12px', 
                borderRadius: '16px',
                color: 'var(--accent)',
                marginLeft: '12px'
            }}>
                <Globe size={12} />
                <span>EARTH WATCHED &bull; LIVES PROTECTED</span>
            </div>
        </footer>
    );
});
