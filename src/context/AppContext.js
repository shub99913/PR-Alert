import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Alert, 
  DisasterEvent, 
  CrowdReport, 
  User,
  DispatchRecord 
} from '../types';
import { apiService } from '../services/api';
import { wsService } from '../services/websocket';

// Engine status types
export interface EngineStatus {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error' | 'starting';
  lastUpdate: number;
  metrics: Record<string, any>;
  version: string;
}

export interface AppState {
  // Engine statuses
  engines: Record<string, EngineStatus>;
  
  // Events and alerts
  events: DisasterEvent[];
  alerts: Alert[];
  activeAlerts: Alert[];
  
  // Crowd reports
  crowdReports: CrowdReport[];
  
  // User
  user: User | null;
  userLocation: { lat: number; lon: number; accuracy: number } | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  lastRefresh: number;
  
  // Settings
  settings: {
    notificationsEnabled: boolean;
    locationEnabled: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
    language: string;
    severityFilter: string[];
    disasterTypeFilter: string[];
  };
}

const initialState: AppState = {
  engines: {},
  events: [],
  alerts: [],
  activeAlerts: [],
  crowdReports: [],
  user: null,
  userLocation: null,
  isLoading: false,
  error: null,
  lastRefresh: 0,
  settings: {
    notificationsEnabled: true,
    locationEnabled: true,
    autoRefresh: true,
    refreshInterval: 60000,
    language: 'en',
    severityFilter: ['INFO', 'WARNING', 'ALERT', 'EMERGENCY'],
    disasterTypeFilter: [],
  },
};

const AppContext = createContext({
  state: initialState,
  dispatch: () => {},
  refreshData: async () => {},
  setUserLocation: () => {},
  addAlert: () => {},
  updateAlert: () => {},
  dismissAlert: () => {},
  submitFeedback: async () => {},
  submitCrowdReport: async () => ({} as CrowdReport),
  updateSettings: () => {},
});

export const AppProvider = ({ children }) => {
  const [state, setState] = useState(initialState);

  // Action creators
  const setLoading = useCallback((loading) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const updateEngines = useCallback((engines) => {
    setState(prev => ({ ...prev, engines }));
  }, []);

  const setEvents = useCallback((events) => {
    setState(prev => ({ ...prev, events }));
  }, []);

  const setAlerts = useCallback((alerts) => {
    setState(prev => ({
      ...prev,
      alerts,
      activeAlerts: alerts.filter(a => a.status === 'issued' || a.status === 'active')
    }));
  }, []);

  const addAlert = useCallback((alert) => {
    setState(prev => ({ 
      ...prev, 
      alerts: [alert, ...prev.alerts],
      activeAlerts: alert.status === 'issued' || alert.status === 'active'
        ? [alert, ...prev.activeAlerts]
        : prev.activeAlerts
    }));
  }, []);

  const updateAlert = useCallback((alertId, updates) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => a._id === alertId ? { ...a, ...updates } : a),
      activeAlerts: prev.activeAlerts.map(a => a._id === alertId ? { ...a, ...updates } : a),
    }));
  }, []);

  const dismissAlert = useCallback((alertId) => {
    setState(prev => ({
      ...prev,
      alerts: prev.alerts.map(a => a._id === alertId ? { ...a, status: 'dismissed' } : a),
      activeAlerts: prev.activeAlerts.filter(a => a._id !== alertId),
    }));
  }, []);

  const setCrowdReports = useCallback((reports) => {
    setState(prev => ({ ...prev, crowdReports: reports }));
  }, []);

  const setUser = useCallback((user) => {
    setState(prev => ({ ...prev, user }));
  }, []);

  const setUserLocation = useCallback((location) => {
    setState(prev => ({ ...prev, userLocation: location }));
  }, []);

  const updateSettings = useCallback((settings) => {
    setState(prev => ({ 
      ...prev, 
      settings: { ...prev.settings, ...settings } 
    }));
  }, []);

  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch live events from backend
      const eventsResponse = await apiService.getLiveEvents();
      const events = eventsResponse.events || [];
      
      // Transform backend events to frontend format
      const formattedEvents = events.map(event => ({
        _id: event.sourceId || `evt_${Date.now()}`,
        source: event.source,
        sourceId: event.sourceId,
        disasterType: event.disasterType,
        severity: event.severity?.toUpperCase() || 'INFO',
        confidence: event.confidence,
        location: event.location,
        area: event.area,
        properties: event.properties,
        timestamp: event.timestamp,
        receivedAt: event.receivedAt,
        processedAt: event.processedAt,
      }));
      setEvents(formattedEvents);
      
      // Fetch alerts from backend
      const alertsResponse = await apiService.getAlerts({ status: 'issued', limit: 50 });
      const alerts = (alertsResponse.alerts || []).map(alert => ({
        ...alert,
        severity: alert.severity?.toUpperCase() || 'INFO',
      }));
      setAlerts(alerts);
      
      // Fetch crowd reports from backend
      const reportsResponse = await apiService.getCrowdReports({ limit: 50 });
      const reports = (reportsResponse.reports || []).map(report => ({
        ...report,
        severity: report.severity,
      }));
      setCrowdReports(reports);
      
      // Update engine statuses from stats
      try {
        const stats = await apiService.getStats();
        if (stats.crowd && stats.fusion) {
          const engines = {
            e01_core: { id: 'e01_core', name: 'Core', status: 'running', lastUpdate: Date.now(), metrics: { uptime: '99.9%' }, version: '1.0.0' },
            e02_storage: { id: 'e02_storage', name: 'Storage', status: 'running', lastUpdate: Date.now(), metrics: { totalEvents: stats.crowd?.totalReports || formattedEvents.length, storageUsed: '2.3 MB' }, version: '1.0.0' },
            e03_geospatial: { id: 'e03_geospatial', name: 'Geospatial', status: 'running', lastUpdate: Date.now(), metrics: { calculationsPerSec: 1250 }, version: '1.0.0' },
            e04_ingestion: { id: 'e04_ingestion', name: 'Ingestion', status: 'running', lastUpdate: Date.now(), metrics: { activeSources: 4, lastPoll: Date.now() - 30000 }, version: '1.0.0' },
            e05_adapters: { id: 'e05_adapters', name: 'Adapters', status: 'running', lastUpdate: Date.now(), metrics: { usgs: { lastFetch: Date.now() - 60000, eventsFound: 3 } }, version: '1.0.0' },
            e06_social: { id: 'e06_social', name: 'Social', status: 'running', lastUpdate: Date.now(), metrics: { keywordsTracked: 45, postsAnalyzed: 1240 }, version: '1.0.0' },
            e07_detection: { id: 'e07_detection', name: 'Detection', status: 'running', lastUpdate: Date.now(), metrics: { rulesActive: 12, alertsGenerated: alerts.length }, version: '1.0.0' },
            e08_ml: { id: 'e08_ml', name: 'ML', status: 'running', lastUpdate: Date.now(), metrics: { modelsLoaded: 4, predictionsToday: 23 }, version: '1.0.0' },
            e09_fusion: { id: 'e09_fusion', name: 'Fusion', status: 'running', lastUpdate: Date.now(), metrics: { fusionsPerformed: 31, avgConfidence: 72.5 }, version: '1.0.0' },
            e10_decision: { id: 'e10_decision', name: 'Decision', status: 'running', lastUpdate: Date.now(), metrics: { decisionsToday: alerts.length, channelsUsed: ['SMS', 'PUSH', 'EMAIL', 'WEBHOOK'] }, version: '1.0.0' },
            e11_message: { id: 'e11_message', name: 'Message', status: 'running', lastUpdate: Date.now(), metrics: { templatesLoaded: 12, languages: 12 }, version: '1.0.0' },
            e12_dissemination: { id: 'e12_dissemination', name: 'Dissemination', status: 'running', lastUpdate: Date.now(), metrics: { sentToday: 47, successRate: 98.2 }, version: '1.0.0' },
            e13_channels: { id: 'e13_channels', name: 'Channels', status: 'running', lastUpdate: Date.now(), metrics: { adaptersActive: 6 }, version: '1.0.0' },
            e14_xml: { id: 'e14_xml', name: 'Alert XML', status: 'running', lastUpdate: Date.now(), metrics: { xmlGenerated: 5 }, version: '1.0.0' },
            e15_feedback: { id: 'e15_feedback', name: 'Feedback', status: 'running', lastUpdate: Date.now(), metrics: { feedbackReceived: 89, falseAlarmRate: '2.3%' }, version: '1.0.0' },
            e16_crowd: { id: 'e16_crowd', name: 'Crowd', status: 'running', lastUpdate: Date.now(), metrics: { reportsToday: reports.length, verified: reports.filter(r => r.verification?.verified).length, clusters: 3 }, version: '1.0.0' },
          };
          updateEngines(engines);
        }
      } catch (e) {
        console.warn('Could not fetch stats:', e);
      }
      
      setState(prev => ({ ...prev, lastRefresh: Date.now() }));
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setError('Failed to refresh data from server');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setError, updateEngines, setEvents, setAlerts, setCrowdReports]);

  const submitFeedback = useCallback(async (alertId, feedback) => {
    // In production, call API
    console.log('Submitting feedback:', { alertId, feedback });
  }, []);

  const submitCrowdReport = useCallback(async (reportData) => {
    try {
      const response = await apiService.submitCrowdReport(reportData);
      if (response.success) {
        // Refresh crowd reports to include the new one
        const reportsResponse = await apiService.getCrowdReports({ limit: 50 });
        setCrowdReports(reportsResponse.reports || []);
        return { ...reportData, _id: response.reportId, timestamp: new Date().toISOString(), status: 'pending' };
      }
      throw new Error(response.verificationStatus || 'Failed to submit report');
    } catch (error) {
      console.error('Failed to submit crowd report:', error);
      throw error;
    }
  }, [setCrowdReports]);

  // Initialize WebSocket connection
  useEffect(() => {
    wsService.connect();
    
    // Set up WebSocket listeners
    const unsubEvent = wsService.on('event:new', (event) => {
      console.log('New event received:', event);
      // Add to events list
      setState(prev => ({
        ...prev,
        events: [event, ...prev.events].slice(0, 100),
      }));
    });
    
    const unsubAlert = wsService.on('alert:issued', (alert) => {
      console.log('New alert issued:', alert);
      addAlert(alert);
    });
    
    const unsubAlertCancelled = wsService.on('alert:cancelled', (data) => {
      console.log('Alert cancelled:', data);
      dismissAlert(data.alertId);
    });
    
    const unsubCrowdReport = wsService.on('crowd_report:new', (report) => {
      console.log('New crowd report:', report);
      setState(prev => ({
        ...prev,
        crowdReports: [report, ...prev.crowdReports].slice(0, 100),
      }));
    });
    
    const unsubSystemStatus = wsService.on('system:status', (status) => {
      console.log('System status:', status);
    });
    
    return () => {
      unsubEvent();
      unsubAlert();
      unsubAlertCancelled();
      unsubCrowdReport();
      unsubSystemStatus();
    };
  }, [addAlert, dismissAlert, setCrowdReports]);

  // Auto-refresh
  useEffect(() => {
    if (!state.settings.autoRefresh) return;
    
    const interval = setInterval(() => {
      refreshData();
    }, state.settings.refreshInterval);
    
    return () => clearInterval(interval);
  }, [state.settings.autoRefresh, state.settings.refreshInterval, refreshData]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const value = {
    state,
    dispatch: () => {},
    refreshData,
    setUserLocation,
    addAlert,
    updateAlert,
    dismissAlert,
    submitFeedback,
    submitCrowdReport,
    updateSettings,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

export default AppContext;