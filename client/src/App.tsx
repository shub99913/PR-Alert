import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useSocket } from './hooks/useSocket';
import { useStore } from './store/useStore';
import { Header } from './components/common/Header';
import { StatusBar } from './components/common/StatusBar';
import { LeftColumn } from './components/Panels/LeftColumn';
import { DisasterGlobe } from './components/Globe/DisasterGlobe';
import { SidebarNav } from './components/common/SidebarNav';
import { PageOverlay } from './components/common/PageOverlay';
import { UserRegistration } from './components/Users/UserRegistration';

const API_BASE = 'http://localhost:5002/api';

export default function App() {
    useSocket();
    const { setEvents, setAlerts, setCrowdReports, theme } = useStore();
    const [showUserReg, setShowUserReg] = useState(false);

    // Initial data fetch
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [eventsRes, alertsRes, reportsRes] = await Promise.all([
                    axios.get(`${API_BASE}/events/live`).catch(() => ({ data: { events: [] } })),
                    axios.get(`${API_BASE}/alerts`).catch(() => ({ data: [] })),
                    axios.get(`${API_BASE}/crowd-report`).catch(() => ({ data: [] })),
                ]);

                setEvents(eventsRes.data.events || eventsRes.data || []);
                setAlerts(alertsRes.data || []);
                setCrowdReports(reportsRes.data || []);
            } catch (err) {
                console.error('Failed to fetch initial data:', err);
            }
        };

        fetchInitialData();
        // Refresh every 30s as backup to WebSocket
        const interval = setInterval(fetchInitialData, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="app-layout" data-theme={theme}>
            <Toaster
                position="bottom-left"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#161b22',
                        color: '#fff',
                        border: '1px solid #1C2636'
                    }
                }}
            />
            <Header onRegisterClick={() => setShowUserReg(true)} />
            <main className="app-main" style={{ position: 'relative' }}>
                <SidebarNav />
                <DisasterGlobe />
                <LeftColumn />
                <PageOverlay />
            </main>
            <StatusBar />
            {showUserReg && <UserRegistration onClose={() => setShowUserReg(false)} />}
        </div>
    );
}
