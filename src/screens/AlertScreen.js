import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  SafeAreaView, StatusBar, RefreshControl, Alert,
  Modal, ScrollView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useApp } from '../context/AppContext';
import { SEVERITY_COLORS, SEVERITY_LABELS, DISASTER_TYPE_LABELS } from '../types';

const COLORS = {
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
  severityInfo: '#3B82F6',
  severityWarning: '#F59E0B',
  severityAlert: '#F97316',
  severityEmergency: '#EF4444',
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
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  safeArea: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'center', alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: COLORS.bgSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.accentGlow, borderColor: COLORS.accent },
  filterChipText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, textTransform: 'uppercase' },
  filterChipTextActive: { color: COLORS.accent },
  listContent: { padding: 16, paddingBottom: 100 },
  alertCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  alertTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  alertType: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  severityBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  severityLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  alertTime: { fontSize: 12, color: COLORS.textMuted },
  alertLocation: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  alertDescription: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 20, marginBottom: 12 },
  alertMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  alertMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertMetaText: { fontSize: 11, color: COLORS.textMuted },
  detailModal: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)' },
  detailContent: {
    width: '90%', maxHeight: '85%', backgroundColor: COLORS.bgSecondary,
    borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border,
  },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  detailTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  detailClose: { padding: 8 },
  detailSection: { marginBottom: 20 },
  detailSectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  detailLabel: { fontSize: 14, color: COLORS.textSecondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' },
  detailDescription: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 22 },
  detailActions: { flexDirection: 'row', gap: 12, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border },
  detailActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailActionPrimary: { backgroundColor: COLORS.accent },
  detailActionSecondary: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  detailActionText: { fontSize: 14, fontWeight: '700' },
  detailActionTextPrimary: { color: COLORS.bgPrimary },
  detailActionTextSecondary: { color: COLORS.textPrimary },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { marginBottom: 16, opacity: 0.4 },
  emptyText: { fontSize: 18, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', paddingHorizontal: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

const SeverityBadge = ({ severity }) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.INFO;
  return (
    <View style={[styles.severityBadge, { backgroundColor: config.color + '20' }]}>
      <Text style={[styles.severityLabel, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const AlertCard = ({ alert, onPress }) => {
  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
  return (
    <TouchableOpacity style={[styles.alertCard, { borderLeftColor: severity.color }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.alertHeader}>
        <View style={styles.alertTypeRow}>
          <Text style={styles.alertType}>{alert.disasterType || alert.type}</Text>
          <SeverityBadge severity={alert.severity} />
        </View>
        <Text style={styles.alertTime}>{new Date(alert.timestamp).toLocaleString()}</Text>
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
          <Ionicons name="speedometer-outline" size={14} color={COLORS.textMuted} />
          <Text style={styles.alertMetaText}>{alert.confidence}% confidence</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const FilterChip = ({ label, active, onPress, color }) => (
  <TouchableOpacity
    style={[styles.filterChip, active && styles.filterChipActive, color && { borderColor: color }]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Text style={[styles.filterChipText, active && styles.filterChipTextActive, color && { color }]}>{label}</Text>
  </TouchableOpacity>
);

const AlertDetailModal = ({ alert, visible, onClose }) => {
  if (!visible || !alert) return null;
  const severity = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.INFO;
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.detailModal}>
        <View style={styles.detailContent}>
          <View style={styles.detailHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={styles.detailTitle}>{alert.disasterType || alert.type}</Text>
              <SeverityBadge severity={alert.severity} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.detailClose}>
              <Ionicons name="close-outline" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Details</Text>
              <Text style={styles.detailDescription}>{alert.description}</Text>
            </View>
            
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Information</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{alert.location}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>{new Date(alert.timestamp).toLocaleString()}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Confidence</Text>
                <Text style={[styles.detailValue, { color: severity.color }]}>{alert.confidence}%</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Severity</Text>
                <Text style={[styles.detailValue, { color: severity.color }]}>{severity.label}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Channels</Text>
                <Text style={styles.detailValue}>{alert.channels?.join(', ') || 'SACHET, SMS'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Languages</Text>
                <Text style={styles.detailValue}>{alert.languages?.join(', ') || 'EN, HI'}</Text>
              </View>
              {alert.capXml && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>CAP XML</Text>
                  <Text style={{ ...styles.detailValue, fontSize: 10, fontFamily: 'monospace', textAlign: 'left' }}>
                    {alert.capXml.length > 200 ? alert.capXml.substring(0, 200) + '...' : alert.capXml}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
          
          <View style={styles.detailActions}>
            <TouchableOpacity style={[styles.detailActionBtn, styles.detailActionSecondary]} onPress={onClose}>
              <Text style={styles.detailActionTextSecondary}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.detailActionBtn, styles.detailActionPrimary]} onPress={() => Alert.alert('Share', 'Sharing alert...')}>
              <Text style={styles.detailActionTextPrimary}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function AlertScreen({ navigation, route }) {
  const { state, refreshData } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, emergency, alert, warning, info
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Also check for alert passed via navigation
  const navigationAlert = route?.params?.alert;
  
  // Convert context alerts to display format
  const contextAlerts = state.alerts.map(alert => ({
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
    capXml: alert.capXml,
  }));
  
  const filteredAlerts = filter === 'all' 
    ? contextAlerts 
    : contextAlerts.filter(a => a.severity.toLowerCase() === filter.toLowerCase());
  
  // If alert passed via navigation, show it immediately
  useEffect(() => {
    if (navigationAlert) {
      setSelectedAlert(navigationAlert);
      setModalVisible(true);
    }
  }, [navigationAlert]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  }, [refreshData]);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgSecondary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Alert History</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => Alert.alert('Export', 'Export functionality coming soon')}>
            <Ionicons name="download-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterBar}>
        <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <FilterChip label="Emergency" active={filter === 'emergency'} onPress={() => setFilter('emergency')} color={COLORS.danger} />
        <FilterChip label="Alert" active={filter === 'alert'} onPress={() => setFilter('alert')} color={COLORS.severityAlert} />
        <FilterChip label="Warning" active={filter === 'warning'} onPress={() => setFilter('warning')} color={COLORS.warning} />
        <FilterChip label="Info" active={filter === 'info'} onPress={() => setFilter('info')} color={COLORS.info} />
      </View>

      <FlatList
        data={filteredAlerts}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <AlertCard alert={item} onPress={() => { setSelectedAlert(item); setModalVisible(true); }} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.accent]} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="funnel-outline" size={56} color={COLORS.textMuted} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No Alerts Found</Text>
            <Text style={styles.emptySubtext}>No alerts match the selected filter.</Text>
          </View>
        }
      />

      <AlertDetailModal alert={selectedAlert} visible={modalVisible} onClose={() => { setModalVisible(false); setSelectedAlert(null); }} />
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