import React, { useState, memo } from 'react';
import { Layers, MapPin, ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';

export const QuickAccessWidget = memo(function QuickAccessWidget() {
    const [isExpanded, setIsExpanded] = useState(false);
    const theme = useStore(state => state.theme);

    const options = [
        { icon: <MapPin size={16} />, label: 'Plan Safe Route' },
        { icon: <ShieldCheck size={16} />, label: 'Find Safe Zones' },
        { icon: <AlertTriangle size={16} />, label: 'Report an Event' },
        { icon: <Layers size={16} />, label: 'View Layers' }
    ];

    return (
        <div style={{
            position: 'absolute',
            top: '50%',
            right: '16px',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            background: 'var(--glass)',
            backdropFilter: `blur(var(--glass-blur))`,
            border: '1px solid var(--glass-border)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-lg)',
            transition: 'width 0.3s cubic-bezier(0.2, 0, 0, 1)',
            width: isExpanded ? '240px' : '48px',
            overflow: 'hidden'
        }}>
            {/* Header / Toggle Button */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '13px 14px', 
                    cursor: 'pointer',
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
                }}
            >
                <Layers size={18} color={isExpanded ? 'var(--accent)' : 'var(--text-secondary)'} style={{ flexShrink: 0 }} />
                <span style={{ 
                    marginLeft: '12px', 
                    fontSize: '11px', 
                    color: 'var(--text-secondary)', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.5px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    opacity: isExpanded ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                    pointerEvents: 'none'
                }}>
                    Quick Access
                </span>
            </div>
            
            {/* Content Body */}
            <div style={{ 
                padding: '8px 0', 
                display: isExpanded ? 'flex' : 'none', 
                flexDirection: 'column'
            }}>
                {options.map((opt, i) => (
                    <div 
                        key={i}
                        className="interactive-element"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: '10px 16px',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontSize: '13px',
                            fontWeight: 500,
                            transition: 'all 0.2s ease',
                            borderRadius: '8px',
                            margin: '0 8px'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--accent-bg)';
                            e.currentTarget.style.color = 'var(--accent)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                    >
                        <div style={{ marginRight: '12px', display: 'flex', alignItems: 'center' }}>
                            {opt.icon}
                        </div>
                        <span style={{ flex: 1 }}>{opt.label}</span>
                        <ChevronRight size={14} style={{ opacity: 0.5 }} />
                    </div>
                ))}
            </div>
        </div>
    );
});
