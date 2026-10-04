import { create } from 'zustand';
import { DisasterEvent, Alert, CrowdReport, RiskData } from '../types';

interface DashboardState {
    // Data
    events: DisasterEvent[];
    alerts: Alert[];
    crowdReports: CrowdReport[];

    // UI State
    selectedEvent: DisasterEvent | null;
    showAlertComposer: boolean;
    activeLayers: Set<string>;
    connectionStatus: 'connected' | 'disconnected' | 'connecting';
    riskData: RiskData | null;

    // Panel states
    leftPanelTab: 'feeds' | 'reports' | 'users';
    rightPanelTab: 'alerts' | 'compose' | 'analytics';

    // Map state
    mapCenter: { lat: number; lng: number } | null;
    routeDetails: { distance: number; duration: number } | null;

    // Overlay state
    activePage: string | null;

    // Theme state
    theme: 'light' | 'dark';

    // Actions
    setEvents: (events: DisasterEvent[]) => void;
    addEvents: (events: DisasterEvent[]) => void;
    setAlerts: (alerts: Alert[]) => void;
    addAlert: (alert: Alert) => void;
    setCrowdReports: (reports: CrowdReport[]) => void;
    addCrowdReport: (report: CrowdReport) => void;
    setSelectedEvent: (event: DisasterEvent | null) => void;
    setShowAlertComposer: (show: boolean) => void;
    toggleLayer: (layer: string) => void;
    setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
    setRiskData: (data: RiskData | null) => void;
    setLeftPanelTab: (tab: 'feeds' | 'reports' | 'users') => void;
    setRightPanelTab: (tab: 'alerts' | 'compose' | 'analytics') => void;
    setMapCenter: (center: { lat: number; lng: number } | null) => void;
    setRouteDetails: (details: { distance: number; duration: number } | null) => void;
    setTheme: (theme: 'light' | 'dark') => void;
    setActivePage: (page: string | null) => void;
}

export const useStore = create<DashboardState>((set) => ({
    events: [],
    alerts: [],
    crowdReports: [],
    selectedEvent: null,
    showAlertComposer: false,
    activeLayers: new Set(['earthquake', 'weather', 'wildfire', 'cyclone', 'flood']),
    connectionStatus: 'connecting',
    riskData: null,
    leftPanelTab: 'feeds',
    rightPanelTab: 'alerts',
    mapCenter: null,
    routeDetails: null,
    activePage: null,
    theme: 'light', // Default to light theme for PRALERT redesign

    setEvents: (events) => set({ events }),
    addEvents: (newEvents) => set((state) => {
        const existingIds = new Set(state.events.map(e => e.id));
        const unique = newEvents.filter(e => !existingIds.has(e.id));
        return { events: [...unique, ...state.events].slice(0, 1000) };
    }),
    setAlerts: (alerts) => set({ alerts }),
    addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts].slice(0, 500) })),
    setCrowdReports: (crowdReports) => set({ crowdReports }),
    addCrowdReport: (report) => set((state) => ({ crowdReports: [report, ...state.crowdReports].slice(0, 500) })),
    setSelectedEvent: (selectedEvent) => set({ selectedEvent }),
    setShowAlertComposer: (showAlertComposer) => set({ showAlertComposer }),
    toggleLayer: (layer) => set((state) => {
        const newLayers = new Set(state.activeLayers);
        if (newLayers.has(layer)) newLayers.delete(layer);
        else newLayers.add(layer);
        return { activeLayers: newLayers };
    }),
    setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
    setRiskData: (riskData) => set({ riskData }),
    setLeftPanelTab: (leftPanelTab) => set({ leftPanelTab }),
    setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
    setMapCenter: (mapCenter) => set({ mapCenter }),
    setRouteDetails: (routeDetails) => set({ routeDetails }),
    setTheme: (theme) => set({ theme }),
    setActivePage: (activePage) => set({ activePage }),
}));
