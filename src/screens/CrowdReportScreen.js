import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar,
  TouchableOpacity, Alert, Modal, TextInput, Platform,
  KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

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
  success: '#22C55E',
  glassBg: 'rgba(26, 34, 52, 0.6)',
  glassBorder: 'rgba(148, 163, 184, 0.1)',
};

const SEVERITY_CONFIG = {
  info: { color: COLORS.info, label: 'Info', desc: 'Informational only' },
  minor: { color: COLORS.success, label: 'Minor', desc: 'Minor issue, no immediate danger' },
  moderate: { color: COLORS.warning, label: 'Moderate', desc: 'Some concern, monitor situation' },
  severe: { color: COLORS.danger, label: 'Severe', desc: 'Serious situation, take precautions' },
  critical: { color: '#991B1B', label: 'Critical', desc: 'Life-threatening, immediate action needed' },
};

const REPORT_TYPES = [
  { id: 'earthquake_feeling', label: 'Earthquake Feeling', icon: 'pulse-outline', desc: 'Did you feel shaking?' },
  { id: 'flood_observation', label: 'Flood Observation', icon: 'water-outline', desc: 'Water levels, flooding' },
  { id: 'landslide_sighting', label: 'Landslide Sighting', icon: 'triangle-outline', desc: 'Landslide or rockfall observed' },
  { id: 'fire_outbreak', label: 'Fire Outbreak', icon: 'flame-outline', desc: 'Fire, smoke, or burning smell' },
  { id: 'cyclone_damage', label: 'Cyclone Damage', icon: 'tornado-outline', desc: 'Wind damage, storm surge' },
  { id: 'infrastructure_damage', label: 'Infrastructure Damage', icon: 'construct-outline', desc: 'Building, road, bridge damage' },
  { id: 'utility_outage', label: 'Utility Outage', icon: 'flash-off-outline', desc: 'Power, water, comms outage' },
  { id: 'evacuation_need', label: 'Evacuation Need', icon: 'people-outline', desc: 'People need evacuation help' },
  { id: 'medical_emergency', label: 'Medical Emergency', icon: 'medkit-outline', desc: 'Medical help needed' },
  { id: 'supply_shortage', label: 'Supply Shortage', icon: 'cube-outline', desc: 'Food, water, medicine shortage' },
  { id: 'hazard_spotting', label: 'Hazard Spotting', icon: 'warning-outline', desc: 'Crack, gas leak, chemical smell' },
  { id: 'traffic_disruption', label: 'Traffic Disruption', icon: 'car-outline', desc: 'Road blocked, accident' },
];

const SEVERITY_LEVELS = [
  { id: 'info', label: 'Info', color: COLORS.info },
  { id: 'minor', label: 'Minor', color: COLORS.success },
  { id: 'moderate', label: 'Moderate', color: COLORS.warning },
  { id: 'severe', label: 'Severe', color: COLORS.danger },
  { id: 'critical', label: 'Critical', color: '#991B1B' },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  safeArea: { flex: 1, backgroundColor: COLORS.bgPrimary },
  keyboardView: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  card: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 8 },
  labelRequired: { color: COLORS.danger },
  // Type selection
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeBtn: {
    flex: 1, minWidth: '30%', aspectRatio: 1,
    backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  typeBtnActive: { backgroundColor: COLORS.accentGlow, borderColor: COLORS.accent, borderWidth: 2 },
  typeBtnIcon: { fontSize: 24 },
  typeBtnText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, textAlign: 'center' },
  typeBtnTextActive: { color: COLORS.accent },
  // Severity
  severityRow: { flexDirection: 'row', gap: 8 },
  severityBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  severityBtnActive: { borderWidth: 2 },
  severityLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  // Location
  locationCard: { gap: 12 },
  locationRow: { flexDirection: 'row', gap: 12 },
  locationBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  locationBtnActive: { backgroundColor: COLORS.accentGlow, borderColor: COLORS.accent },
  locationBtnText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  locationBtnTextActive: { color: COLORS.accent },
  locationDisplay: { 
    backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, padding: 12,
  },
  locationText: { fontSize: 13, color: COLORS.textPrimary, fontFamily: 'monospace' },
  // Media
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  mediaItem: { width: 80, height: 80, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  mediaImage: { width: '100%', height: '100%' },
  mediaRemove: {
    position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.danger, justifyContent: 'center', alignItems: 'center',
  },
  addMediaBtn: {
    width: 80, height: 80, borderRadius: 10,
    backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border,
    borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center',
  },
  // Input
  input: {
    backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.textPrimary, minHeight: 100, textAlignVertical: 'top',
  },
  inputPlaceholder: { color: COLORS.textMuted },
  charCount: { textAlign: 'right', fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  // Anonymous toggle
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  toggleDesc: { fontSize: 12, color: COLORS.textMuted },
  // Submit
  submitBtn: {
    paddingVertical: 16, borderRadius: 14, backgroundColor: COLORS.accent,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  submitBtnDisabled: { backgroundColor: COLORS.textMuted, shadowOpacity: 0 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.bgPrimary },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', backgroundColor: COLORS.bgSecondary, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  modalOption: {
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  modalOptionText: { fontSize: 16, color: COLORS.textPrimary },
  modalCancel: { paddingVertical: 16, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
  // Success modal
  successModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  successContent: { backgroundColor: COLORS.bgSecondary, borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: COLORS.accent },
  successIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.accentGlow, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 8 },
  successDesc: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 },
  // Loading
  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  loadingText: { marginTop: 16, fontSize: 14, color: COLORS.textSecondary },
});

const SeverityButton = ({ severity, selected, onPress }) => {
  const config = SEVERITY_CONFIG[severity];
  return (
    <TouchableOpacity
      style={[styles.severityBtn, selected && styles.severityBtnActive, { borderColor: config.color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: config.color, marginBottom: 4 }} />
      <Text style={[styles.severityLabel, { color: config.color }]}>{config.label}</Text>
    </TouchableOpacity>
  );
};

const TypeButton = ({ type, selected, onPress }) => (
  <TouchableOpacity
    style={[styles.typeBtn, selected && styles.typeBtnActive]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <Ionicons name={type.icon} size={24} color={selected ? COLORS.accent : COLORS.textMuted} style={styles.typeBtnIcon} />
    <Text style={[styles.typeBtnText, selected && styles.typeBtnTextActive]}>{type.label}</Text>
  </TouchableOpacity>
);

const MediaItem = ({ uri, index, onRemove, isVideo }) => (
  <View style={styles.mediaItem}>
    {isVideo ? (
      <View style={styles.mediaImage}><Ionicons name="videocam-outline" size={32} color={COLORS.textSecondary} /></View>
    ) : (
      <Image source={{ uri }} style={styles.mediaImage} resizeMode="cover" />
    )}
    <TouchableOpacity style={styles.mediaRemove} onPress={() => onRemove(index)}>
      <Ionicons name="close" size={14} color={COLORS.white} />
    </TouchableOpacity>
    {isVideo && <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
      <Ionicons name="videocam-outline" size={12} color={COLORS.white} />
    </View>}
  </View>
);

const AddMediaButton = ({ onPress }) => (
  <TouchableOpacity style={styles.addMediaBtn} onPress={onPress} activeOpacity={0.8}>
    <Ionicons name="add-outline" size={28} color={COLORS.textMuted} />
  </TouchableOpacity>
);

export default function CrowdReportScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: type, 2: severity, 3: location, 4: details, 5: media, 6: review
  const [reportType, setReportType] = useState(null);
  const [severity, setSeverity] = useState('moderate');
  const [location, setLocation] = useState({ lat: null, lon: null, accuracy: null, address: '' });
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState([]);
  const [anonymous, setAnonymous] = useState(false);
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mediaModalVisible, setMediaModalVisible] = useState(false);
  const [mediaModalType, setMediaModalType] = useState('');

  const maxMedia = 5;

  const validateStep = useCallback(() => {
    switch (step) {
      case 1: return !!reportType;
      case 2: return !!severity;
      case 3: return location.lat !== null && location.lon !== null;
      case 4: return description.trim().length >= 10;
      default: return true;
    }
  }, [step, reportType, severity, location, description]);

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, 6));
    } else {
      Alert.alert('Incomplete', 'Please fill in all required fields before continuing.');
    }
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is required to auto-detect your location.');
        setLocationLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const address = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      const addrStr = address[0] ? `${address[0].name || ''}, ${address[0].city || ''}, ${address[0].region || ''}`.trim() : '';
      setLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude, accuracy: loc.coords.accuracy, address: addrStr });
    } catch (error) {
      Alert.alert('Error', 'Failed to get location. Please try again or enter manually.');
    }
    setLocationLoading(false);
  };

  const pickMedia = async (type) => {
    setMediaModalVisible(false);
    try {
      let result;
      if (type === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
        });
      } else if (type === 'video') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['videos'],
          allowsEditing: true,
          videoMaxDuration: 60,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
          selectionLimit: maxMedia - media.length,
        });
      }

      if (!result.canceled) {
        const assets = result.assets || [result];
        for (const asset of assets) {
          if (media.length >= maxMedia) break;
          setMedia(prev => [...prev, {
            uri: asset.uri,
            type: asset.type === 'video' ? 'video' : 'photo',
            width: asset.width,
            height: asset.height,
            duration: asset.duration,
            fileSize: asset.fileSize,
          }]);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add media. Please try again.');
    }
  };

  const removeMedia = (index) => {
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const submitReport = async () => {
    if (!validateStep()) return;
    
    setSubmitting(true);
    
    // Simulate API call
    await new Promise(r => setTimeout(r, 1500));
    
    const reportId = `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // In production, call E16 engine: CrowdReportEngine.submitReport()
    console.log('[CrowdReport] Submitting:', {
      id: reportId,
      type: reportType,
      severity,
      location,
      description,
      mediaCount: media.length,
      anonymous,
      contactInfo,
    });
    
    setSubmitting(false);
    setShowSuccess(true);
    
    // Reset form after delay
    setTimeout(() => {
      setShowSuccess(false);
      setStep(1);
      setReportType(null);
      setSeverity('moderate');
      setLocation({ lat: null, lon: null, accuracy: null, address: '' });
      setDescription('');
      setMedia([]);
      setAnonymous(false);
      setContactInfo('');
    }, 2000);
  };

  const progress = (step - 1) / 5;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgSecondary} />
      
      {/* Progress Bar */}
      <View style={{ height: 4, backgroundColor: COLORS.border }}>
        <Animated.View
          style={[
            { height: 4, backgroundColor: COLORS.accent, borderRadius: 2 },
            { transform: [{ scaleX: progress }] }
          ]}
        />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? prevStep() : navigation.goBack()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Report Hazard</Text>
          <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>
            Step {step} of 6
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 1: Report Type */}
        {step === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What did you observe?</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Select the type of hazard <Text style={styles.labelRequired}>*</Text></Text>
              <View style={styles.typeGrid}>
                {REPORT_TYPES.map(type => (
                  <TypeButton key={type.id} type={type} selected={reportType === type.id} onPress={() => setReportType(type.id)} />
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Step 2: Severity */}
        {step === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How serious is it?</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Select severity level <Text style={styles.labelRequired}>*</Text></Text>
              <View style={styles.severityRow}>
                {SEVERITY_LEVELS.map(s => (
                  <SeverityButton key={s.id} severity={s.id} selected={severity === s.id} onPress={() => setSeverity(s.id)} />
                ))}
              </View>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 12, textAlign: 'center' }}>
                {SEVERITY_CONFIG[severity]?.desc}
              </Text>
            </View>
          </View>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where did this happen?</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Location <Text style={styles.labelRequired}>*</Text></Text>
              <View style={styles.locationCard}>
                <View style={styles.locationRow}>
                  <TouchableOpacity style={[styles.locationBtn, locationLoading && { opacity: 0.7 }]} onPress={getCurrentLocation} disabled={locationLoading} activeOpacity={0.8}>
                    <Ionicons name="location-outline" size={20} color={location.lat ? COLORS.accent : COLORS.textMuted} />
                    <Text style={[styles.locationBtnText, location.lat && styles.locationBtnTextActive]}>{location.lat ? 'Update Location' : 'Use Current Location'}</Text>
                    {locationLoading && <ActivityIndicator size="small" color={COLORS.accent} />}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.locationBtn, styles.locationBtnActive]} onPress={() => Alert.alert('Manual Entry', 'Manual coordinate entry coming soon. Please use GPS for now.')} activeOpacity={0.8}>
                    <Ionicons name="map-outline" size={20} color={COLORS.textMuted} />
                    <Text style={styles.locationBtnText}>Manual Entry</Text>
                  </TouchableOpacity>
                </View>
                {location.lat && (
                  <View style={styles.locationDisplay}>
                    <Text style={styles.locationText}>📍 {location.lat.toFixed(6)}°, {location.lon.toFixed(6)}°</Text>
                    {location.accuracy && <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>Accuracy: ±{Math.round(location.accuracy)}m</Text>}
                    {location.address && <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 4 }}>{location.address}</Text>}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Description */}
        {step === 4 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Describe what you saw</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Details <Text style={styles.labelRequired}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="Describe the situation in detail: what you saw, what you heard, any immediate dangers, number of people affected, etc."
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={styles.charCount}>{description.length}/1000 characters (minimum 10)</Text>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8 }}>
                Tip: Include specific details like water depth, damage extent, number of people, direction of fire spread, etc.
              </Text>
            </View>
          </View>
        )}

        {/* Step 5: Media */}
        {step === 5 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add Photos or Videos (Optional)</Text>
            <View style={styles.card}>
              <Text style={styles.label}>Attach media to help verify your report</Text>
              <View style={styles.mediaGrid}>
                {media.map((m, i) => (
                  <MediaItem key={i} uri={m.uri} index={i} onRemove={removeMedia} isVideo={m.type === 'video'} />
                ))}
                {media.length < maxMedia && <AddMediaButton onPress={() => setMediaModalVisible(true)} />}
              </View>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' }}>
                {media.length}/{maxMedia} items • Max 5 photos/videos • Max 60s video
              </Text>
            </View>
          </View>
        )}

        {/* Step 6: Review & Submit */}
        {step === 6 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Review & Submit</Text>
            <View style={styles.card}>
              <View style={{ gap: 16 }}>
                <View>
                  <Text style={styles.label}>Type</Text>
                  <Text style={{ fontSize: 15, color: COLORS.textPrimary, marginTop: 4 }}>
                    {REPORT_TYPES.find(t => t.id === reportType)?.label || 'Not selected'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.label}>Severity</Text>
                  <SeverityButton severity={severity} selected={true} onPress={() => {}} />
                </View>
                <View>
                  <Text style={styles.label}>Location</Text>
                  <Text style={{ fontSize: 14, color: location.lat ? COLORS.textPrimary : COLORS.danger, marginTop: 4 }}>
                    {location.lat ? `${location.lat.toFixed(6)}°, ${location.lon.toFixed(6)}°` : 'Not set'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.label}>Description</Text>
                  <Text style={{ fontSize: 14, color: COLORS.textPrimary, marginTop: 4 }}>{description || 'Not provided'}</Text>
                </View>
                <View>
                  <Text style={styles.label}>Media</Text>
                  <Text style={{ fontSize: 14, color: COLORS.textPrimary, marginTop: 4 }}>
                    {media.length} item{media.length !== 1 ? 's' : ''} attached
                  </Text>
                </View>
                <View>
                  <View style={styles.toggleRow}>
                    <View>
                      <Text style={styles.toggleLabel}>Anonymous Report</Text>
                      <Text style={styles.toggleDesc}>Hide your identity from public view</Text>
                    </View>
                    <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ false: COLORS.border, true: COLORS.accent }} thumbColor={COLORS.white} />
                  </View>
                </View>
                {!anonymous && (
                  <View>
                    <Text style={styles.label}>Contact Info (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Phone or email for follow-up (only visible to authorities)"
                      value={contactInfo}
                      onChangeText={setContactInfo}
                      keyboardType="email-address"
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, !validateStep() && styles.submitBtnDisabled]}
          onPress={submitReport}
          disabled={!validateStep() || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <ActivityIndicator size="small" color={COLORS.bgPrimary} />
              <Text style={styles.submitBtnText}>Submitting...</Text>
            </View>
          ) : (
            <Text style={styles.submitBtnText}>Submit Report</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Step Indicator */}
      <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
        {[1,2,3,4,5,6].map(s => (
          <View key={s} style={{
            width: 10, height: 10, borderRadius: 5,
            backgroundColor: s <= step ? COLORS.accent : COLORS.border,
            transform: [{ scale: s === step ? 1.2 : 1 }],
          }} />
        ))}
      </View>

      {/* Media Modal */}
      <Modal visible={mediaModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Media</Text>
            <TouchableOpacity style={styles.modalOption} onPress={() => { pickMedia('camera'); }}>
              <Ionicons name="camera-outline" size={24} color={COLORS.accent} />
              <Text style={styles.modalOptionText}>Take Photo/Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { pickMedia('library'); }}>
              <Ionicons name="images-outline" size={24} color={COLORS.info} />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalOption} onPress={() => { pickMedia('video'); }}>
              <Ionicons name="videocam-outline" size={24} color={COLORS.warning} />
              <Text style={styles.modalOptionText}>Record Video (max 60s)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setMediaModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={styles.successModal}>
          <View style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark" size={40} color={COLORS.accent} />
            </View>
            <Text style={styles.successTitle}>Report Submitted!</Text>
            <Text style={styles.successDesc}>
              Thank you for reporting. Your observation helps keep everyone safer.
              Report ID: <Text style={{ fontFamily: 'monospace', color: COLORS.accent }}>rpt_{Date.now()}</Text>
            </Text>
            <TouchableOpacity style={styles.submitBtn} onPress={() => setShowSuccess(false)}>
              <Text style={styles.submitBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {submitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Submitting your report...</Text>
        </View>
      )}
    </SafeAreaView>
  );
}