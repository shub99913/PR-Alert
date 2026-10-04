/**
 * E11: Message Generation Engine
 * Adapted for React Native/Expo mobile environment
 * 
 * Responsibilities:
 * - Fill templates, translate to multiple languages, format for each channel
 * - The "writer" that creates the actual alert messages for dissemination
 * - Supports SMS (160-char), push title, email, social media, CAP, etc.
 */

class MessageGenerationEngine {
  constructor() {
    this.isInitialized = false;
    this.templates = {}; // Message templates by disaster type, language, channel
    this.translations = {}; // Cached translations
    this.defaultLanguage = 'en';
    this.supportedLanguages = ['en', 'hi']; // English, Hindi
    
    // Initialize immediately
    this.initialize();
  }

  /**
   * Initialize the message generation engine
   * Loads templates and translation resources
   */
  async initialize() {
    try {
      // Load message templates
      await this.loadMessageTemplates();
      
      // In a real implementation, we would load translation resources
      // For now, we'll use a simple translation map
      await this.loadTranslationResources();
      
      this.isInitialized = true;
      this.log('info', 'Message Generation Engine (E11) initialized successfully');
      
      // Update engine status
      await this.updateEngineStatus('E11', 'active');
      
      return true;
    } catch (error) {
      this.log('error', 'Failed to initialize Message Generation: ' + error.message);
      throw error;
    }
  }

  /**
   * Load message templates
   * In production, these might come from remote config or a CMS
   */
  async loadMessageTemplates() {
    // Templates by disaster type, language, and channel
    // Each template is a string with placeholders like {location}, {magnitude}, etc.
    this.templates = {
      // Earthquake templates
      earthquake: {
        en: {
          SMS: "EARTHQUAKE ALERT: {magnitude} quake near {location}. {depth}km deep. {time}. Drop, Cover, Hold On.",
          PUSH_TITLE: "Earthquake Alert: {magnitude}",
          PUSH_BODY: "{magnitude} earthquake near {location} at {time}.",
          EMAIL_SUBJECT: "Earthquake Alert: {magnitude} near {location}",
          EMAIL_BODY: "Earthquake Alert\n\nMagnitude: {magnitude}\nLocation: {location}\nDepth: {depth} km\nTime: {time}\n\nPlease take appropriate safety measures.\nFor more information, visit: {infoUrl}",
          SOCIAL: "EARTHQUAKE ALERT: {magnitude} quake near {location}. {depth}km deep. #Earthquake #DisasterAlert",
          CAP_HEADLINE: "Earthquake Alert: {magnitude}",
          CAP_DESCRIPTION: "An earthquake of magnitude {magnitude} occurred near {location} at {depth} km depth. Time: {time}.",
          CAP_INSTRUCTION: "Drop, Cover, and Hold On. If indoors, stay inside. If outdoors, move to an open area away from buildings, trees, and power lines."
        },
        hi: {
          SMS: "भूकंप चेतावनी: {magnitude} भूकंप {location} के पास। गहराई: {depth} किमी। समय: {time}।",
          PUSH_TITLE: "भूकंप चेतावनी: {magnitude}",
          PUSH_BODY: "{magnitude} तीव्रता का भूकंप {location} के पास {time} पर आया।",
          EMAIL_SUBJECT: "भूकंप चेतावनी: {magnitude} {location} के पास",
          EMAIL_BODY: "भूकंप चेतावनी\n\nतीव्रता: {magnitude}\nस्थान: {location}\nगहराई: {depth} किमी\nसमय: {time}\n\nकृपया उपयुक्त सुरक्षा उपाय अपनाएं।\nअधिक जानकारी के लिए: {infoUrl}",
          SOCIAL: "भूकंप चेतावनी: {magnitude} भूकंप {location} के पास। गहराई: {depth} किमी। #भूकंप #आपदा चेतावनी",
          CAP_HEADLINE: "भूकंप चेतावनी: {magnitude}",
          CAP_DESCRIPTION: "{location} के पास {magnitude} तीव्रता का भूकंप {depth} किमी की गहराई पर हुआ। समय: {time}।",
          CAP_INSTRUCTION: "अगर आप अंदर हैं, तो अंदर रहें। अगर आप बाहर हैं, तो इमारतों, पेड़ों और बिजली के तारों से दूर खुले स्थान पर जाएं।"
        }
      },
      
      // Flood templates
      flood: {
        en: {
          SMS: "FLOOD ALERT: {severity} flood risk in {location}. Expected depth: {depth}m. {time}. Avoid flooded areas.",
          PUSH_TITLE: "Flood Alert: {severity}",
          PUSH_BODY: "{severity} flood risk in {location} at {time}. Expected depth: {depth}m.",
          EMAIL_SUBJECT: "Flood Alert: {severity} in {location}",
          EMAIL_BODY: "Flood Alert\n\nSeverity: {severity}\nLocation: {location}\nExpected Depth: {depth} m\nTime: {time}\n\nPlease avoid flooded areas and seek higher ground if necessary.\nFor more information, visit: {infoUrl}",
          SOCIAL: "FLOOD ALERT: {severity} flood risk in {location}. Expected depth: {depth}m. #Flood #DisasterAlert",
          CAP_HEADLINE: "Flood Alert: {severity}",
          CAP_DESCRIPTION: "{severity} flood risk expected in {location} with depth {depth}m. Time: {time}.",
          CAP_INSTRUCTION: "Avoid flooded areas. Seek higher ground. Do not attempt to cross flowing water."
        },
        hi: {
          SMS: "बाढ़ चेतावनी: {severity} बाढ़ का जोखिम {location} में। अपेक्षित गहराई: {depth} मी। समय: {time}।",
          PUSH_TITLE: "बाढ़ चेतावनी: {severity}",
          PUSH_BODY: "{location} में {severity} बाढ़ का जोखिम {time} पर। अपेक्षित गहराई: {depth} मी।",
          EMAIL_SUBJECT: "{location} में {severity} बाढ़ चेतावनी",
          EMAIL_BODY: "बाढ़ चेतावनी\n\nगंभीरता: {severity}\nस्थान: {location}\nअपेक्षित गहराई: {depth} मी\nसमय: {time}\n\nकृपया बाढ़ वाले क्षेत्रों से बचें और आवश्यक होने पर उच्च भूमि की ओर जाएं।\nअधिक जानकारी के लिए: {infoUrl}",
          SOCIAL: "बाढ़ चेतावनी: {severity} बाढ़ का जोखिम {location} में। अपेक्षित गहराई: {depth} मी। #बाढ़ #आपदा चेतावनी",
          CAP_HEADLINE: "बाढ़ चेतावनी: {severity}",
          CAP_DESCRIPTION: "{location} में {severity} बाढ़ का जोखिम, अपेक्षित गहराई: {depth} मी। समय: {time}।",
          CAP_INSTRUCTION: "बाढ़ वाले क्षेत्रों से बचें। उच्च भूमि की ओर जाएँ। flowing water को पार करने का प्रयास न करें।"
        }
      },
      
      // Cyclone templates
      cyclone: {
        en: {
          SMS: "CYCLONE ALERT: {windSpeed} km/h winds expected in {location}. {time}. Seek shelter immediately.",
          PUSH_TITLE: "Cyclone Alert: {windSpeed} km/h",
          PUSH_BODY: "Cyclone with {windSpeed} km/h winds expected in {location} at {time}.",
          EMAIL_SUBJECT: "Cyclone Alert: {windSpeed} km/h in {location}",
          EMAIL_BODY: "Cyclone Alert\n\nWind Speed: {windSpeed} km/h\nLocation: {location}\nTime: {time}\n\nPlease seek shelter immediately. Avoid travel and secure loose objects.\nFor more information, visit: {infoUrl}",
          SOCIAL: "CYCLONE ALERT: {windSpeed} km/h winds expected in {location}. {time}. #Cyclone #DisasterAlert",
          CAP_HEADLINE: "Cyclone Alert: {windSpeed} km/h",
          CAP_DESCRIPTION: "Cyclone with {windSpeed} km/h winds expected in {location} at {time}.",
          CAP_INSTRUCTION: "Seek shelter immediately. Avoid travel. Secure loose objects and prepare for power outages."
        },
        hi: {
          SMS: "चक्रवात चेतावनी: {windSpeed} किमी/घंटा की हवाएं {location} में अपेक्षित। समय: {time}।",
          PUSH_TITLE: "चक्रवात चेतावनी: {windSpeed} किमी/घंटा",
          PUSH_BODY: "{location} में {windSpeed} किमी/घंटा की हवाओं वाला चक्रवात {time} पर अपेक्षित।",
          EMAIL_SUBJECT: "{location} में {windSpeed} किमी/घंटा की चक्रवात चेतावनी",
          EMAIL_BODY: "चक्रवात चेतावनी\n\nhवाओं की गति: {windSpeed} किमी/घंटा\nस्थान: {location}\nसमय: {time}\n\nकृपया तुरंत शरण लें। यात्रा से बचें और ढीली वस्तुओं को सुरक्षित करें।\nअधिक जानकारी के लिए: {infoUrl}",
          SOCIAL: "चक्रवात चेतावनी: {windSpeed} किमी/घंटा की हवाएं {location} में अपेक्षित। समय: {time}। #चक्रवात #आपदा चेतावनी",
          CAP_HEADLINE: "चक्रवात चेतावनी: {windSpeed} किमी/घंटा",
          CAP_DESCRIPTION: "{location} में {windSpeed} किमी/घंटा की हवाओं वाला चक्रवात {time} पर अपेक्षित।",
          CAP_INSTRUCTION: "तुरंत शरण लें। यात्रा से बचें। ढीली वस्तुओं को सुरक्षित करें और बिजली की आपूर्ति बाधा के लिए तैयार रहें।"
        }
      },
      
      // Generic templates for other disaster types
      default: {
        en: {
          SMS: "DISASTER ALERT: {type} alert for {location}. {time}. Follow official instructions.",
          PUSH_TITLE: "{type} Alert",
          PUSH_BODY: "{type} alert for {location} at {time}.",
          EMAIL_SUBJECT: "{type} Alert for {location}",
          EMAIL_BODY: "{type} Alert\n\nType: {type}\nLocation: {location}\nTime: {time}\n\nPlease follow official instructions and stay tuned for updates.\nFor more information, visit: {infoUrl}",
          SOCIAL: "{type} ALERT: {location} at {time}. #DisasterAlert",
          CAP_HEADLINE: "{type} Alert",
          CAP_DESCRIPTION: "{type} alert for {location} at {time}.",
          CAP_INSTRUCTION: "Please follow official instructions from local authorities."
        },
        hi: {
          SMS: "आपदा चेतावनी: {type} चेतावनी {location} के लिए। समय: {time}।",
          PUSH_TITLE: "{type} चेतावनी",
          PUSH_BODY: "{location} के लिए {type} चेतावनी {time} पर।",
          EMAIL_SUBJECT: "{location} के लिए {type} चेतावनी",
          EMAIL_BODY: "{type} चेतावनी\n\nप्रकार: {type}\nस्थान: {location}\nसमय: {time}\n\nकृपा अधिकारी निर्देशों का पालन करें और अपडेट्स के लिए जुड़े रहें।\nअधिक जानकारी के लिए: {infoUrl}",
          SOCIAL: "{type} चेतावनी: {location} पर {time}। #आपदा चेतावनी",
          CAP_HEADLINE: "{type} चेतावनी",
          CAP_DESCRIPTION: "{location} के लिए {type} चेतावनी {time} पर।",
          CAP_INSTRUCTION: "कृपा स्थानीय अधिकारियों के निर्देशों का पालन करें।"
        }
      }
    };
    
    this.log('info', 'Loaded message templates for ' + Object.keys(this.templates).length + ' disaster types');
  }

  /**
   * Load translation resources
   * In production, this might connect to a translation API or load language files
   */
  async loadTranslationResources() {
    // Simple translation map for demo
    // In reality, we would use a proper i18n library or API
    this.translations = {
      en: {
        "Drop, Cover, Hold On": "Drop, Cover, Hold On",
        "Please take appropriate safety measures": "Please take appropriate safety measures",
        "For more information, visit": "For more information, visit",
        "Avoid flooded areas": "Avoid flooded areas",
        "Seek higher ground": "Seek higher ground",
        "Do not attempt to cross flowing water": "Do not attempt to cross flowing water",
        "Seek shelter immediately": "Seek shelter immediately",
        "Avoid travel": "Avoid travel",
        "Secure loose objects": "Secure loose objects",
        "Prepare for power outages": "Prepare for power outages",
        "Follow official instructions": "Follow official instructions",
        "Stay tuned for updates": "Stay tuned for updates"
      },
      hi: {
        "Drop, Cover, Hold On": "झुकें, कवर ढंकें, अपनी जगह पर रहें",
        "Please take appropriate safety measures": "कृपया उपयुक्त सुरक्षा उपाय अपनाएं",
        "For more information, visit": "अधिक जानकारी के लिए जाएं",
        "Avoid flooded areas": "बाढ़ वाले क्षेत्रों से बचें",
        "Seek higher ground": "उच्च भूमि की ओर जाएं",
        "Do not attempt to cross flowing water": "flowing water को पार करने का प्रयास न करें",
        "Seek shelter immediately": "तुरंत शरण लें",
        "Avoid travel": "यात्रा से बचें",
        "Secure loose objects": "ढीली वस्तुओं को सुरक्षित करें",
        "Prepare for power outages": "बिजली की आपूर्ति बाधा के लिए तैयार रहें",
        "Follow official instructions": "अधिकारी निर्देशों का पालन करें",
        "Stay tuned for updates": "अपडेट्स के लिए जुड़े रहें"
      }
    };
    
    this.log('info', 'Loaded translation resources');
  }

  /**
   * Generate messages for an alert based on alert properties
   * @param {Object} alertProperties - Alert properties from E10 (or similar)
   * @returns {Object} Messages formatted for different channels and languages
   */
  generateMessages(alertProperties) {
    if (!this.isInitialized) {
      throw new Error('Message generation engine not initialized');
    }
    
    this.log('info', 'Generating messages for alert: ' + alertProperties.severity + ' ' + (alertProperties.type || 'unknown') + ' at ' + alertProperties.location?.latitude + ', ' + alertProperties.location?.longitude);
    
    // Determine disaster type (fallback to default)
    const disasterType = alertProperties.type || 'default';
    
    // Get templates for this disaster type (fallback to default)
    const typeTemplates = this.templates[disasterType] || this.templates.default;
    
    // Get languages to generate for (from alertProperties or default)
    const languages = alertProperties.languages || this.supportedLanguages;
    
    // Get channels to generate for (from alertProperties or default)
    const channels = alertProperties.channels || ['SMS', 'PUSH_TITLE', 'PUSH_BODY', 'EMAIL_SUBJECT', 'EMAIL_BODY', 'SOCIAL', 'CAP_HEADLINE', 'CAP_DESCRIPTION', 'CAP_INSTRUCTION'];
    
    // Prepare result object
    const messages = {
      alertId: alertProperties.id || 'alert_' + Date.now(),
      timestamp: Date.now(),
      languages: {},
      channels: {}
    };
    
    // Generate for each language
    for (const lang of languages) {
      // Get translation resources for this language (fallback to English)
      const langTranslations = this.translations[lang] || this.translations.en;
      
      // Get templates for this language (fallback to English)
      const langTemplates = typeTemplates[lang] || typeTemplates.en || this.templates.default.en;
      
      messages.languages[lang] = {};
      
      // Generate for each channel
      for (const channel of channels) {
        // Get template for this channel (fallback to a default)
        const template = langTemplates[channel] || 
                         (langTemplates.DEFAULT || this.templates.default.en.DEFAULT) ||
                         "Alert: {type} at {location} at {time}";
        
        // Generate the message by replacing placeholders
        let message = template;
        
        // Replace common placeholders
        message = message.replace(/\{location\}/g, alertProperties.location ? 
          alertProperties.location.latitude.toFixed(4) + ', ' + alertProperties.location.longitude.toFixed(4) : 
          'Unknown Location');
        message = message.replace(/\{time\}/g, 
          new Date(alertProperties.timestamp || Date.now()).toLocaleString());
        message = message.replace(/\{type\}/g, 
          alertProperties.type || 'Disaster');
        message = message.replace(/\{severity\}/g, 
          alertProperties.severity || 'UNKNOWN');
        message = message.replace(/\{confidence\}/g, 
          (alertProperties.confidence || 0).toFixed(1));
        
        // Replace disaster-specific placeholders
        if (alertProperties.properties) {
          const props = alertProperties.properties;
          for (const [key, value] of Object.entries(props)) {
            const placeholder = '{' + key + '}';
            if (message.includes(placeholder)) {
              message = message.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
                value !== null && value !== undefined ? value.toString() : '');
            }
          }
        }
        
        // Replace location-specific placeholders from affected area
        if (alertProperties.affectedArea) {
          const area = alertProperties.affectedArea;
          if (area.center) {
            message = message.replace(/\{lat\}/g, area.center.latitude.toFixed(4));
            message = message.replace(/\{lon\}/g, area.center.longitude.toFixed(4));
          }
          if (area.radiusMeters !== undefined) {
            message = message.replace(/\{radius\}/g, (area.radiusMeters / 1000).toFixed(1));
          }
          if (area.depthM !== undefined) {
            message = message.replace(/\{depth\}/g, area.depthM.toFixed(1));
          }
        }
        
        // Apply translation if needed (for static parts)
        // In a real system, we would translate the entire message, but for demo we'll translate known phrases
        if (lang !== 'en' && this.translations[lang]) {
          message = this.applyTranslation(message, langTranslations);
        }
        
        // Apply channel-specific formatting
        message = this.applyChannelFormatting(message, channel, alertProperties);
        
        // Store the generated message
        messages.languages[lang][channel] = message;
        
        // Also store in channels flat structure for easy access
        if (!messages.channels[channel]) {
          messages.channels[channel] = {};
        }
        messages.channels[channel][lang] = message;
      }
    }
    
    this.log('info', 'Generated messages for ' + languages.length + ' languages and ' + channels.length + ' channels');
    
    return messages;
  }

  /**
   * Apply translation to a message using a translation map
   * @param {string} message - Message to translate
   * @param {Object} translationMap - Map of translations
   * @returns {string} Translated message
   */
  applyTranslation(message, translationMap) {
    // Replace known phrases with translations
    for (const [english, translated] of Object.entries(translationMap)) {
      // Ensure we're replacing whole words/phrases to avoid partial replacements
      const regex = new RegExp('\\b' + english.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g');
      message = message.replace(regex, translated);
    }
    return message;
  }

  /**
   * Apply channel-specific formatting (length limits, etc.)
   * @param {string} message - Raw message
   * @param {string} channel - Channel identifier
   * @param {Object} alertProperties - Alert properties
   * @returns {string} Formatted message
   */
  applyChannelFormatting(message, channel, alertProperties) {
    switch (channel) {
      case 'SMS':
        // SMS has 160 character limit (or 70 for Unicode, but we'll assume GSM-7 for simplicity)
        if (message.length > 160) {
          // Try to truncate at a word boundary
          const truncated = message.substring(0, 157) + '...';
          return truncated;
        }
        return message;
        
      case 'PUSH_TITLE':
        // Push titles should be short, ideally < 50 chars
        if (message.length > 50) {
          return message.substring(0, 47) + '...';
        }
        return message;
        
      case 'PUSH_BODY':
        // Push bodies can be longer, but let's keep reasonable
        if (message.length > 200) {
          return message.substring(0, 197) + '...';
        }
        return message;
        
      case 'EMAIL_SUBJECT':
        // Email subjects should be reasonably short
        if (message.length > 100) {
          return message.substring(0, 97) + '...';
        }
        return message;
        
      case 'EMAIL_BODY':
        // Email bodies can be long, but we'll limit to 1000 chars for demo
        if (message.length > 1000) {
          return message.substring(0, 997) + '...';
        }
        return message;
        
      case 'SOCIAL':
        // Social media (Twitter) has 280 character limit
        if (message.length > 280) {
          return message.substring(0, 277) + '...';
        }
        return message;
        
      case 'CAP_HEADLINE':
        // CAP headline should be concise
        if (message.length > 100) {
          return message.substring(0, 97) + '...';
        }
        return message;
        
      case 'CAP_DESCRIPTION':
        // CAP description can be longer
        if (message.length > 500) {
          return message.substring(0, 497) + '...';
        }
        return message;
        
      case 'CAP_INSTRUCTION':
        // CAP instruction should be clear but not too long
        if (message.length > 300) {
          return message.substring(0, 297) + '...';
        }
        return message;
        
      default:
        // No specific formatting for other channels
        return message;
    }
  }

  /**
   * Get a specific channel message for an alert
   * @param {Object} alertProperties - Alert properties
   * @param {string} language - Language code
   * @param {string} channel - Channel identifier
   * @returns {string} Formatted message for the channel
   */
  getMessageForChannel(alertProperties, language, channel) {
    const messages = this.generateMessages(alertProperties);
    return messages.languages[language]?.[channel] || messages.channels[channel]?.[language] || '';
  }

  /**
   * Map disaster type to CAP category
   * @param {string} type - Disaster type
   * @returns {string} CAP category
   */
  mapToCapCategory(type) {
    const categoryMap = {
      earthquake: 'Geo',
      flood: 'Met',
      cyclone: 'Met',
      wildfire: 'Fire',
      tsunami: 'Geo',
      landslide: 'Geo',
      volcano: 'Geo',
      extreme_weather: 'Met',
      man_made: 'Other'
    };
    return categoryMap[type] || 'Other';
  }

  /**
   * Map disaster type and severity to CAP event
   * @param {string} type - Disaster type
   * @param {string} severity - Alert severity
   * @returns {string} CAP event
   */
  mapToCapEvent(type, severity) {
    const eventMap = {
      earthquake: 'Earthquake',
      flood: 'Flood',
      cyclone: 'Tropical Cyclone',
      wildfire: 'Wildfire',
      tsunami: 'Tsunami',
      landslide: 'Landslide',
      volcano: 'Volcanic Activity',
      extreme_weather: 'Extreme Weather',
      man_made: 'Man-Made Disaster'
    };
    return eventMap[type] || 'Other';
  }

  /**
   * Map severity to CAP urgency
   * @param {string} severity - Alert severity
   * @returns {string} CAP urgency
   */
  mapToCapUrgency(severity) {
    const urgencyMap = {
      EMERGENCY: 'Immediate',
      ALERT: 'Expected',
      WARNING: 'Future',
      INFO: 'Past'
    };
    return urgencyMap[severity] || 'Future';
  }

  /**
   * Map severity to CAP severity
   * @param {string} severity - Alert severity
   * @returns {string} CAP severity
   */
  mapToCapSeverity(severity) {
    const severityMap = {
      EMERGENCY: 'Extreme',
      ALERT: 'Severe',
      WARNING: 'Moderate',
      INFO: 'Minor'
    };
    return severityMap[severity] || 'Moderate';
  }

  /**
   * Map confidence to CAP certainty
   * @param {number} confidence - Confidence percentage
   * @returns {string} CAP certainty
   */
  mapToCapCertainty(confidence) {
    if (confidence >= 90) return 'Observed';
    if (confidence >= 70) return 'Likely';
    if (confidence >= 50) return 'Possible';
    return 'Unlikely';
  }

  /**
   * Map disaster type to CAP event code
   * @param {string} type - Disaster type
   * @returns {string} CAP event code
   */
  mapToCapEventCode(type) {
    const codeMap = {
      earthquake: 'EQ',
      flood: 'FL',
      cyclone: 'TC',
      wildfire: 'WF',
      tsunami: 'TS',
      landslide: 'LS',
      volcano: 'VO',
      extreme_weather: 'EW',
      man_made: 'MM'
    };
    return codeMap[type] || 'OT';
  }

  /**
   * Escape XML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&apos;');
  }
  
  /**
   * Generate a CAP XML message from alert properties and language-specific content
   * @param {Object} alertProperties - Alert properties
   * @param {string} language - Language for the CAP content
   * @returns {string} CAP XML string
   */
  generateCapXml(alertProperties, language = 'en') {
    // Get the CAP-specific messages
    const capHeadline = this.getMessageForChannel(alertProperties, language, 'CAP_HEADLINE');
    const capDescription = this.getMessageForChannel(alertProperties, language, 'CAP_DESCRIPTION');
    const capInstruction = this.getMessageForChannel(alertProperties, language, 'CAP_INSTRUCTION');
    
    // Format dates for CAP (ISO 8601)
    const sentTime = new Date(alertProperties.timestamp || Date.now()).toISOString();
    const effectiveTime = sentTime; // Effective immediately
    const expiresTime = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // Expires in 6 hours
    
    // Determine CAP message type (Alert, Update, Cancel)
    // For simplicity, we'll always use Alert for new alerts
    const msgType = 'Alert';
    
    // Determine CAP scope (Public, Restricted, Private)
    const scope = 'Public';
    
    // Determine CAP info language
    const capLanguage = language === 'hi' ? 'hi' : 'en';
    
    // Build CAP XML
    return '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">\n' +
      '  <identifier>alert-' + (alertProperties.id || Date.now()) + '-' + language + '</identifier>\n' +
      '  <sender>disaster-alert-system@example.com</sender>\n' +
      '  <sent>' + sentTime + '</sent>\n' +
      '  <status>Actual</status>\n' +
      '  <msgType>' + msgType + '</msgType>\n' +
      '  <scope>' + scope + '</scope>\n' +
      '  <info>\n' +
      '    <language>' + capLanguage + '</language>\n' +
      '    <category>' + this.mapToCapCategory(alertProperties.type || 'Other') + '</category>\n' +
      '    <event>' + this.mapToCapEvent(alertProperties.type || 'Other', alertProperties.severity) + '</event>\n' +
      '    <urgency>' + this.mapToCapUrgency(alertProperties.severity) + '</urgency>\n' +
      '    <severity>' + this.mapToCapSeverity(alertProperties.severity) + '</severity>\n' +
      '    <certainty>' + this.mapToCapCertainty(alertProperties.confidence) + '</certainty>\n' +
      '    <eventCode>\n' +
      '      <valueName>http://www.usaid.gov/programs/ofd/emergency-cap-event-codes</valueName>\n' +
      '      <value>' + this.mapToCapEventCode(alertProperties.type || 'Other') + '</value>\n' +
      '    </eventCode>\n' +
      '    <effective>' + effectiveTime + '</effective>\n' +
      '    <expires>' + expiresTime + '</expires>\n' +
      '    <senderName>Disaster Alert System</senderName>\n' +
      '    <headline>' + this.escapeXml(capHeadline) + '</headline>\n' +
      '    <description>' + this.escapeXml(capDescription) + '</description>\n' +
      '    <instruction>' + this.escapeXml(capInstruction) + '</instruction>\n' +
      '    <contact>disaster-alert@example.com</contact>\n' +
      '    <parameter>\n' +
      '      <valueName>location</valueName>\n' +
      '      <value>' + (alertProperties.location?.latitude || 0) + ',' + (alertProperties.location?.longitude || 0) + '</value>\n' +
      '