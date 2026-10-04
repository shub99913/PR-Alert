import Handlebars from 'handlebars';
import { createEngineLogger } from '@pr-alert/core';
import { 
  Alert, 
  DisasterType, 
  Severity, 
  Channel,
  AlertSchema,
  DispatchRecord 
} from '@pr-alert/schemas';
import { createPoint, haversineDistance, calculateArea, bboxFromCenter, bboxToPolygon } from '@pr-alert/geospatial';

const logger = createEngineLogger('messaging');

// Template registry
const templates = new Map<string, HandlebarsTemplateDelegate>();

// Register default templates
registerDefaultTemplates();

/**
 * Message template data structure
 */
export interface MessageTemplateData {
  alert: any;
  event: any;
  location: {
    lat: number;
    lon: number;
    address?: string;
    nearbyCities?: string[];
  };
  timestamp: string;
  severityLabel: string;
  disasterTypeLabel: string;
  actionGuidance: string;
  expiresAt?: string;
  alertId?: string;
}

/**
 * Message output
 */
export interface GeneratedMessage {
  lang: string;
  channel: Channel;
  content: string;
  subject?: string; // for email
  templateId: string;
  characterCount: number;
  truncated: boolean;
}

/**
 * Supported languages (Indian languages + English)
 */
export const SUPPORTED_LANGUAGES = [
  'en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'or', 'pa', 'as'
] as const;

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

/**
 * Channel character limits
 */
export const CHANNEL_LIMITS: Record<Channel, number> = {
  sms: 160,
  email: 10000,
  push: 2000,
  whatsapp: 4096,
  webhook: 10000,
  social_media: 280,
  siren: 0,
  cell_broadcast: 1395,
  radio: 500,
  tv: 500,
  operator_dashboard: 5000,
};

/**
 * Standardized Alert XML Generator (CAP-like format but independent)
 * Generates structured XML for interoperability without government dependencies
 */
export class AlertXmlGenerator {
  private static readonly ALERT_NS = 'urn:pr-alert:names:tc:alert:1.0';
  
  static generate(alert: any, options: {
    senderId?: string;
    senderName?: string;
    language?: string;
    allLanguages?: boolean;
  } = {}): string {
    const { builder } = require('xml2js');
    const b = new builder({ 
      headless: true,
      renderOpts: { pretty: true, indent: '  ', newline: '\n' },
      xmldec: { version: '1.0', encoding: 'UTF-8', standalone: true }
    });

    const alertObj = {
      alert: {
        $: { xmlns: this.ALERT_NS },
        identifier: alert._id || `pr-alert-${Date.now()}`,
        sender: options.senderId || 'alert@pr-alert.org',
        sent: new Date().toISOString(),
        status: alert.status === 'issued' ? 'Actual' : 
                alert.status === 'cancelled' ? 'Cancel' : 'Draft',
        msgType: alert.status === 'cancelled' ? 'Cancel' : 'Alert',
        scope: 'Public',
        info: this.buildInfoBlocks(alert, options),
      }
    };

    return b.buildObject(alertObj);
  }

  private static buildInfoBlocks(alert: any, options: any): any[] {
    const languages = options.allLanguages 
      ? alert.messages.map(m => m.lang)
      : [options.language || 'en'];

    return languages.map(lang => {
      const message = alert.messages.find(m => m.lang === lang) || alert.messages[0];
      const severityMap: Record<string, string> = {
        info: 'Minor',
        warning: 'Moderate',
        alert: 'Severe',
        emergency: 'Extreme',
      };
      const urgencyMap: Record<string, string> = {
        info: 'Future',
        warning: 'Expected',
        alert: 'Immediate',
        emergency: 'Immediate',
      };
      const certaintyMap: Record<string, string> = {
        info: 'Possible',
        warning: 'Likely',
        alert: 'Likely',
        emergency: 'Observed',
      };

      const info: any = {
        language: lang,
        category: this.getCategory(alert.disasterType),
        event: this.getEventName(alert.disasterType, lang),
        urgency: urgencyMap[alert.severity] || 'Expected',
        severity: severityMap[alert.severity] || 'Moderate',
        certainty: certaintyMap[alert.severity] || 'Likely',
        effective: alert.issuedAt,
        expires: alert.expiresAt,
        senderName: options.senderName || 'PR-Alert System',
        headline: this.truncate(message.content, 160),
        description: message.content,
        instruction: this.getInstruction(alert.disasterType, lang),
        contact: 'support@pr-alert.org',
        web: 'https://pr-alert.org/alert/' + alert._id,
      };

      // Add area information
      if (alert.location) {
        info.area = [{
          areaDesc: this.getAreaDescription(alert),
          circle: alert.location.coordinates ? 
            [alert.location.coordinates[1], alert.location.coordinates[0], 50].join(' ') : 
            undefined,
          geocode: [
            { valueName: 'CITY', value: this.getCityName(alert) },
            { valueName: 'STATE', value: this.getStateName(alert) },
          ].filter(g => g.value),
        }].filter(a => a.circle || a.geocode.length > 0);
      }

      // Add parameters
      info.parameter = [
        { valueName: 'eventId', value: alert._id },
        { valueName: 'disasterType', value: alert.disasterType },
        { valueName: 'confidence', value: String(alert.confidence) },
        { valueName: 'sourceCount', value: String(alert.messages.length) },
      ].map(p => ({ valueName: p.valueName, value: p.value }));

      return info;
    });
  }

  private static getCategory(disasterType: string): string {
    const categories: Record<string, string> = {
      earthquake: 'Geo',
      flood: 'Met',
      cyclone: 'Met',
      wildfire: 'Fire',
      landslide: 'Geo',
      heatwave: 'Met',
      tsunami: 'Geo',
      air_quality: 'Env',
    };
    return categories[disasterType] || 'Geo';
  }

  private static getEventName(disasterType: string, lang: string): string {
    const names: Record<string, Record<string, string>> = {
      en: {
        earthquake: 'Earthquake',
        flood: 'Flood',
        cyclone: 'Cyclone',
        wildfire: 'Wildfire',
        landslide: 'Landslide',
        heatwave: 'Heat Wave',
        tsunami: 'Tsunami',
        air_quality: 'Air Quality Alert',
      },
      hi: {
        earthquake: 'भूकंप',
        flood: 'बाढ़',
        cyclone: 'चक्रवात',
        wildfire: 'जंगल की आग',
        landslide: 'भूस्खलन',
        heatwave: 'लू',
        tsunami: 'सुनामी',
        air_quality: 'वायु गुणवत्ता चेतावनी',
      },
    };
    return names[lang]?.[disasterType] || names.en[disasterType] || disasterType;
  }

  private static truncate(str: string, max: number): string {
    return str.length > max ? str.substring(0, max - 3) + '...' : str;
  }

  private static getInstruction(disasterType: string, lang: string): string {
    const instructions: Record<string, Record<string, string>> = {
      en: {
        earthquake: 'Drop, Cover, and Hold On. Stay away from windows. Be prepared for aftershocks.',
        flood: 'Move to higher ground immediately. Do not walk or drive through flood waters.',
        cyclone: 'Seek shelter in a sturdy building. Stay away from windows. Keep emergency supplies ready.',
        wildfire: 'Evacuate immediately if directed. Close all windows and doors. Cover nose and mouth.',
        landslide: 'Move away from the slide path. Listen for unusual sounds. Evacuate if directed.',
        heatwave: 'Stay indoors. Drink plenty of water. Avoid strenuous activity. Check on vulnerable neighbors.',
        tsunami: 'Move to high ground immediately. Do not wait for official warning if you feel strong shaking.',
      },
      hi: {
        earthquake: 'झुकें, ढकें, और पकड़ें। खिड़कियों से दूर रहें। आफ्टरशॉक्स के लिए तैयार रहें।',
        flood: 'तुरंत ऊंची जगह पर जाएँ। बाढ़ के पानी में न चलें और न गाड़ी चलाएँ।',
        cyclone: 'मजबूत इमारत में शरण लें। खिड़कियों से दूर रहें। आपातकालीन सामान तैयार रखें।',
        wildfire: 'अगर निर्देश दिया जाए तो तुरंत निकलें। सभी खिड़कियाँ और दरवाजे बंद करें। नाक और मुँह ढकें।',
        landslide: 'स्लाइड के रास्ते से दूर हटें। असामान्य आवाजें सुनें। निर्देश मिलने पर निकलें।',
        heatwave: 'घर के अंदर रहें। खूब पानी पिएँ। मेहनत वाले काम से बचें। कमजोर पड़ोसियों का ख्याल रखें।',
        tsunami: 'तुरंत ऊंची जगह पर जाएँ। आधिकारिक चेतावनी का इंतजार न करें अगर तेज झटका महसूस हो।',
      },
    };
    return instructions[lang]?.[disasterType] || instructions.en[disasterType] || '';
  }

  private static getAreaDescription(alert: any): string {
    return `Area near ${alert.location.coordinates?.[1].toFixed(2)}°N, ${alert.location.coordinates?.[0].toFixed(2)}°E`;
  }

  private static getCityName(alert: any): string {
    return 'Unknown City';
  }

  private static getStateName(alert: any): string {
    return 'Unknown State';
  }
}

/**
 * Message Generator Engine
 */
export class MessageGenerator {
  private logger = createEngineLogger('messaging');
  
  constructor() {
    this.registerDefaultTemplates();
  }

  /**
   * Generate messages for all channels and languages
   */
  async generateAll(alert: any, options: {
    languages?: SupportedLanguage[];
    channels?: Channel[];
  } = {}): Promise<GeneratedMessage[]> {
    const languages = options.languages || ['en', 'hi'];
    const channels = options.channels || ['sms', 'push', 'email'];
    const results: GeneratedMessage[] = [];

    for (const lang of languages) {
      for (const channel of channels) {
        try {
          const message = await this.generate(alert, lang, channel);
          results.push(message);
        } catch (error) {
          this.logger.error({ err: error, lang, channel }, 'Message generation failed');
        }
      }
    }

    return results;
  }

  /**
   * Generate a single message
   */
  async generate(alert: any, lang: SupportedLanguage, channel: Channel): Promise<GeneratedMessage> {
    const templateData = this.buildTemplateData(alert, lang);
    const templateId = this.getTemplateId(alert.disasterType, channel);
    
    const template = templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let content = template(templateData);
    
    // Apply channel-specific limits
    const limit = CHANNEL_LIMITS[channel];
    let truncated = false;
    if (content.length > limit) {
      content = content.substring(0, limit - 3) + '...';
      truncated = true;
    }

    const message: GeneratedMessage = {
      lang,
      channel,
      content,
      subject: channel === 'email' ? this.generateSubject(alert, lang) : undefined,
      templateId,
      characterCount: content.length,
      truncated,
    };

    return message;
  }

  /**
   * Build template data from alert
   */
  private buildTemplateData(alert: any, lang: SupportedLanguage): MessageTemplateData {
    const severityLabels: Record<string, Record<string, string>> = {
      en: { info: 'Information', warning: 'Warning', alert: 'Alert', emergency: 'Emergency' },
      hi: { info: 'सूचना', warning: 'चेतावनी', alert: 'अलर्ट', emergency: 'आपातकाल' },
    };
    
    const disasterLabels: Record<string, Record<string, string>> = {
      en: { earthquake: 'Earthquake', flood: 'Flood', cyclone: 'Cyclone', wildfire: 'Wildfire', landslide: 'Landslide', heatwave: 'Heat Wave', tsunami: 'Tsunami' },
      hi: { earthquake: 'भूकंप', flood: 'बाढ़', cyclone: 'चक्रवात', wildfire: 'जंगल की आग', landslide: 'भूस्खलन', heatwave: 'लू', tsunami: 'सुनामी' },
    };

    const location = alert.location?.coordinates ? {
      lat: alert.location.coordinates[1],
      lon: alert.location.coordinates[0],
    } : { lat: 0, lon: 0 };

    return {
      alert,
      event: { type: alert.disasterType, severity: alert.severity },
      location: {
        ...location,
        address: this.getLocationAddress(alert),
        nearbyCities: [],
      },
      timestamp: new Date().toLocaleString(lang === 'hi' ? 'hi-IN' : 'en-IN'),
      severityLabel: severityLabels[lang]?.[alert.severity] || alert.severity,
      disasterTypeLabel: disasterLabels[lang]?.[alert.disasterType] || alert.disasterType,
      actionGuidance: this.getActionGuidance(alert.disasterType, lang),
      expiresAt: alert.expiresAt,
      alertId: alert._id,
    };
  }

  private getLocationAddress(alert: any): string {
    const coords = alert.location?.coordinates;
    if (!coords) return 'Unknown location';
    return `${coords[1].toFixed(2)}°N, ${coords[0].toFixed(2)}°E`;
  }

  private getTemplateId(disasterType: string, channel: Channel): string {
    return `${disasterType}_${channel}`;
  }

  private generateSubject(alert: any, lang: SupportedLanguage): string {
    const prefixes: Record<string, string> = {
      en: { info: 'Info', warning: 'Warning', alert: 'ALERT', emergency: 'EMERGENCY' },
      hi: { info: 'सूचना', warning: 'चेतावनी', alert: 'अलर्ट', emergency: 'आपातकाल' },
    };
    const prefix = prefixes[lang]?.[alert.severity] || 'Alert';
    const typeLabels: Record<string, string> = {
      en: { earthquake: 'Earthquake', flood: 'Flood', cyclone: 'Cyclone', wildfire: 'Wildfire', landslide: 'Landslide', heatwave: 'Heat Wave', tsunami: 'Tsunami' },
      hi: { earthquake: 'भूकंप', flood: 'बाढ़', cyclone: 'चक्रवात', wildfire: 'जंगल की आग', landslide: 'भूस्खलन', heatwave: 'लू', tsunami: 'सुनामी' },
    };
    return `[${prefix}] ${typeLabels[lang]?.[alert.disasterType] || alert.disasterType} - ${new Date().toLocaleTimeString()}`;
  }

  private severityLabels: Record<string, Record<string, string>> = {
    en: { info: 'Information', warning: 'Warning', alert: 'Alert', emergency: 'Emergency' },
    hi: { info: 'सूचना', warning: 'चेतावनी', alert: 'अलर्ट', emergency: 'आपातकाल' },
  };

  private disasterLabels: Record<string, Record<string, string>> = {
    en: { earthquake: 'Earthquake', flood: 'Flood', cyclone: 'Cyclone', wildfire: 'Wildfire', landslide: 'Landslide', heatwave: 'Heat Wave', tsunami: 'Tsunami' },
    hi: { earthquake: 'भूकंप', flood: 'बाढ़', cyclone: 'चक्रवात', wildfire: 'जंगल की आग', landslide: 'भूस्खलन', heatwave: 'लू', tsunami: 'सुनामी' },
  };

  private getActionGuidance(disasterType: string, lang: SupportedLanguage): string {
    const guidance: Record<string, Record<string, string>> = {
      en: {
        earthquake: 'Drop, Cover, Hold On. Stay away from windows. Expect aftershocks.',
        flood: 'Move to higher ground. Do not walk/drive through flood water.',
        cyclone: 'Seek sturdy shelter. Stay away from windows. Keep emergency kit ready.',
        wildfire: 'Evacuate if directed. Close windows/doors. Cover nose and mouth.',
        landslide: 'Move away from slope. Listen for unusual sounds. Evacuate if told.',
        heatwave: 'Stay indoors. Drink water. Avoid exertion. Check on vulnerable neighbors.',
        tsunami: 'Move to high ground immediately. Do not wait for official warning.',
      },
      hi: {
        earthquake: 'झुकें, ढकें, पकड़ें। खिड़कियों से दूर रहें। आफ्टरशॉक्स के लिए तैयार रहें।',
        flood: 'ऊंची जगह पर जाएँ। बाढ़ के पानी में न चलें, न गाड़ी चलाएँ।',
        cyclone: 'मजबूत इमारत में शरण लें। खिड़कियों से दूर रहें। आपातकालीन किट तैयार रखें।',
        wildfire: 'निर्देश मिलने पर तुरंत निकलें। खिड़कियाँ-दरवाजे बंद करें। नाक-मुँह ढकें।',
        landslide: 'ढलान के रास्ते से दूर हटें। असामान्य आवाजें सुनें। निर्देश पर निकलें।',
        heatwave: 'घर में रहें। पानी पिएँ। मेहनत से बचें। कमजोर पड़ोसियों का ख्याल रखें।',
        tsunami: 'तुरंत ऊंची जगह जाएँ। आधिकारिक चेतावनी का इंतजार न करें अगर तेज झटका लगा हो।',
      },
    };
    return guidance[lang]?.[disasterType] || guidance.en[disasterType] || '';
  }

  /**
   * Get template for disaster type and channel
   */
  getTemplate(disasterType: string, channel: Channel): HandlebarsTemplateDelegate | undefined {
    return templates.get(`${disasterType}_${channel}`);
  }

  /**
   * Register a custom template
   */
  registerTemplate(id: string, template: string): void {
    const compiled = Handlebars.compile(template);
    templates.set(id, compiled);
  }
}

/**
 * Translation service for multilingual support
 */
export class TranslationService {
  private static translations: Map<string, Map<string, string>> = new Map();
  
  static {
    // Initialize with built-in translations
    this.loadBuiltInTranslations();
  }

  static loadBuiltInTranslations(): void {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'earthquake': 'Earthquake',
        'flood': 'Flood',
        'cyclone': 'Cyclone',
        'wildfire': 'Wildfire',
        'landslide': 'Landslide',
        'heatwave': 'Heat Wave',
        'tsunami': 'Tsunami',
        'air_quality': 'Air Quality Alert',
        'info': 'Information',
        'warning': 'Warning',
        'alert': 'Alert',
        'emergency': 'Emergency',
        'Drop, Cover, Hold On': 'Drop, Cover, Hold On',
        'Move to higher ground': 'Move to higher ground',
        'Seek shelter': 'Seek shelter',
        'Evacuate immediately': 'Evacuate immediately',
      },
      hi: {
        'earthquake': 'भूकंप',
        'flood': 'बाढ़',
        'cyclone': 'चक्रवात',
        'wildfire': 'जंगल की आग',
        'landslide': 'भूस्खलन',
        'heatwave': 'लू',
        'tsunami': 'सुनामी',
        'air_quality': 'वायु गुणवत्ता चेतावनी',
        'info': 'सूचना',
        'warning': 'चेतावनी',
        'alert': 'अलर्ट',
        'emergency': 'आपातकाल',
        'Drop, Cover, Hold On': 'झुकें, ढकें, पकड़ें',
        'Move to higher ground': 'ऊंची जगह पर जाएँ',
        'Seek shelter': 'शरण लें',
        'Evacuate immediately': 'तुरंत निकलें',
      },
      bn: {
        earthquake: 'ভূমিকম্প',
        flood: 'বন্যা',
        cyclone: 'চক্রবাত',
        wildfire: 'জঙ্গলের আগুন',
        landslide: 'ভূস्खলন',
        heatwave: 'তাপঘন',
        tsunami: 'সুনামি',
      },
      te: {
        earthquake: 'భూకంపు',
        flood: 'వРосీ',
        cyclone: 'చక్రవాత',
        wildfire: 'అడవిప',
        landslide: 'భూస్ఖలనం',
        heatwave: 'వలిమెచ్',
        tsunami: 'సునామి',
      },
      ta: {
        earthquake: 'நிலநடுக்கம்',
        flood: 'வெள்ளம்',
        cyclone: 'சூறாவளி',
        wildfire: 'காட்டுத் தீ',
        landslide: 'மண்அழுகல்',
        heatwave: 'வெப்ப அலை',
        tsunami: 'சூனாமி',
      },
    };

    for (const [lang, dict] of Object.entries(translations)) {
      const map = new Map<string, string>();
      for (const [key, value] of Object.entries(dict)) {
        map.set(key, value);
      }
      this.translations.set(lang, map);
    }
  }

  static translate(key: string, lang: SupportedLanguage): string {
    return this.translations.get(lang)?.get(key) || this.translations.get('en')?.get(key) || key;
  }

  static t(key: string, lang: SupportedLanguage, params?: Record<string, string>): string {
    let translated = this.translate(key, lang);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        translated = translated.replace(`{${key}}`, value);
      }
    }
    return translated;
  }
}

/**
 * Register default templates
 */
function registerDefaultTemplates(): void {
  // SMS Templates
  const smsTemplate = `
{{#if (eq alert.disasterType "earthquake")}}
{{#if (gt alert.properties.magnitude 6.0)}}
[EMERGENCY] EARTHQUAKE ALERT: M{{alert.properties.magnitude}} at {{location.address}}. Depth: {{alert.properties.depth}}km. {{actionGuidance}} Expires: {{expiresAt}}
{{else}}
[WARNING] Earthquake M{{alert.properties.magnitude}} near {{location.address}}. Depth: {{alert.properties.depth}}km. {{actionGuidance}}
{{/if}}
{{/if}}

{{#if (eq alert.disasterType "flood")}}
[{{severityLabel}}] FLOOD {{#if (eq alert.properties.severity "severe")}}WARNING{{else}}ALERT{{/if}}: {{location.address}}. {{actionGuidance}} {{#if alert.properties.waterLevel}}Water level: {{alert.properties.waterLevel}}m{{/if}}
{{/if}}

{{#if (eq alert.disasterType "cyclone")}}
[{{severityLabel}}] CYCLONE {{alert.properties.category}}: {{location.address}}. Winds {{alert.properties.windSpeed}}km/h. {{actionGuidance}} Landfall: {{alert.properties.landfallTime}}
{{/if}}

{{#if (eq alert.disasterType "wildfire")}}
[{{severityLabel}}] WILDFIRE ALERT: {{location.address}}. Area: {{alert.properties.areaHectares}}ha. {{actionGuidance}} Evacuation: {{#if alert.properties.evacuationOrdered}}ORDERED{{else}}Not ordered{{/if}}
{{/if}}

{{#if (eq alert.disasterType "landslide")}}
[{{severityLabel}}] LANDSLIDE ALERT: {{location.address}}. {{actionGuidance}} Road status: {{alert.properties.roadStatus}}
{{/if}}

{{#if (eq alert.disasterType "heatwave")}}
[{{severityLabel}}] HEATWAVE: {{location.address}}. Temp: {{alert.properties.temperature}}°C. {{actionGuidance}} Hydration critical.
{{/if}}

{{#if (eq alert.disasterType "tsunami")}}
[EMERGENCY] TSUNAMI WARNING: {{location.address}}. Wave ETA: {{alert.properties.eta}}. {{actionGuidance}} MOVE TO HIGH GROUND NOW!
{{/if}}

{{#if (eq alert.disasterType "air_quality")}}
[{{severityLabel}}] AIR QUALITY ALERT: {{location.address}}. AQI: {{alert.properties.aqi}}. {{actionGuidance}} Sensitive groups stay indoors.
{{/if}}

Default: [{{severityLabel}}] {{disasterTypeLabel}} at {{location.address}}. {{actionGuidance}}`;
  
  const compiled = Handlebars.compile(smsTemplate);
  templates.set('default_sms', compiled);

  // Email template
  const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 20px; border: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
    .alert-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 14px; }
    .emergency { background: #fee2e2; color: #991b1b; }
    .alert { background: #fed7aa; color: #9a3412; }
    .warning { background: #fef3c7; color: #92400e; }
    .info { background: #dbeafe; color: #1e40af; }
    .details { margin: 20px 0; padding: 15px; background: #f9fafb; border-radius: 8px; }
    .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .label { font-weight: bold; color: #4b5563; }
    .value { color: #111827; }
    .action-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>PR-Alert Disaster Warning</h1>
    </div>
    <div class="content">
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="alert-badge {{severity}}">{{severityLabel}}</span>
        <h2 style="margin: 10px 0 0;">{{disasterTypeLabel}} Alert</h2>
      </div>
      <div class="details">
        <div class="detail-row"><span class="label">Location:</span><span class="value">{{location.address}}</span></div>
        <div class="detail-row"><span class="label">Time:</span><span class="value">{{timestamp}}</span></div>
        <div class="detail-row"><span class="label">Severity:</span><span class="value">{{severityLabel}}</span></div>
        <div class="detail-row"><span class="label">Confidence:</span><span class="value">{{(alert.confidence * 100).toFixed(0)}}%</span></div>
        {{#if alert.properties.magnitude}}
        <div class="detail-row"><span class="label">Magnitude:</span><span class="value">M{{alert.properties.magnitude}}</span></div>
        {{/if}}
        {{#if alert.properties.depth}}
        <div class="detail-row"><span class="label">Depth:</span><span class="value">{{alert.properties.depth}} km</span></div>
        {{/if}}
        {{#if alert.properties.windSpeed}}
        <div class="detail-row"><span class="label">Wind Speed:</span><span class="value">{{alert.properties.windSpeed}} km/h</span></div>
        {{/if}}
        {{#if alert.properties.temperature}}
        <div class="detail-row"><span class="label">Temperature:</span><span class="value">{{alert.properties.temperature}}°C</span></div>
        {{/if}}
      </div>

      <div class="action-box">
        <h3 style="margin: 0 0 10px; color: #92400e;">Recommended Actions</h3>
        <p style="margin: 0;">{{actionGuidance}}</p>
      </div>

      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
        This alert was issued by PR-Alert at {{timestamp}}. 
        <a href="https://pr-alert.org/alert/{{alertId}}">View full alert</a>
      </p>
    </div>
    <div class="footer">
      <p>PR-Alert Universal Multi-Disaster Pre-Alert System</p>
      <p>This is an automated alert. Do not reply to this email.</p>
    </div>
  </div>
</body>
</html>`;

  const compiledSms = Handlebars.compile(smsTemplate);
  templates.set('default_sms', compiledSms);

  const compiledEmail = Handlebars.compile(emailTemplate);
  templates.set('default_email', compiledEmail);

  // Push notification template
  const pushTemplate = `
{{#if (eq alert.disasterType "earthquake")}}
{{#if (gt alert.properties.magnitude 6.0)}}
🚨 EARTHQUAKE M{{alert.properties.magnitude}} - {{location.address}}
{{else}}
⚠️ Earthquake M{{alert.properties.magnitude}} - {{location.address}}
{{/if}}
{{/if}}

{{#if (eq alert.disasterType "flood")}}
🌊 {{severityLabel}}: Flood at {{location.address}}
{{/if}}

{{#if (eq alert.disasterType "cyclone")}}
🌀 {{severityLabel}}: Cyclone {{alert.properties.category}} at {{location.address}}
{{/if}}

{{#if (eq alert.disasterType "wildfire")}}
🔥 {{severityLabel}}: Wildfire at {{location.address}}
{{/if}}

{{#if (eq alert.disasterType "tsunami")}}
🌊 TSUNAMI WARNING: {{location.address}}
{{/if}}

{{actionGuidance}}`;

  const compiledPush = Handlebars.compile(pushTemplate);
  templates.set('default_push', compiledPush);

  // WhatsApp template
  const whatsappTemplate = `
*{{severityLabel}}: {{disasterTypeLabel}} Alert*

📍 *Location:* {{location.address}}
⏰ *Time:* {{timestamp}}
📊 *Severity:* {{severityLabel}}
📊 *Confidence:* {{(alert.confidence * 100).toFixed(0)}%

{{#if alert.properties.magnitude}}
📏 *Magnitude:* M{{alert.properties.magnitude}}
{{/if}}
{{#if alert.properties.depth}}
📏 *Depth:* {{alert.properties.depth}} km
{{/if}}
{{#if alert.properties.windSpeed}}
💨 *Wind:* {{alert.properties.windSpeed}} km/h
{{/if}}

*Action Required:*
{{actionGuidance}}

🔗 Full details: https://pr-alert.org/alert/{{alertId}}

_This is an automated alert from PR-Alert System_`;

  const compiledWhatsApp = Handlebars.compile(whatsappTemplate);
  templates.set('default_whatsapp', compiledWhatsApp);
}

export { 
  MessageGenerator, 
  AlertXmlGenerator, 
  TranslationService,
  GeneratedMessage,
  MessageTemplateData,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  CHANNEL_LIMITS,
  Channel,
  AlertXmlGenerator,
};