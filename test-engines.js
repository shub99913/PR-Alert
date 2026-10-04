// Test script for Universal Multi-Disaster Pre-Alert System engines
// Run with: node test-engines.js

global.__DEV__ = true;
global.require = require;

console.log("=== Universal Multi-Disaster Pre-Alert System Engine Tests (STANDALONE) ===\n");

const R = 6371000;
const toRad = deg => deg * Math.PI / 180;

function haversine(lat1, lon1, lat2, lon2) {
  const phi1 = toRad(lat1), phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1), deltaLambda = toRad(lon2 - lon1);
  const a = Math.sin(deltaPhi/2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

const delhi = { lat: 28.6139, lon: 77.2090 };
const mumbai = { lat: 19.0760, lon: 72.8777 };
const distance = haversine(delhi.lat, delhi.lon, mumbai.lat, mumbai.lon);
console.log("Testing E03: Geospatial Utility Engine...");
console.log("  Delhi to Mumbai: " + (distance/1000).toFixed(1) + " km (expected ~1150 km)");
console.log("  Mumbai within 500km of Delhi: " + (distance <= 500000) + " (expected: false)");

console.log("\nTesting E05: USGS Adapter (magnitude to severity)...");
function magnitudeToSeverity(mag) {
  if (mag >= 8.0) return "EMERGENCY";
  if (mag >= 7.0) return "ALERT";
  if (mag >= 6.0) return "ALERT";
  if (mag >= 5.0) return "WARNING";
  if (mag >= 4.0) return "WARNING";
  return "INFO";
}
console.log("  M4.2: " + magnitudeToSeverity(4.2) + " (expected: WARNING)");
console.log("  M6.5: " + magnitudeToSeverity(6.5) + " (expected: ALERT)");
console.log("  M8.1: " + magnitudeToSeverity(8.1) + " (expected: EMERGENCY)");

console.log("\nTesting E07: Rule-Based Detection Engine...");
const rules = [
  { id: "eq_significant", condition: (props) => props.magnitude >= 5.0, severity: (props) => magnitudeToSeverity(props.magnitude), confidenceBoost: 25 },
  { id: "eq_shallow", condition: (props) => props.magnitude >= 4.5 && props.depth < 70, severity: "WARNING", confidenceBoost: 15 },
  { id: "eq_felt", condition: (props) => props.cdi >= 3 && props.magnitude >= 3.0, severity: "WARNING", confidenceBoost: 20 },
];

function evaluateRules(props) {
  let matchedRules = [];
  let maxSeverity = "INFO";
  let totalBoost = 0;
  const severityLevel = { INFO: 0, WARNING: 1, ALERT: 2, EMERGENCY: 3 };
  
  for (const rule of rules) {
    if (rule.condition(props)) {
      matchedRules.push(rule.id);
      const sev = typeof rule.severity === "function" ? rule.severity(props) : rule.severity;
      if (severityLevel[sev] > severityLevel[maxSeverity]) maxSeverity = sev;
      totalBoost += rule.confidenceBoost;
    }
  }
  return { matchedRules, severity: maxSeverity, confidenceBoost: Math.min(totalBoost, 50) };
}

const testEvent = { magnitude: 5.2, depth: 15, cdi: 4 };
const result = evaluateRules(testEvent);
console.log("  M5.2, depth 15km, CDI 4: matched " + result.matchedRules.join(", "));
console.log("  Severity: " + result.severity + ", Confidence Boost: " + result.confidenceBoost + "%");

console.log("\nTesting E09: Fusion Engine...");
function fuseSignals(signals, weights) {
  weights = weights || { ruleBased: 0.2, mlPrediction: 0.4, socialMedia: 0.25, crowdReport: 0.15 };
  let totalWeight = 0, weightedSum = 0;
  const severityVotes = { INFO: 0, WARNING: 0, ALERT: 0, EMERGENCY: 0 };
  const contributingSources = [];
  
  if (signals.ruleBased && signals.ruleBased.confidence !== undefined) {
    totalWeight += weights.ruleBased;
    weightedSum += signals.ruleBased.confidence * weights.ruleBased;
    if (signals.ruleBased.severity) severityVotes[signals.ruleBased.severity]++;
    contributingSources.push("ruleBased");
  }
  if (signals.mlPrediction && signals.mlPrediction.confidence !== undefined) {
    totalWeight += weights.mlPrediction;
    weightedSum += signals.mlPrediction.confidence * weights.mlPrediction;
    if (signals.mlPrediction.severity) severityVotes[signals.mlPrediction.severity]++;
    contributingSources.push("mlPrediction");
  }
  if (signals.socialMedia && signals.socialMedia.confidence !== undefined) {
    totalWeight += weights.socialMedia;
    weightedSum += signals.socialMedia.confidence * weights.socialMedia;
    if (signals.socialMedia.severity) severityVotes[signals.socialMedia.severity]++;
    contributingSources.push("socialMedia");
  }
  if (signals.crowdReport && signals.crowdReport.confidence !== undefined) {
    totalWeight += weights.crowdReport;
    weightedSum += signals.crowdReport.confidence * weights.crowdReport;
    if (signals.crowdReport.severity) severityVotes[signals.crowdReport.severity]++;
    contributingSources.push("crowdReport");
  }
  
  if (totalWeight === 0) return { confidence: 0, severity: "INFO" };
  
  const confidence = weightedSum / totalWeight;
  const severityOrder = ["EMERGENCY", "ALERT", "WARNING", "INFO"];
  let finalSeverity = "INFO";
  for (const sev of severityOrder) {
    if (severityVotes[sev] > 0) { finalSeverity = sev; break; }
  }
  
  return { confidence: parseFloat(confidence.toFixed(1)), severity: finalSeverity, contributingSources };
}

const fusionTest = fuseSignals({
  ruleBased: { confidence: 80, severity: "WARNING" },
  mlPrediction: { confidence: 75, severity: "ALERT" },
  socialMedia: { confidence: 60, severity: "WARNING" },
  crowdReport: { confidence: 70, severity: "ALERT" }
});
console.log("  Fusion result: " + fusionTest.confidence + "% confidence, " + fusionTest.severity + " severity");
console.log("  Sources: " + fusionTest.contributingSources.join(", "));

console.log("\nTesting E10: Alert Decision Engine (STANDALONE - No SACHET)...");
function makeDecision(confidence, severity, location) {
  location = location || { latitude: 28.6139, longitude: 77.2090 };
  const thresholds = { INFO: 0, WARNING: 40, ALERT: 60, EMERGENCY: 80 };
  const minConf = thresholds[severity] || 0;
  
  if (confidence < minConf) return { action: "NONE", reason: "Confidence " + confidence + "% < " + minConf + "% for " + severity };
  
  // STANDALONE channel rules - NO SACHET
  const channelRules = {
    EMERGENCY: ["SMS", "PUSH", "EMAIL", "SIREN", "RADIO", "WEBHOOK"],
    ALERT: ["SMS", "PUSH", "EMAIL", "WEBHOOK"],
    WARNING: ["SMS", "PUSH", "WEBHOOK"],
    INFO: ["DASHBOARD"]
  };
  
  const languages = { IN: ["hi", "en"], default: ["en"] };
  const jurisdiction = location.latitude >= 6 && location.latitude <= 38 && location.longitude >= 68 && location.longitude <= 98 ? "IN" : "default";
  const langs = languages[jurisdiction] || languages.default;
  
  return {
    action: severity === "EMERGENCY" ? "EMERGENCY_ALERT" : "ALERT",
    severity,
    confidence,
    channels: channelRules[severity],
    languages: langs,
    jurisdiction
  };
}

const decision = makeDecision(fusionTest.confidence, fusionTest.severity);
console.log("  Decision: " + decision.action + " (" + decision.severity + ", " + decision.confidence + "%)");
console.log("  Channels: " + decision.channels.join(", "));
console.log("  Languages: " + decision.languages.join(", ") + " (" + decision.jurisdiction + ")");
console.log("  NO SACHET dependency - fully standalone");

console.log("\nTesting E11: Message Generation...");
function generateSMS(alertProps, lang) {
  lang = lang || "en";
  const templates = {
    en: {
      earthquake: "EARTHQUAKE ALERT: {magnitude} quake near {location}. {depth}km deep. {time}. Drop, Cover, Hold On.",
      flood: "FLOOD ALERT: {severity} flood risk in {location}. Expected depth: {depth}m. {time}. Avoid flooded areas.",
      cyclone: "CYCLONE ALERT: {windSpeed} km/h winds expected in {location}. {time}. Seek shelter immediately.",
      default: "DISASTER ALERT: {type} alert for {location}. {time}. Follow official instructions."
    },
    hi: {
      earthquake: "भूकंप चेतावनी: {magnitude} भूकंप {location} के पास। गहराई: {depth} किमी। समय: {time}。",
      flood: "बाढ़ चेतावनी: {severity} बाढ़ का जोखिम {location} में। अपेक्षित गहराई: {depth} मी। समय: {time}。",
      cyclone: "चक्रवात चेतावनी: {windSpeed} किमी/घंटा की हवाएं {location} में अपेक्षित। समय: {time}。",
      default: "आपदा चेतावनी: {type} चेतावनी {location} के लिए। 时间: {time}。"
    }
  };
  
  const template = templates[lang][alertProps.type] || templates[lang].default;
  let msg = template
    .replace(/\{location\}/g, alertProps.location ? alertProps.location.latitude.toFixed(4) + ", " + alertProps.location.longitude.toFixed(4) : "Unknown")
    .replace(/\{time\}/g, new Date().toLocaleString())
    .replace(/\{type\}/g, alertProps.type || "Disaster")
    .replace(/\{severity\}/g, alertProps.severity || "UNKNOWN")
    .replace(/\{magnitude\}/g, alertProps.properties?.magnitude || "")
    .replace(/\{depth\}/g, alertProps.properties?.depth || "")
    .replace(/\{windSpeed\}/g, alertProps.properties?.windSpeed || "");
  
  if (msg.length > 160) msg = msg.substring(0, 157) + "...";
  return msg;
}

const alert = {
  type: "earthquake",
  severity: "WARNING",
  location: { latitude: 28.6139, longitude: 77.2090 },
  properties: { magnitude: 5.2, depth: 15 },
  timestamp: Date.now()
};

console.log("  SMS (EN): " + generateSMS(alert, "en"));
console.log("  SMS (HI): " + generateSMS(alert, "hi"));

console.log("\nTesting E14: Alert XML Generator (Standalone - No CAP dependency)...");
function generateAlertXML(alertProps, options = {}) {
  const { senderId = 'alert@pr-alert.org', senderName = 'PR-Alert System', language = 'en' } = options;
  
  const severityMap = { info: 'Minor', warning: 'Moderate', alert: 'Severe', emergency: 'Extreme' };
  const urgencyMap = { info: 'Future', warning: 'Expected', alert: 'Immediate', emergency: 'Immediate' };
  const certaintyMap = { info: 'Possible', warning: 'Likely', alert: 'Likely', emergency: 'Observed' };
  
  const severity = alertProps.severity?.toLowerCase() || 'warning';
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:pr-alert:names:tc:alert:1.0">
  <identifier>${alertProps.id || 'pr-alert-' + Date.now()}</identifier>
  <sender>${senderId}</sender>
  <sent>${new Date().toISOString()}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <info>
    <language>${language}</language>
    <category>Geo</category>
    <event>${alertProps.type || 'Disaster'}</event>
    <urgency>${urgencyMap[severity] || 'Expected'}</urgency>
    <severity>${severityMap[severity] || 'Moderate'}</severity>
    <certainty>${certaintyMap[severity] || 'Likely'}</certainty>
    <effective>${new Date().toISOString()}</effective>
    <expires>${alertProps.expiresAt || new Date(Date.now() + 3600000).toISOString()}</expires>
    <senderName>${senderName}</senderName>
    <headline>${alertProps.title || alertProps.type + ' Alert'}</headline>
    <description>${alertProps.message || 'Disaster alert issued'}</description>
    <instruction>${alertProps.actionGuidance || 'Follow official instructions'}</instruction>
    <contact>support@pr-alert.org</contact>
    <web>https://pr-alert.org/alert/${alertProps.id}</web>
    <parameter>
      <valueName>eventId</valueName>
      <value>${alertProps.id}</value>