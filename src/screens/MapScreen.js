import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  View, Text, StyleSheet, SafeAreaView, StatusBar, 
  TouchableOpacity, Modal, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Callout, Polyline, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import { SEVERITY_COLORS, SEVERITY_LABELS, DISASTER_TYPE_LABELS, DISASTER_TYPE_ICONS, DISASTER_TYPE_COLORS } from '../types';
import { Animated } from 'react-native';

const COLORS = {
  bgPrimary: '#0A0F1A',
  bgSecondary: '#111827',
  bgCard: 'rgba(26, 34, 52, 0.9)',
  border: 'rgba(100, 116, 139, 0.3)',
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#00D4AA',
  accentGlow: 'rgba(0, 212, 170, 0.3)',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  map: { flex: 1 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 50 : 30, paddingHorizontal: 16, paddingBottom: 16,
    backgroundColor: COLORS.bgSecondary,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
  },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  layerToggle: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  layerLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  layerIcon: { width: 12, height: 12, borderRadius: 3 },
  layerText: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  toggleTrack: { width: 52, height: 28, borderRadius: 14, backgroundColor: COLORS.border },
  toggleTrackActive: { backgroundColor: COLORS.accent },
  toggleThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.white },
  legendContainer: { marginTop: 16, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 13, color: COLORS.textPrimary },
  detailCard: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 16, marginTop: 16,
  },
  detailTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  detailDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 12 },
  detailMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailMetaText: { fontSize: 12, color: COLORS.textMuted },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionBtnPrimary: { backgroundColor: COLORS.accent },
  actionBtnSecondary: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  actionBtnText: { fontSize: 14, fontWeight: '700' },
  actionBtnTextPrimary: { color: COLORS.bgPrimary },
  actionBtnTextSecondary: { color: COLORS.textPrimary },
  fab: {
    position: 'absolute', bottom: 120, right: 20, zIndex: 5,
    width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  clusterContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  clusterText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: COLORS.bgSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '80%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  modalClose: { padding: 8 },
  modalBody: { maxHeight: 300 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalLabel: { fontSize: 14, color: COLORS.textSecondary },
  modalValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  modalDescription: { fontSize: 14, color: COLORS.textPrimary, lineHeight: 22, marginTop: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
});

const SeverityDot = ({ severity, size = 12 }) => (
  <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: SEVERITY_COLORS[severity] || SEVERITY_COLORS.INFO }} />
);

const LayerToggle = ({ label, icon, color, enabled, onToggle }) => {
  const translateX = new Animated.Value(enabled ? 24 : 0);
  
  useEffect(() => {
    Animated.timing(translateX, {
      toValue: enabled ? 24 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [enabled, translateX]);

  return (
    <TouchableOpacity style={styles.layerToggle} onPress={onToggle} activeOpacity={0.7}>
      <View style={styles.layerLabel}>
        <View style={[styles.layerIcon, { backgroundColor: color }]} />
        <Text style={styles.layerText}>{label}</Text>
      </View>
      <View style={[styles.toggleTrack, enabled && styles.toggleTrackActive]}>
        <Animated.View
          style={[
            styles.toggleThumb,
            { transform: [{ translateX }] }
          ]}
        />
      </View>
    </TouchableOpacity>
  );
};

const MapScreen = ({ navigation }) => {
  const { state, refreshData } = useApp();
  const [region, setRegion] = useState({
    latitude: 22.5937, longitude: 78.9629, latitudeDelta: 28, longitudeDelta: 28,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [showAlerts, setShowAlerts] = useState(true);
  const [showCrowdReports, setShowCrowdReports] = useState(true);
  const [showUserLocation, setShowUserLocation] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [sheetHeight, setSheetHeight] = useState(0);
  const mapRef = useRef(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalItem, setModalItem] = useState(null);

  // Request location permission on mount
  useEffect(() => {
    const requestLocation = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setUserLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        setRegion(prev => ({ ...prev, latitude: loc.coords.latitude, longitude: loc.coords.longitude, latitudeDelta: 5, longitudeDelta: 5 }));
      }
    };
    requestLocation();
  }, []);

  // Convert context alerts to map markers
  const alertMarkers = state.alerts
    .filter(a => a.status === 'issued' || a.status === 'active')
    .map(alert => ({
      id: alert._id,
      type: DISASTER_TYPE_LABELS[alert.disasterType] || alert.disasterType,
      disasterType: alert.disasterType,
      severity: alert.severity,
      lat: alert.location.coordinates[1],
      lon: alert.location.coordinates[0],
      location: formatLocation(alert.location),
      description: getAlertDescription(alert),
      confidence: Math.round(alert.confidence * 100),
      radius: getAlertRadius(alert),
      timestamp: new Date(alert.issuedAt || alert.createdAt).getTime(),
    }));

  // Convert context crowd reports to map markers
  const crowdReportMarkers = state.crowdReports.map(report => ({
    id: report._id,
    type: report.disasterType,
    severity: report.severity,
    lat: report.location.coordinates[1],
    lon: report.location.coordinates[0],
    description: report.description,
    verified: report.verification.verified,
    votes: report.verification.voteCount,
    timestamp: new Date(report.timestamp).getTime(),
  }));

  const handleMarkerPress = useCallback((item, isReport = false) => {
    setSelectedItem({ ...item, isReport });
    setSheetHeight(isReport ? 320 : 280);
  }, []);

  const handleMapPress = useCallback(() => {
    setSelectedItem(null);
    setSheetHeight(0);
  }, []);

  const handleFabPress = () => {
    navigation.navigate('CrowdReport');
  };

  const getSeverityColor = (severity) => SEVERITY_COLORS[severity] || SEVERITY_COLORS.INFO;

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgSecondary} translucent />
      
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        showsUserLocation={showUserLocation}
        showsMyLocationButton={true}
        customMapStyle={[
          { elementType: 'geometry', stylers: [{ color: '#0A0F1A' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0F1A' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#94A3B8' }] },
          { featureType: 'water', stylers: [{ color: '#0D1B2A' }] },
          { featureType: 'road', stylers: [{ color: '#1A2234' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
        ]}
      >
        {/* User Location Circle */}
        {showUserLocation && userLocation && (
          <Circle
            center={userLocation}
            radius={1000}
            strokeWidth={0}
            fillColor={COLORS.accent + '20'}
          />
        )}

        {/* Alert Markers */}
        {showAlerts && alertMarkers.map(alert => (
          <Marker
            key={alert.id}
            coordinate={{ latitude: alert.lat, longitude: alert.lon }}
            onPress={() => handleMarkerPress(alert)}
          >
            <View style={{ 
              width: 36, height: 36, borderRadius: 18, 
              backgroundColor: getSeverityColor(alert.severity),
              borderWidth: 3, borderColor: COLORS.white,
              justifyContent: 'center', alignItems: 'center',
              shadowColor: getSeverityColor(alert.severity), shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
            }}>
              <Ionicons name="alert-circle-outline" size={18} color={COLORS.white} />
            </View>
          </Marker>
        ))}

        {/* Alert Radius Circles */}
        {showAlerts && alertMarkers.map(alert => (
          <Circle
            key={`circle-${alert.id}`}
            center={{ latitude: alert.lat, longitude: alert.lon }}
            radius={alert.radius}
            strokeWidth={1.5}
            strokeColor={getSeverityColor(alert.severity) + '80'}
            fillColor={getSeverityColor(alert.severity) + '10'}
          />
        ))}

        {/* Crowd Report Markers */}
        {showCrowdReports && crowdReportMarkers.map(report => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.lat, longitude: report.lon }}
            onPress={() => handleMarkerPress(report, true)}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: getSeverityColor(report.severity),
              borderWidth: 2, borderColor: COLORS.white,
              justifyContent: 'center', alignItems: 'center',
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
            }}>
              <Ionicons name={DISASTER_TYPE_ICONS[report.type] || 'document-outline'} size={16} color={COLORS.white} />
            </View>
          </Marker>
        ))}

        {/* Cluster for nearby markers - simplified */}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Disaster Map</Text>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('CrowdReport')}>
            <Ionicons name="add-circle-outline" size={24} color={COLORS.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleFabPress}>
        <Ionicons name="add" size={28} color={COLORS.bgPrimary} style={styles.fabIcon} />
      </TouchableOpacity>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          { transform: [{ translateY: sheetHeight }] }
        ]}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Map Layers</Text>
        
        <LayerToggle
          label="Official Alerts"
          icon="alert-circle-outline"
          color={COLORS.severityAlert}
          enabled={showAlerts}
          onToggle={() => setShowAlerts(!showAlerts)}
        />
        <LayerToggle
          label="Crowd Reports"
          icon="people-outline"
          color={COLORS.accent}
          enabled={showCrowdReports}
          onToggle={() => setShowCrowdReports(!showCrowdReports)}
        />
        <LayerToggle
          label="My Location"
          icon="location-outline"
          color={COLORS.info}
          enabled={showUserLocation}
          onToggle={() => setShowUserLocation(!showUserLocation)}
        />

        <View style={styles.legendContainer}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Severity Legend</Text>
          {Object.entries(SEVERITY_COLORS).filter(([k]) => !['info','minor','moderate','severe','critical'].includes(k)).map(([severity, color]) => (
            <View key={severity} style={styles.legendItem}>
              <SeverityDot severity={severity} size={12} />
              <Text style={styles.legendText}>{severity}</Text>
            </View>
          ))}
        </View>

        {selectedItem && (
          <View style={styles.detailCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.detailTitle}>{selectedItem.type}</Text>
              <SeverityDot severity={selectedItem.severity} size={16} />
            </View>
            <Text style={styles.detailDesc}>{selectedItem.description}</Text>
            <View style={styles.detailMeta}>
              <View style={styles.detailMetaItem}>
                <Ionicons name="location-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.detailMetaText}>{selectedItem.location}</Text>
              </View>
              <View style={styles.detailMetaItem}>
                <Ionicons name="speedometer-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.detailMetaText}>{selectedItem.confidence}% confidence</Text>
              </View>
              {selectedItem.votes && (
                <View style={styles.detailMetaItem}>
                  <Ionicons name="thumbs-up-outline" size={14} color={COLORS.accent} />
                  <Text style={styles.detailMetaText}>{selectedItem.votes} votes</Text>
                </View>
              )}
              {selectedItem.verified !== undefined && (
                <View style={styles.detailMetaItem}>
                  <Ionicons name={selectedItem.verified ? 'shield-checkmark-outline' : 'shield-outline'} size={14} color={selectedItem.verified ? COLORS.accent : COLORS.warning} />
                  <Text style={styles.detailMetaText}>{selectedItem.verified ? 'Verified' : 'Pending'}</Text>
                </View>
              )}
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => setSelectedItem(null)}>
                <Text style={[styles.actionBtnText, styles.actionBtnTextSecondary]}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => { setModalItem(selectedItem); setModalVisible(true); setSelectedItem(null); }}>
                <Text style={[styles.actionBtnText, styles.actionBtnTextPrimary]}>Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Detail Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{modalItem?.type || 'Details'}</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
                <Ionicons name="close-outline" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Location</Text>
                <Text style={styles.modalValue}>{modalItem?.location}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Time</Text>
                <Text style={styles.modalValue}>{modalItem?.timestamp ? new Date(modalItem.timestamp).toLocaleString() : 'N/A'}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Confidence</Text>
                <Text style={[styles.modalValue, { color: getSeverityColor(modalItem?.severity) }]}>{modalItem?.confidence}%</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Severity</Text>
                <Text style={[styles.modalValue, { color: getSeverityColor(modalItem?.severity) }]}>{modalItem?.severity}</Text>
              </View>
              {modalItem?.votes && (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Votes</Text>
                  <Text style={styles.modalValue}>{modalItem.votes}</Text>
                </View>
              )}
              {modalItem?.verified !== undefined && (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <Text style={[styles.modalValue, { color: modalItem.verified ? COLORS.accent : COLORS.warning }]}>{modalItem.verified ? 'Verified' : 'Pending'}</Text>
                </View>
              )}
              <Text style={styles.modalDescription}>{modalItem?.description}</Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]} onPress={() => setModalVisible(false)}>
                <Text style={styles.actionBtnTextSecondary}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} onPress={() => Alert.alert('Share', 'Sharing...')}>
                <Text style={styles.actionBtnTextPrimary}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

function getAlertRadius(alert) {
  const props = alert.properties || {};
  if (alert.disasterType === 'earthquake' && props.magnitude) {
    // Radius in meters based on magnitude
    return Math.pow(10, 0.5 * props.magnitude - 1.5) * 1000;
  }
  if (alert.disasterType === 'cyclone' && props.windSpeed) {
    // Approximate radius based on wind speed
    return (props.windSpeed / 10) * 1000;
  }
  if (alert.disasterType === 'flood' && props.affectedArea) {
    // Convert area to radius
    return Math.sqrt(props.affectedArea / Math.PI) * 1000;
  }
  return 50000; // Default 50km
}

export default MapScreen;