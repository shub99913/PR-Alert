import React from 'react';
import { useStore } from '../../store/useStore';
import { X } from 'lucide-react';

export const PageOverlay: React.FC = () => {
    const { activePage, setActivePage, theme } = useStore();

    if (!activePage) return null;

    const isLight = theme === 'light';

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(13, 17, 23, 0.95)',
            backdropFilter: 'blur(16px)',
            zIndex: 1500,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px 32px',
                borderBottom: `1px solid ${isLight ? 'var(--glass-border)' : 'var(--border)'}`,
                position: 'relative'
            }}>
                <h1 style={{ 
                    margin: 0, 
                    fontSize: '24px', 
                    fontWeight: 600, 
                    color: 'var(--text-primary)',
                    letterSpacing: '-0.5px'
                }}>
                    {activePage}
                </h1>
                <button 
                    onClick={() => setActivePage(null)}
                    style={{
                        position: 'absolute',
                        right: '32px',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        borderRadius: '50%',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                    <X size={24} />
                </button>
            </div>
            <div style={{
                flex: 1,
                padding: '32px',
                overflowY: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                {/* Blank content area for future implementation */}
                <div style={{
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                    fontSize: '16px'
                }}>
                    This page is currently blank and ready for future implementation.
                </div>
            </div>
        </div>
    );
};
