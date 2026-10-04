import React, { useState, memo } from 'react';
import { useStore } from '../../store/useStore';
import { 
    LayoutDashboard, 
    Map, 
    CloudLightning, 
    ShieldCheck, 
    Bell, 
    History, 
    Box, 
    Info 
} from 'lucide-react';

const navItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Live Map', icon: <Map size={20} />, active: true },
    { name: 'Hazard Forecast', icon: <CloudLightning size={20} /> },
    { name: 'Safe Zones', icon: <ShieldCheck size={20} /> },
    { name: 'Alerts', icon: <Bell size={20} /> },
    { name: 'Historical Data', icon: <History size={20} /> },
    { name: 'Resources', icon: <Box size={20} /> },
    { name: 'About', icon: <Info size={20} /> },
];

export const SidebarNav = memo(function SidebarNav() {
    const [isExpanded, setIsExpanded] = useState(false);
    const setActivePage = useStore(state => state.setActivePage);
    const activePage = useStore(state => state.activePage);

    const handleItemClick = (name: string) => {
        if (name === 'Dashboard') {
            setIsExpanded(!isExpanded);
        } else if (name === 'Live Map') {
            setActivePage(null);
        } else {
            setActivePage(name);
        }
    };

    return (
        <div className={`sidebar-nav ${isExpanded ? 'expanded' : ''}`}>
            {navItems.map((item, index) => {
                const isActive = item.name === 'Live Map' ? !activePage : activePage === item.name;
                return (
                    <div 
                        key={index} 
                        className={`sidebar-item ${isActive ? 'active' : ''}`}
                        title={item.name}
                        onClick={() => handleItemClick(item.name)}
                    >
                        <div className="sidebar-icon">{item.icon}</div>
                        <span className="sidebar-text">{item.name}</span>
                    </div>
                );
            })}

            {/* Promo Image */}
            <div style={{
                marginTop: 'auto',
                padding: isExpanded ? '0 16px 16px 16px' : '0',
                transition: 'all 0.3s ease',
                opacity: isExpanded ? 1 : 0,
                maxHeight: isExpanded ? '200px' : '0',
                overflow: 'hidden',
                pointerEvents: isExpanded ? 'auto' : 'none'
            }}>
                <img 
                    src="/safer-planet.jpg" 
                    alt="A Safer Planet, A Brighter Tomorrow" 
                    style={{
                        width: '100%',
                        borderRadius: '12px',
                        boxShadow: 'var(--shadow-md)',
                        objectFit: 'cover'
                    }} 
                />
            </div>
        </div>
    );
});
