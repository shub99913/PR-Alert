import { useState } from 'react';
import { useStore } from '../../store/useStore';

const LAYERS = [
    { id: 'earthquake', label: 'Earthquakes', icon: '🔴' },
    { id: 'weather', label: 'Weather Alerts', icon: '⛈️' },
    { id: 'wildfire', label: 'Wildfires', icon: '🔥' },
    { id: 'flood', label: 'Floods', icon: '🌊' },
    { id: 'cyclone', label: 'Cyclones', icon: '🌀' },
    { id: 'tsunami', label: 'Tsunamis', icon: '🌊' },
    { id: 'volcano', label: 'Volcanoes', icon: '🌋' },
    { id: 'other', label: 'Other / Reports', icon: '⚠️' },
    { id: 'shelters', label: 'Shelters', icon: '🏥' },
    { id: 'heatmap', label: 'Risk Heatmap', icon: '🗺️' },
];

interface LayerControlProps {
    isContextMenu?: boolean;
    position?: { x: number; y: number } | null;
    onClose?: () => void;
}

export function LayerControl({ isContextMenu, position, onClose }: LayerControlProps) {
    const { activeLayers, toggleLayer, events } = useStore();
    const [isOpen, setIsOpen] = useState(false);
    
    const getCount = (type: string) => events.filter((e: any) => e.type === type).length;

    if (isContextMenu && !position) return null;

    if (!isContextMenu && !isOpen) {
        return (
            <button 
                className="layer-control-btn"
                onClick={() => setIsOpen(true)}
                title="Map Layers"
            >
                🗺️
            </button>
        );
    }

    return (
        <div 
            className={isContextMenu ? "layer-context-menu" : "layer-control"}
            style={isContextMenu && position ? { left: position.x, top: position.y } : {}}
            onMouseLeave={isContextMenu ? onClose : undefined}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>
                    <span className="icon">🗺️</span> 
                    <span className="title" style={{ marginLeft: 6 }}>Map Layers</span>
                </h4>
                {!isContextMenu && (
                    <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: 16 }}>×</button>
                )}
            </div>
            <div className="layer-control-content">
                {LAYERS.map(layer => {
                    const count = getCount(layer.id);
                    const active = activeLayers.has(layer.id);
                    return (
                        <div
                            key={layer.id}
                            className={`layer-toggle ${active ? 'active' : ''}`}
                            onClick={() => toggleLayer(layer.id)}
                        >
                            <div className="layer-toggle-switch" />
                            <span>{layer.icon}</span>
                            <span style={{ flex: 1 }}>{layer.label}</span>
                            {count > 0 && (
                                <span style={{ fontSize: 10, color: '#64748b' }}>{count}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
