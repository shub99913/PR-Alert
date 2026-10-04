import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, RefreshControl, 
  TouchableOpacity, Alert, ActivityIndicator, Platform,
  SafeAreaView, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';
import { SEVERITY_COLORS, SEVERITY_LABELS, DISASTER_TYPE_LABELS } from '../types';

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const COLORS = {
  // Dark theme with neumorphism/glassmorphism
  bgPrimary: '#0A0F1A',
  bgSecondary: '#111827',
  bgTertiary: '#1A2234',
  bgCard: 'rgba(26, 34, 52, 0.8)',
  border: 'rgba(100, 116, 139, 0.3)',
  borderLight: 'rgba(148, 163, 184, 0.15)',
  
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  accent: '#00D4AA',
  accentGlow: 'rgba(0, 212, 170, 0.3)',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  
  // Severity colors
  severityInfo: '#3B82F6',
  severityWarning: '#F59E0B',
  severityAlert: '#F97316',
  severityEmergency: '#EF4444',
  
  // Glassmorphism
  glassBg: 'rgba(26, 34, 52, 0.6)',
  glassBorder: 'rgba(148, 163, 184, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
};

const SEVERITY_CONFIG = {
  INFO: { color: COLORS.info, icon: 'information-circle-outline', label: 'Info' },
  WARNING: { color: COLORS.warning, icon: 'alert-circle-outline', label: 'Warning' },
  ALERT: { color: COLORS.severityAlert, icon: 'warning-outline', label: 'Alert' },
  EMERGENCY: { color: COLORS.danger, icon: 'skull-outline', label: 'Emergency' },
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusChipActive: {
    backgroundColor: COLORS.accentGlow,
    borderColor: COLORS.accent,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusChipTextActive: {
    color: COLORS.accent,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  // Cards
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    // Neumorphism shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGlass: {
    backgroundColor: COLORS.glassBg,
    borderColor: COLORS.glassBorder,
  },
  // Alert cards
  alertCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertType: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  alertTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  alertLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 12,
  },
  alertMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  alertMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertMetaText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  // Stat cards
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  statIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    opacity: 0.15,
  },
  // Engine status cards
  engineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  engineInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  engineIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  engineName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  engineDetail: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  engineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Quick actions
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    minWidth: '45%',
    aspectRatio: 1,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: {
    marginBottom: 12,
    opacity: 0.4,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  // Floating action button
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});

const StatusChip = ({ label, active, color, onPress }) => (
  <TouchableOpacity
    style={[
      styles.statusChip,
      active && styles.statusChipActive,
      color && { borderColor: color }
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[
      styles.statusChipText,
      active && styles.statusChipTextActive,
      color && { color }
    ]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const StatCard = ({ label, value, icon, color, trend }) => (
  <View style={styles.statCard}>
    <View style={styles.statIcon}>
      <Ionicons name={icon} size={32} color={color || COLORS.accent} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
    {trend && (
      <Text style={{ fontSize: 11, color: trend > 0 ? COLORS.accent : COLORS.danger, marginTop: 4 }}>
        {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}%
      </Text>
    )}
  </View>
);

const AlertCard = ({ alert, onPress }) => {
  const severityConfig = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
  
  return (
    <TouchableOpacity style={[styles.card, styles.alertCard, { borderLeftColor: severityConfig.color }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.alertHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text style={styles.alertType}>{alert.disasterType || alert.type}</Text>
            <View style={{
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 10,
              backgroundColor: severityConfig.color + '20',
            }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: severityConfig.color, textTransform: 'uppercase' }}>
                {severityConfig.label}
              </Text>
            </View>
          </View>
          <Text style={styles.alertTime}>{new Date(alert.timestamp).toLocaleTimeString()}</Text>
        </View>
        <Text style={styles.alertLocation}>
          <Ionicons name="location-outline" size={14} color={COLORS.textMuted} style={{ marginRight: 4 }} />
          {alert.location}
        </Text>
        <Text style={styles.alertDescription}>{alert.description}</Text>
        <View style={styles.alertMeta}>
          <View style={styles.alertMetaItem}>
            <Ionicons name="radio-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.alertMetaText}>{alert.channels?.join(', ') || 'SACHET, SMS'}</Text>
          </View>
          <View style={styles.alertMetaItem}>
            <Ionicons name="globe-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.alertMetaText}>{alert.languages?.join(', ') || 'EN, HI'}</Text>
          </View>
          <View style={styles.alertMetaItem}>
            <Ionicons name="speedometer-outline" size={14} color={COLORS.textMuted} />
            <Text style={styles.alertMetaText}>{alert.confidence}% confidence</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const EngineStatusCard = ({ engine }) => (
  <View style={styles.engineCard}>
    <View style={styles.engineInfo}>
      <View style={styles.engineIcon}>
        <Ionicons name={engine.icon} size={20} color={engine.color || COLORS.accent} />
      </View>
      <View>
        <Text style={styles.engineName}>{engine.name}</Text>
        <Text style={styles.engineDetail}>{engine.detail}</Text>
      </View>
    </View>
    <View style={styles.engineStatus}>
      <View style={[styles.statusDot, { backgroundColor: engine.running ? COLORS.accent : COLORS.danger }]} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: engine.running ? COLORS.accent : COLORS.danger }}>
        {engine.running ? 'Running' : 'Stopped'}
      </Text>
    </View>
  </View>
);

const ActionButton = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={[styles.actionBtn, { borderColor: color + '40' }]} onPress={onPress} activeOpacity={0.8}>
    <Ionicons name={icon} size={28} color={color || COLORS.accent} />
    <Text style={[styles.actionBtnText, { color: color || COLORS.textPrimary }]}>{label}</Text>
  </TouchableOpacity>
);

const formatTimeAgo = (timestamp) => {
  const now = Date.now();
  const diff = now - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const getEngineIcon = (engineId) => {
  const icons = {
    e01_core: 'cog-outline',
    e02_storage: 'database-outline',
    e03_geospatial: 'map-outline',
    e04_ingestion: 'download-outline',
    e05_adapters: 'link-outline',
    e06_social: 'logo-twitter',
    e07_detection: 'search-outline',
    e08_ml: 'brain-outline',
    e09_fusion: 'git-merge-outline',
    e10_decision: 'alert-circle-outline',
    e11_message: 'chatbubble-outline',
    e12_dissemination: 'send-outline',
    e13_channels: 'radio-outline',
    e14_capsachet: 'shield-outline',
    e15_feedback: 'thumbs-up-outline',
    e16_crowd: 'people-outline',
  };
  return icons[engineId] || 'cog-outline';
};

const getEngineColor = (engineId) => {
  const colors = {
    e01_core: '#8B5CF6',
    e02_storage: '#3B82F6',
    e03_geospatial: '#06B6D4',
    e04_ingestion: '#10B981',
    e05_adapters: '#F59E0B',
    e06_social: '#1DA1F2',
    e07_detection: '#F97316',
    e08_ml: '#EC4899',
    e09_fusion: '#84CC16',
    e10_decision: '#EF4444',
    e11_message: '#00D4AA',
    e12_dissemination: '#F43F5E',
    e13_channels: '#6366F1',
    e14_capsachet: '#14B8A6',
    e15_feedback: '#22C55E',
    e16_crowd: '#F97316',
  };
  return colors[engineId] || COLORS.accent;
};

const getEngineName = (engineId) => {
  const names = {
    e01_core: 'Core Infrastructure',
    e02_storage: 'Event Storage',
    e03_geospatial: 'Geospatial Utils',
    e04_ingestion: 'Ingestion Framework',
    e05_adapters: 'Source Adapters',
    e06_social: 'Social Media Stream',
    e07_detection: 'Rule Detection',
    e08_ml: 'ML Prediction',
    e09_fusion: 'Fusion & Confidence',
    e10_decision: 'Alert Decision',
    e11_message: 'Message Generation',
    e12_dissemination: 'Dissemination',
    e13_channels: 'Channel Adapters',
    e14_capsachet: 'CAP/SACHET',
    e15_feedback: 'Feedback Loop',
    e16_crowd: 'Crowd Reports',
  };
  return names[engineId] || engineId;
};

export default function HomeScreen({ navigation }) {
  const { 
    state, 
    refreshData, 
    dismissAlert 
  } = useApp();
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeAlerts, setActiveAlerts] = useState([]);
  
  // Sync with context state
  useEffect(() => {
    // Filter active alerts from context
    const active = state.alerts.filter(a => a.status === 'issued' || a.status === 'active');
    setActiveAlerts(active.map(alert => ({
      id: alert._id,
      type: DISASTER_TYPE_LABELS[alert.disasterType] || alert.disasterType,
      disasterType: alert.disasterType,
      severity: alert.severity,
      location: formatLocation(alert.location),
      description: getAlertDescription(alert),
      timestamp: new Date(alert.issuedAt || alert.createdAt).getTime(),
      confidence: Math.round(alert.confidence * 100),
      channels: alert.messages.map(m => m.channel),
      languages: [...new Set(alert.messages.map(m => m.lang))],
    })));
  }, [state.alerts]);
  
  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  const handleAlertPress = (alert) => {
    navigation.navigate('AlertDetail', { alert });
  };

  const handleActionPress = (action) => {
    switch (action) {
      case 'report':
        navigation.navigate('CrowdReport');
        break;
      case 'map':
        navigation.navigate('Map');
        break;
      case 'settings':
        navigation.navigate('Settings');
        break;
      case 'history':
        navigation.navigate('AlertHistory');
        break;
    }
  };

  // Handle alert dismissal
  const handleDismissAlert = (alertId) => {
    dismissAlert(alertId);
    setActiveAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgSecondary} />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.appTitle}>Disaster Alert</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Notifications')}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.statusBar}>
          <StatusChip 
            label="All Systems Online" 
            active 
            color={COLORS.accent} 
          />
          <StatusChip 
            label="SACHET Connected" 
            active 
            color={COLORS.info} 
          />
          <StatusChip 
            label="Location Active" 
            active 
            color={COLORS.warning} 
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.accent]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Active Alerts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Alerts</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AlertHistory')}>
              <Text style={styles.sectionAction}>View All</Text>
            </TouchableOpacity>
          </View>
          {activeAlerts.length > 0 ? (
            activeAlerts.map(alert => (
              <AlertCard 
                key={alert.id} 
                alert={alert} 
                onPress={() => handleAlertPress(alert)} 
              />
            ))
          ) : (
            <View style={[styles.card, styles.emptyState]}>
              <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.accent} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No Active Alerts</Text>
              <Text style={styles.emptySubtext}>You're safe for now. We'll notify you if anything changes.</Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Overview</Text>
          <View style={styles.statGrid}>
            <StatCard label="Events Tracked" value={state.engines.e02_storage?.metrics?.totalEvents || 127} icon="pulse-outline" color={COLORS.info} trend={12} />
            <StatCard label="Alerts Sent" value={state.engines.e12_dissemination?.metrics?.sentToday || 47} icon="send-outline" color={COLORS.warning} trend={8} />
            <StatCard label="Crowd Reports" value={state.engines.e16_crowd?.metrics?.reportsToday || 12} icon="people-outline" color={COLORS.accent} trend={5} />
            <StatCard label="False Alarm Rate" value={state.engines.e15_feedback?.metrics?.falseAlarmRate || '2.3%'} icon="shield-checkmark-outline" color={COLORS.accent} trend={-15} />
          </View>
        </View>

        {/* Engine Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Engine Status</Text>
          <View style={styles.card}>
            {Object.entries(state.engines).map(([engineId, engine]) => (
              <EngineStatusCard 
                key={engineId} 
                engine={{
                  id: engineId,
                  name: getEngineName(engineId),
                  running: engine.status === 'running',
                  icon: getEngineIcon(engineId),
                  color: getEngineColor(engineId),
                  detail: formatEngineDetail(engineId, engine.metrics),
                }} 
              />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <ActionButton icon="add-circle-outline" label="Report Hazard" color={COLORS.accent} onPress={() => handleActionPress('report')} />
            <ActionButton icon="map-outline" label="View Map" color={COLORS.info} onPress={() => handleActionPress('map')} />
            <ActionButton icon="time-outline" label="Alert History" color={COLORS.warning} onPress={() => handleActionPress('history')} />
            <ActionButton icon="settings-outline" label="Settings" color={COLORS.textMuted} onPress={() => handleActionPress('settings')} />
          </View>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => handleActionPress('report')}>
        <Ionicons name="add" size={28} color={COLORS.bgPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function formatLocation(location) {
  if (!location?.coordinates) return 'Unknown location';
  const [lon, lat] = location.coordinates;
  return `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`;
}

function getAlertDescription(alert) {
  const props = alert.properties || {};
  if (alert.disasterType === 'earthquake') {
    return `M${props.magnitude} earthquake detected at ${props.depth}km depth. Expected shaking intensity: ${props.mmi ? `MMI ${props.mmi}` : 'Moderate'}. Drop, Cover, Hold On.`;
  }
  if (alert.disasterType === 'flood') {
    return `Rising water levels detected. Flood risk elevated. ${props.waterLevel ? `Water level: ${props.waterLevel}m` : ''} Avoid low-lying areas.`;
  }
  if (alert.disasterType === 'cyclone') {
    return `Cyclone ${props.category || 'forming'}. Winds ${props.windSpeed}km/h. ${props.landfallTime ? `Landfall: ${props.landfallTime}` : 'Monitoring trajectory.'}`;
  }
  return alert.messages?.[0]?.content || 'Disaster alert issued. Check details for more information.';
}

function formatEngineDetail(engineId, metrics) {
  if (!metrics) return 'No metrics';
  return Object.entries(metrics).map(([k, v]) => `${k}: ${v}`).join(', ');
}