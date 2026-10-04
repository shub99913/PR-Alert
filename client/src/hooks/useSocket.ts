import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useStore } from '../store/useStore';
import axios from 'axios';
import toast from 'react-hot-toast';

const SOCKET_URL = 'http://localhost:5002';

export function useSocket() {
    const socketRef = useRef<Socket | null>(null);
    const { addEvents, addAlert, addCrowdReport, setConnectionStatus, setEvents, setAlerts } = useStore();

    useEffect(() => {
        const socket = io(SOCKET_URL, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 2000,
        });
        socketRef.current = socket;

        socket.on('connect', async () => {
            console.log('[Socket] Connected');
            setConnectionStatus('connected');

            try {
                const [eventsRes, alertsRes] = await Promise.all([
                    axios.get(`${SOCKET_URL}/api/events/live`).catch(() => ({ data: { events: [] } })),
                    axios.get(`${SOCKET_URL}/api/alerts`).catch(() => ({ data: [] }))
                ]);
                setEvents(eventsRes.data.events || []);
                setAlerts(alertsRes.data || []);
            } catch (err) {
                console.error("[useSocket] State sync failed", err);
            }
        });

        socket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
            setConnectionStatus('disconnected');
        });

        socket.on('connect_error', () => {
            setConnectionStatus('disconnected');
        });

        socket.on('new_events', (events) => {
            addEvents(events);
            if (events && events.length > 0) {
                if (events.length > 3) {
                    toast(`ℹ️ ${events.length} new events received.`);
                } else {
                    events.forEach((e: any) => {
                        if (e.severity === 'critical' || e.severity === 'high') {
                            toast(`🚨 New ${e.type}: ${e.title}`);
                        } else {
                            toast(`ℹ️ New ${e.type}: ${e.title}`);
                        }
                    });
                }
            }
        });

        socket.on('alert_update', (alert) => {
            addAlert(alert);
            toast.success(`Alert sent via ${alert.channels.join(', ')}`);
        });

        socket.on('new_crowd_report', (report) => {
            addCrowdReport(report);
            toast(`👤 New crowd report: ${report.type}`, { icon: '👥' });
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    return socketRef;
}
