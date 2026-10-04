// E14 CAP/SACHET Engine
// Government integration engine for CAP v1.2 and India's SACHET system
// The "Golden Engine" for official alert dissemination

/**
 * E14 CAP/SACHET Engine
 * Implements CAP v1.2 (Common Alerting Protocol) standard
 * Integrates with India's SACHET (Satellite-based Alert System for Hazard 
 * Event Tracking) for government-level alert dissemination
 * 
 * CAP v1.2 Spec: https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html
 * SACHET: NDMA (National Disaster Management Authority) India
 */

// CAP v1.2 Namespace
const CAP_NS = "urn:oasis:names:tc:emergency:cap:1.2";

// SACHET-specific configurations
const SACHET_CONFIG = {
  endpoints: {
    alert: "[REDACTED_SACHET_ALERT_ENDPOINT]",
    status: "[REDACTED_SACHET_STATUS_ENDPOINT]",
    register: "[REDACTED_SACHET_REGISTER_ENDPOINT]"
  },
  credentials: {
    apiKey: "[REDACTED_SACHET_API_KEY]",
    clientId: "[REDACTED_SACHET_CLIENT_ID]",
    organizationId: "[REDACTED_SACHET_ORG_ID]"
  },
  eventCodes: {
    earthquake: "EQ",
    flood: "FL",
    cyclone: "CY",
    landslide: "LS",
    heatwave: "HW",
    coldwave: "CW",
    thunderstorm: "TS",
    drought: "DR",
    tsunami: "TU",
    forest_fire: "FF",
    industrial_accident: "IA",
    chemical_spill: "CS",
    radiological: "RN",
    biological: "BN",
    other: "OT"
  },
  severityMap: {
    INFO: "Minor",
    WARNING: "Moderate",
    ALERT: "Severe",
    EMERGENCY: "Extreme"
  },
  urgencyMap: {
    INFO: "Future",
    WARNING: "Expected",
    ALERT: "Immediate",
    EMERGENCY: "Immediate"
  },
  certaintyMap: {
    INFO: "Possible",
    WARNING: "Likely",
    ALERT: "Likely",
    EMERGENCY: "Observed"
  }
};

class CAPSachetEngine {
  constructor(config = {}) {
    this.config = {
      sender: config.sender || "disaster-alert-system@ndma.gov.in",
      senderName: config.senderName || "National Disaster Alert System",
      identifierPrefix: config.identifierPrefix || "CAP.NDMA.IN",
      sachet: {
        enabled: config.sachet?.enabled !== false,
        ...SACHET_CONFIG,
        ...config.sachet
      },
      defaults: {
        scope: "Public",
        status: "Actual",
        msgType: "Alert",
        expiresInHours: config.defaults?.expiresInHours || 6,
        language: config.defaults?.language || "en",
        supportedLanguages: config.defaults?.supportedLanguages || [
          "en", "hi", "ta", "bn", "te", "mr", "gu", "kn", "ml", "or", "pa", "as"
        ]
      },
      geocoding: {
        enabled: config.geocoding?.enabled !== false,
        service: config.geocoding?.service || "nominatim",
        apiKey: config.geocoding?.apiKey || "[REDACTED_GEOCODING_KEY]"
      },
      validation: {
        strict: config.validation?.strict !== false,
        requirePolygon: config.validation?.requirePolygon || false,
        minConfidence: config.validation?.minConfidence || 50
      }
    };

    this.alertHistory = new Map();
    this.sentAlerts = [];
    
    console.log("[E14] CAP/SACHET Engine initialized");
    console.log("  CAP v1.2: " + this.config.sender);
    console.log("  SACHET: " + (this.config.sachet.enabled ? "ENABLED" : "DISABLED"));
    console.log("  Languages: " + this.config.defaults.supportedLanguages.join(", "));
  }

  _generateIdentifier(alertType, sequence = null) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
    const seq = sequence || Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return this.config.identifierPrefix + "." + alertType + "." + timestamp + "." + seq;
  }

  _escapeXML(str) {
    return String(str)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, '"')
      .replace(/'/g, "&apos;");
  }

  _getEventName(eventType, lang) {
    const names = {
      en: {
        earthquake: "Earthquake",
        flood: "Flood",
        cyclone: "Cyclone",
        landslide: "Landslide",
        heatwave: "Heat Wave",
        coldwave: "Cold Wave",
        thunderstorm: "Thunderstorm",
        drought: "Drought",
        tsunami: "Tsunami",
        forest_fire: "Forest Fire",
        industrial_accident: "Industrial Accident",
        chemical_spill: "Chemical Spill",
        radiological: "Radiological Emergency",
        biological: "Biological Hazard",
        other: "Other Hazard"
      },
      hi: {
        earthquake: "भूकंप",
        flood: "बाढ़",
        cyclone: "चक्रवात",
        landslide: "भूस्खलन",
        heatwave: "लू",
        coldwave: "शीत लहर",
        thunderstorm: "आंधी-तूफान",
        drought: "सूखा",
        tsunami: "सुनामी",
        forest_fire: "जंगल की आग",
        industrial_accident: "औद्योगिक दुर्घटना",
        chemical_spill: "रासायनिक रिसाव",
        radiological: "विकिरण आपातकाल",
        biological: "जैविक खतरा",
        other: "अन्य खतरा"
      }
    };
    return names[lang]?.[eventType] || names.en[eventType] || eventType;
  }

  _reverseGeocode(location) {
    if (!location || !location.lat || !location.lon) return "Unknown Location";
    
    const lat = location.lat;
    const lon = location.lon;
    
    if (lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98) {
      return "India (" + lat.toFixed(4) + "°N, " + lon.toFixed(4) + "°E)";
    }
    return lat.toFixed(4) + "°N, " + lon.toFixed(4) + "°E";
  }

  _generateGeocode(location) {
    if (!location || !location.lat || !location.lon) return [];
    
    const lat = location.lat;
    const lon = location.lon;
    const geocodes = [];
    
    geocodes.push({ valueName: "LATITUDE", value: lat.toFixed(6) });
    geocodes.push({ valueName: "LONGITUDE", value: lon.toFixed(6) });
    
    if (lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98) {
      geocodes.push({ valueName: "COUNTRY", value: "IND" });
      geocodes.push({ valueName: "STATE", value: "IN" });
    }
    
    return geocodes;
  }

  _severityToRadius(severity) {
    const radii = { INFO: 10, WARNING: 25, ALERT: 50, EMERGENCY: 100 };
    return radii[severity] || 25;
  }

  generateCAPAlert(alertData, options = {}) {
    const {
      eventType, severity, headline, description, instruction, location,
      urgency = this.config.sachet.urgencyMap[severity] || "Expected",
      certainty = this.config.sachet.certaintyMap[severity] || "Likely",
      eventCode = this.config.sachet.eventCodes[eventType] || "OT",
      category = "Geo",
      language = options.language || this.config.defaults.language,
      areaDesc = options.areaDesc || this._reverseGeocode(location),
      geocode = options.geocode || this._generateGeocode(location),
      polygon = options.polygon,
      circle = options.circle,
      expiresInHours = options.expiresInHours || this.config.defaults.expiresInHours,
      effective = options.effective || new Date().toISOString(),
      senderName = options.senderName || this.config.senderName,
      contact = options.contact || "disaster-alert@ndma.gov.in",
      web = options.web,
      parameter = options.parameter || {}
    } = alertData;

    if (!eventType || !severity || !headline || !description || !instruction || !location) {
      throw new Error("Missing required fields: eventType, severity, headline, description, instruction, location");
    }

    const validSeverities = ["INFO", "WARNING", "ALERT", "EMERGENCY"];
    if (!validSeverities.includes(severity)) {
      throw new Error("Invalid severity: " + severity + ". Must be one of " + validSeverities.join(", "));
    }

    if (!location.lat || !location.lon) {
      throw new Error("Location must have lat and lon properties");
    }

    const identifier = options.identifier || this._generateIdentifier(eventType);
    const sent = new Date().toISOString();
    const expires = new Date(Date.now() + expiresInHours * 3600000).toISOString();

    let xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
    xml += "<alert xmlns=\"" + CAP_NS + "\">\n";
    xml += "  <identifier>" + this._escapeXML(identifier) + "</identifier>\n";
    xml += "  <sender>" + this._escapeXML(this.config.sender) + "</sender>\n";
    xml += "  <sent>" + sent + "</sent>\n";
    xml += "  <status>" + this._escapeXML(this.config.defaults.status) + "</status>\n";
    xml += "  <msgType>" + this._escapeXML(this.config.defaults.msgType) + "</msgType>\n";
    xml += "  <scope>" + this._escapeXML(this.config.defaults.scope) + "</scope>\n";
    
    const languages = options.languages || [language];
    
    for (const lang of languages) {
      xml += "  <info>\n";
      xml += "    <language>" + this._escapeXML(lang) + "</language>\n";
      xml += "    <category>" + this._escapeXML(category) + "</category>\n";
      xml += "    <event>" + this._escapeXML(this._getEventName(eventType, lang)) + "</event>\n";
      xml += "    <urgency>" + this._escapeXML(urgency) + "</urgency>\n";
      xml += "    <severity>" + this._escapeXML(this.config.sachet.severityMap[severity] || severity) + "</severity>\n";
      xml += "    <certainty>" + this._escapeXML(certainty) + "</certainty>\n";
      xml += "    <eventCode>\n";
      xml += "      <valueName>http://ndma.gov.in/sachet/event-codes</valueName>\n";
      xml += "      <value>" + eventCode + "</value>\n";
      xml += "    </eventCode>\n";
      xml += "    <effective>" + effective + "</effective>\n";
      xml += "    <expires>" + expires + "</expires>\n";
      xml += "    <senderName>" + this._escapeXML(senderName) + "</senderName>\n";
      const cappedHeadline = headline.length > 160 ? headline.substring(0, 157) + "..." : headline;
      xml += "    <headline>" + this._escapeXML(cappedHeadline) + "</headline>\n";
      xml += "    <description>" + this._escapeXML(description) + "</description>\n";
      xml += "    <instruction>" + this._escapeXML(instruction) + "</instruction>\n";
      xml += "    <contact>" + this._escapeXML(contact) + "</contact>\n";
      if (web) xml += "    <web>" + this._escapeXML(web) + "</web>\n";
      xml += "    <area>\n";
      xml += "      <areaDesc>" + this._escapeXML(areaDesc) + "</areaDesc>\n";
      for (const gc of geocode) {
        xml += "      <geocode>\n";
        xml += "        <valueName>" + this._escapeXML(gc.valueName) + "</valueName>\n";
        xml += "        <value>" + this._escapeXML(gc.value) + "</value>\n";
        xml += "      </geocode>\n";
      }
      if (polygon && polygon.length >= 3) {
        const polyStr = polygon.map(p => p[1] + " " + p[0]).join(" ");
        xml += "      <polygon>" + this._escapeXML(polyStr) + "</polygon>\n";
      }
      if (circle) {
        xml += "      <circle>" + this._escapeXML(circle.lat + " " + circle.lon + " " + circle.radius) + "</circle>\n";
      }
      if (!polygon && !circle && location) {
        const radiusKm = options.radiusKm || this._severityToRadius(severity);
        xml += "      <circle>" + this._escapeXML(location.lat + " " + location.lon + " " + radiusKm) + "</circle>\n";
      }
      xml += "    </area>\n";
      for (const [key, value] of Object.entries(parameter)) {
        xml += "    <parameter>\n";
        xml += "      <valueName>" + this._escapeXML(key) + "</valueName>\n";
        xml += "      <value>" + this._escapeXML(String(value)) + "</value>\n";
        xml += "