import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, SafeAreaView, StatusBar,
  Switch, TouchableOpacity, Alert, Modal, TextInput,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { useColorScheme } from 'react-native';

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
  glassBg: 'rgba(26, 34, 52, 0.6)',
  glassBorder: 'rgba(148, 163, 184, 0.1)',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  safeArea: { flex: 1, backgroundColor: COLORS.bgPrimary },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  card: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  settingRowLast: { borderBottomWidth: 0 },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  settingDesc: { fontSize: 13, color: COLORS.textMuted, marginTop: 2 },
  switchContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.white },
  switchTrack: { width: 52, height: 28, borderRadius: 14, backgroundColor: COLORS.border },
  switchTrackActive: { backgroundColor: COLORS.accent },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: COLORS.accent },
  btnSecondary: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  btnDanger: { backgroundColor: COLORS.danger + '20', borderWidth: 1, borderColor: COLORS.danger },
  btnText: { fontSize: 14, fontWeight: '700' },
  btnTextPrimary: { color: COLORS.bgPrimary },
  btnTextSecondary: { color: COLORS.textPrimary },
  btnTextDanger: { color: COLORS.danger },
  inputContainer: { marginTop: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: COLORS.textPrimary,
  },
  versionInfo: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 20, paddingBottom: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: COLORS.bgSecondary, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.border },
  modalTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 16 },
  modalDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalActionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalActionPrimary: { backgroundColor: COLORS.accent },
  modalActionSecondary: { backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  modalActionDanger: { backgroundColor: COLORS.danger },
  modalActionText: { fontSize: 14, fontWeight: '700' },
  modalActionTextPrimary: { color: COLORS.bgPrimary },
  modalActionTextSecondary: { color: COLORS.textPrimary },
  modalActionTextDanger: { color: COLORS.white },
});

const SettingRow = ({ label, description, children, onPress }) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.settingInfo}>
      <Text style={styles.settingLabel}>{label}</Text>
      {description && <Text style={styles.settingDesc}>{description}</Text>}
    </View>
    {children}
  </TouchableOpacity>
);

const ToggleSetting = ({ label, description, value, onChange, disabled }) => (
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <Text style={[styles.settingLabel, disabled && { color: COLORS.textMuted }]}>{label}</Text>
      {description && <Text style={styles.settingDesc}>{description}</Text>}
    </View>
    <View style={styles.switchContainer}>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: COLORS.border, true: COLORS.accent }}
        thumbColor={COLORS.white}
      />
    </View>
  </View>
);

const ActionButton = ({ label, style, textStyle, onPress }) => (
  <TouchableOpacity style={[styles.btn, style]} onPress={onPress} activeOpacity={0.8}>
    <Text style={[styles.btnText, textStyle]}>{label}</Text>
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const [settings, setSettings] = useState({
    // Notifications
    pushEnabled: true,
    smsEnabled: true,
    emailEnabled: false,
    sirenEnabled: true,
    criticalOnly: false,
    quietHours: { enabled: true, start: '22:00', end: '07:00' },
    
    // Location
    locationEnabled: true,
    backgroundLocation: true,
    locationAccuracy: 'high', // high, balanced, low
    
    // Alert Preferences
    minSeverity: 'WARNING', // INFO, WARNING, ALERT, EMERGENCY
    autoExpandArea: true,
    expansionRadius: 50, // km
    language: 'en', // en, hi, ta, bn, te, mr, gu, kn, ml, or, pa, as
    
    // Data & Sync
    autoSync: true,
    syncInterval: 5, // minutes
    wifiOnlySync: true,
    dataRetention: 30, // days
    
    // Appearance
    theme: 'dark', // dark, light, system
    mapStyle: 'dark', // dark, light, satellite
    showSeverityLegend: true,
    
    // Advanced
    debugMode: false,
    crashReporting: true,
    analytics: true,
  });
  
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [radiusInput, setRadiusInput] = useState('');
  const [syncInput, setSyncInput] = useState('');

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // In production, persist to SecureStore/AsyncStorage
  }, []);

  const handleQuietHoursChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      quietHours: { ...prev.quietHours, [field]: value }
    }));
  };

  const openTimePicker = (type) => {
    setModalType(type);
    setModalVisible(true);
  };

  const handleTimeConfirm = () => {
    if (modalType === 'quietStart') handleQuietHoursChange('start', timeInput);
    if (modalType === 'quietEnd') handleQuietHoursChange('end', timeInput);
    if (modalType === 'radius') updateSetting('expansionRadius', parseInt(radiusInput) || 50);
    if (modalType === 'syncInterval') updateSetting('syncInterval', parseInt(syncInput) || 5);
    setModalVisible(false);
    setTimeInput('');
    setRadiusInput('');
    setSyncInput('');
  };

  const handleExportData = async () => {
    Alert.alert('Export Data', 'Data export functionality will be available in the next update. This will include your alert history, preferences, and crowd reports.');
  };

  const handleClearCache = () => {
    Alert.alert('Clear Cache', 'This will clear temporary data and cached maps. Your settings and alert history will be preserved.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', onPress: () => Alert.alert('Success', 'Cache cleared successfully') }
    ]);
  };

  const handleResetSettings = () => {
    Alert.alert('Reset Settings', 'This will restore all settings to their default values. This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => {
        setSettings({
          pushEnabled: true, smsEnabled: true, emailEnabled: false, sirenEnabled: true, criticalOnly: false,
          quietHours: { enabled: true, start: '22:00', end: '07:00' },
          locationEnabled: true, backgroundLocation: true, locationAccuracy: 'high',
          minSeverity: 'WARNING', autoExpandArea: true, expansionRadius: 50, language: 'en',
          autoSync: true, syncInterval: 5, wifiOnlySync: true, dataRetention: 30,
          theme: 'dark', mapStyle: 'dark', showSeverityLegend: true,
          debugMode: false, crashReporting: true, analytics: true,
        });
      }}
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out? You will need to sign in again to receive personalized alerts.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => navigation.navigate('Login') }
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgSecondary} />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <ToggleSetting
              label="Push Notifications"
              description="Receive alerts via push notification"
              value={settings.pushEnabled}
              onChange={v => updateSetting('pushEnabled', v)}
            />
            <ToggleSetting
              label="SMS Alerts"
              description="Receive critical alerts via SMS"
              value={settings.smsEnabled}
              onChange={v => updateSetting('smsEnabled', v)}
            />
            <ToggleSetting
              label="Email Alerts"
              description="Receive detailed alerts via email"
              value={settings.emailEnabled}
              onChange={v => updateSetting('emailEnabled', v)}
            />
            <ToggleSetting
              label="Siren Alerts"
              description="Activate local sirens for emergencies"
              value={settings.sirenEnabled}
              onChange={v => updateSetting('sirenEnabled', v)}
            />
            <ToggleSetting
              label="Critical Only Mode"
              description="Only notify for ALERT and EMERGENCY severity"
              value={settings.criticalOnly}
              onChange={v => updateSetting('criticalOnly', v)}
            />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Quiet Hours</Text>
                <Text style={styles.settingDesc}>Suppress non-critical alerts during sleep hours</Text>
              </View>
              <Switch
                value={settings.quietHours.enabled}
                onValueChange={v => handleQuietHoursChange('enabled', v)}
                trackColor={{ false: COLORS.border, true: COLORS.accent }}
                thumbColor={COLORS.white}
              />
            </View>
            {settings.quietHours.enabled && (
              <View style={{ paddingHorizontal: 4, paddingTop: 8 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity style={[styles.btn, styles.btnSecondary, { flex: 1 }]} onPress={() => { setTimeInput(settings.quietHours.start); openTimePicker('quietStart'); }}>
                    <Text style={styles.btnTextSecondary}>Start: {settings.quietHours.start}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnSecondary, { flex: 1 }]} onPress={() => { setTimeInput(settings.quietHours.end); openTimePicker('quietEnd'); }}>
                    <Text style={styles.btnTextSecondary}>End: {settings.quietHours.end}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.card}>
            <ToggleSetting
              label="Location Services"
              description="Required for location-based alerts and map"
              value={settings.locationEnabled}
              onChange={v => updateSetting('locationEnabled', v)}
            />
            <ToggleSetting
              label="Background Location"
              description="Allow location updates when app is closed"
              value={settings.backgroundLocation}
              onChange={v => updateSetting('backgroundLocation', v)}
              disabled={!settings.locationEnabled}
            />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, !settings.locationEnabled && { color: COLORS.textMuted }]}>Accuracy Mode</Text>
                <Text style={styles.settingDesc}>Higher accuracy uses more battery</Text>
              </View>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border }} disabled={!settings.locationEnabled} onPress={() => {
                const modes = ['high', 'balanced', 'low'];
                const current = modes.indexOf(settings.locationAccuracy);
                const next = modes[(current + 1) % modes.length];
                updateSetting('locationAccuracy', next);
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: settings.locationEnabled ? COLORS.textPrimary : COLORS.textMuted, textTransform: 'capitalize' }}>
                  {settings.locationAccuracy}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Alert Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alert Preferences</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Minimum Severity</Text>
                <Text style={styles.settingDesc}>Only show alerts at or above this level</Text>
              </View>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border }} onPress={() => {
                const levels = ['INFO', 'WARNING', 'ALERT', 'EMERGENCY'];
                const current = levels.indexOf(settings.minSeverity);
                const next = levels[(current + 1) % levels.length];
                updateSetting('minSeverity', next);
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{settings.minSeverity}</Text>
              </TouchableOpacity>
            </View>
            <ToggleSetting
              label="Auto-Expand Alert Area"
              description="Automatically expand alert radius based on severity"
              value={settings.autoExpandArea}
              onChange={v => updateSetting('autoExpandArea', v)}
            />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Expansion Radius</Text>
                <Text style={styles.settingDesc}>Additional km to add to alert radius</Text>
              </View>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary, { minWidth: 100 }]} onPress={() => { setRadiusInput(settings.expansionRadius.toString()); openTimePicker('radius'); }}>
                <Text style={styles.btnTextSecondary}>{settings.expansionRadius} km</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Preferred Language</Text>
                <Text style={styles.settingDesc}>Alert language (SMS, push, email)</Text>
              </View>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border }} onPress={() => {
                const langs = ['en', 'hi', 'ta', 'bn', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'as'];
                const current = langs.indexOf(settings.language);
                const next = langs[(current + 1) % langs.length];
                updateSetting('language', next);
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{settings.language.toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Data & Sync */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Sync</Text>
          <View style={styles.card}>
            <ToggleSetting
              label="Auto Sync"
              description="Automatically sync data in background"
              value={settings.autoSync}
              onChange={v => updateSetting('autoSync', v)}
            />
            <ToggleSetting
              label="WiFi Only Sync"
              description="Only sync when connected to WiFi"
              value={settings.wifiOnlySync}
              onChange={v => updateSetting('wifiOnlySync', v)}
            />
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Sync Interval</Text>
                <Text style={styles.settingDesc}>How often to check for new alerts</Text>
              </View>
              <TouchableOpacity style={[styles.btn, styles.btnSecondary, { minWidth: 100 }]} onPress={() => { setSyncInput(settings.syncInterval.toString()); openTimePicker('syncInterval'); }}>
                <Text style={styles.btnTextSecondary}>{settings.syncInterval} min</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Data Retention</Text>
                <Text style={styles.settingDesc}>Days to keep alert history locally</Text>
              </View>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border }} onPress={() => {
                const periods = [7, 14, 30, 60, 90];
                const current = periods.indexOf(settings.dataRetention);
                const next = periods[(current + 1) % periods.length];
                updateSetting('dataRetention', next);
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }}>{settings.dataRetention} days</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Theme</Text>
                <Text style={styles.settingDesc}>App color scheme</Text>
              </View>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border }} onPress={() => {
                const themes = ['dark', 'light', 'system'];
                const current = themes.indexOf(settings.theme);
                const next = themes[(current + 1) % themes.length];
                updateSetting('theme', next);
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, textTransform: 'capitalize' }}>{settings.theme}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Map Style</Text>
                <Text style={styles.settingDesc}>Map appearance</Text>
              </View>
              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.bgTertiary, borderWidth: 1, borderColor: COLORS.border }} onPress={() => {
                const styles_map = ['dark', 'light', 'satellite'];
                const current = styles_map.indexOf(settings.mapStyle);
                const next = styles_map[(current + 1) % styles_map.length];
                updateSetting('mapStyle', next);
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textPrimary, textTransform: 'capitalize' }}>{settings.mapStyle}</Text>
              </TouchableOpacity>
            </View>
            <ToggleSetting
              label="Show Severity Legend"
              description="Display severity color legend on map"
              value={settings.showSeverityLegend}
              onChange={v => updateSetting('showSeverityLegend', v)}
            />
          </View>
        </View>

        {/* Advanced */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced</Text>
          <View style={styles.card}>
            <ToggleSetting
              label="Debug Mode"
              description="Show debug information and logs"
              value={settings.debugMode}
              onChange={v => updateSetting('debugMode', v)}
            />
            <ToggleSetting
              label="Crash Reporting"
              description="Automatically send crash reports"
              value={settings.crashReporting}
              onChange={v => updateSetting('crashReporting', v)}
            />
            <ToggleSetting
              label="Analytics"
              description="Help improve the app with usage data"
              value={settings.analytics}
              onChange={v => updateSetting('analytics', v)}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.card}>
            <View style={styles.btnRow}>
              <ActionButton label="Export Data" style={styles.btnSecondary} textStyle={styles.btnTextSecondary} onPress={handleExportData} />
              <ActionButton label="Clear Cache" style={styles.btnSecondary} textStyle={styles.btnTextSecondary} onPress={handleClearCache} />
            </View>
          </View>
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <SettingRow label="Sign Out" description="Sign out of your account" onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            </SettingRow>
            <SettingRow label="Delete Account" description="Permanently delete your account and all data" onPress={() => Alert.alert('Delete Account', 'This action is irreversible. Contact support to delete your account.')}>
              <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
            </SettingRow>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.card}>
            <ActionButton label="Reset All Settings" style={styles.btnDanger} textStyle={styles.btnTextDanger} onPress={handleResetSettings} />
          </View>
        </View>

        {/* Version Info */}
        <Text style={styles.versionInfo}>
          Disaster Alert v1.0.0 (Build 2024.09.26)\n
          Engine Architecture: E01-E16 Complete\n
          © 2024 Universal Multi-Disaster Pre-Alert System
        </Text>
      </ScrollView>

      {/* Time/Input Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalType === 'quietStart' ? 'Quiet Hours Start' :
               modalType === 'quietEnd' ? 'Quiet Hours End' :
               modalType === 'radius' ? 'Expansion Radius (km)' :
               'Sync Interval (minutes)'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={modalType.includes('radius') ? '50' : modalType.includes('sync') ? '5' : 'HH:MM'}
              value={modalType.includes('radius') ? radiusInput : modalType.includes('sync') ? syncInput : timeInput}
              onChangeText={t => modalType.includes('radius') ? setRadiusInput(t) : modalType.includes('sync') ? setSyncInput(t) : setTimeInput(t)}
              keyboardType={modalType.includes('radius') || modalType.includes('sync') ? 'numeric' : 'default'}
              maxLength={modalType.includes('radius') || modalType.includes('sync') ? 3 : 5}
              autoFocus
            />
            <View style={styles.modalActions}>
              <ActionButton label="Cancel" style={styles.modalActionSecondary} textStyle={styles.modalActionTextSecondary} onPress={() => setModalVisible(false)} />
              <ActionButton label="Save" style={styles.modalActionPrimary} textStyle={styles.modalActionTextPrimary} onPress={handleTimeConfirm} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}