import { FC, useState } from 'react';
import { Shield, Home, X } from 'lucide-react';
import { useMap } from 'react-leaflet';
import { useStore } from '../../store/useStore';

export const MapActionTabs: FC = () => {
    const { activeLayers, toggleLayer } = useStore();
    const [showPrecautions, setShowPrecautions] = useState(false);

    const map = useMap();

    const handleShelterClick = () => {
        if (!activeLayers.has('shelters')) {
            toggleLayer('shelters');
        }
    };

    return (
        <>
            <div className="map-action-tabs" style={{
                position: 'absolute',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                display: 'flex',
                gap: 12
            }}>
                <button
                    className="btn interactive-element"
                    onClick={handleShelterClick}
                    style={{
                        background: activeLayers.has('shelters') ? 'var(--low)' : 'var(--bg-card)',
                        color: activeLayers.has('shelters') ? '#000' : 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)'
                    }}
                >
                    <Home size={14} style={{ marginRight: 6 }} />
                    SAFE SHELTER LOCATIONS
                </button>
                <button
                    className="btn interactive-element"
                    onClick={() => setShowPrecautions(true)}
                    style={{
                        background: 'var(--high)',
                        color: '#000',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow-lg)'
                    }}
                >
                    <Shield size={14} style={{ marginRight: 6 }} />
                    QUICK PRECAUTIONS
                </button>
            </div>

            {showPrecautions && (
                <div className="modal-overlay">
                    <div className="modal-content interactive-element" style={{ borderTop: '4px solid var(--high)' }}>
                        <div className="modal-header">
                            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Shield size={18} color="var(--high)" />
                                QUICK PRECAUTIONS TO TAKE
                            </h3>
                            <button className="modal-close" onClick={() => setShowPrecautions(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: '1.6' }}>
                            <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--text-primary)' }}>1. Evacuation Readiness:</strong> Keep a "go-bag" packed with essential medical supplies, IDs, water, and clothing.</p>
                            <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--text-primary)' }}>2. Air Quality Defense:</strong> Keep windows locked and use HEPA air purifiers during High/Extreme fire threats.</p>
                            <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--text-primary)' }}>3. Property Hardening:</strong> Clear dry brush, leaves, and flammable materials at least 30 feet from structures.</p>
                            <p style={{ marginBottom: 12 }}><strong style={{ color: 'var(--text-primary)' }}>4. Stay Informed:</strong> Monitor this dashboard and wait for official SMS/alert dispatches regarding localized evacuations.</p>
                        </div>
                        <button className="btn btn-primary btn-block interactive-element" style={{ marginTop: 16 }} onClick={() => setShowPrecautions(false)}>ACKNOWLEDGE</button>
                    </div>
                </div>
            )}
        </>
    );
};
