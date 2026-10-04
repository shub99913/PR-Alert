
/**
 * E06: Social Media Stream Engine
 * Adapted for React Native/Expo mobile environment
 * 
 * Responsibilities:
 * - Watch Twitter/X for disaster keywords
 * - Filter noise and false positives
 * - Send real signals into the system
 * - Handle geotagged social media posts
 * - Process multilingual disaster reports
 */

class SocialMediaStreamEngine {
  constructor() {
    this.isInitialized = false;
    this.keywords = {} // Disaster keywords by language/type
    this.filters = {} // Noise filters
    this.rateLimits = {} // API rate limiting
    this.isStreaming = false;
    this.streamTimeouts = {} // Timeout IDs for streaming connections
    this.processedPosts = new Set(); // Track processed post IDs to prevent duplicates
    this.maxProcessedPosts = 10000; // Limit memory usage
    
    // Initialize immediately
    this.initialize();
  }

  /**
   * Initialize the social media stream engine
   * Loads keywords, filters, and sets up streaming
   */
  async initialize() {
    try {
      // Load disaster keywords and filters
      await this.loadKeywordsAndFilters();
      
      // In a real implementation, we would set up Twitter API streaming here
      // For now, we'll simulate the setup
      await this.setupSocialMediaStreaming();
      
      this.isInitialized = true;
      this.log('info', 'Social Media Stream Engine (E06) initialized successfully');
      
      // Update engine status
      await this.updateEngineStatus('E06', 'active');
      
      return true;
    } catch (error) {
      this.log('error', `Failed to initialize Social Media Stream: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load disaster keywords and noise filters
   * In production, this might come from remote config or ML models
   */
  async loadKeywordsAndFilters() {
    // Disaster keywords by language and type
    this.keywords = {
      // English keywords
      en: {
        earthquake: ['earthquake', 'quake', 'tremor', 'seismic', 'richter', 'magnitude'],
        flood: ['flood', 'flooding', 'inundation', 'flash flood', 'river overflow', 'dam break'],
        cyclone: ['cyclone', 'hurricane', 'typhoon', 'storm surge', 'gale', 'tropical storm'],
        wildfire: ['wildfire', 'forest fire', 'brush fire', 'blaze', 'smoke', 'evacuation'],
        tsunami: ['tsunami', 'tidal wave', 'seiche', 'ocean surge'],
        landslide: ['landslide', 'mudslide', 'rock fall', 'avalanche', 'debris flow'],
        volcano: ['volcano', 'eruption', 'ash cloud', 'lava flow', 'pyroclastic'],
        extreme_weather: ['blizzard', 'heatwave', 'cold wave', 'drought', 'hailstorm', 'thunderstorm']
      },
      // Hindi keywords (for India deployment)
      hi: {
        earthquake: ['भूकंप', 'जलन', 'रिक्टर', 'माप'],
        flood: ['बाढ़', 'जलप्रलय', 'नदी उफान', 'बाँध टूटना'],
        cyclone: ['चक्रवात', 'तूफान', 'तूफ़ान', 'वायुजøl'],
        wildfire: ['जंगल की आग', 'वन अग्नि', 'आग की लपटें', 'धुआं'],
        tsunami: ['सुनामी', 'ज्वार तरंग', 'समुद्री लहर'],
        landslide: ['भूस्खलन', 'मलबा बहना', 'चट्टान गिरना'],
        volcano: ['ज्वालामुखी', 'विस्फोट', 'राख का बादल', 'लावा बहना']
      }
    };
    
    // Noise filters - terms that indicate non-disaster usage
    this.filters = {
      // General noise filters
      general: [
        'movie', 'film', 'game', 'sport', 'match', 'concert', 'party',
        'birthday', 'anniversary', 'sale', 'discount', 'offer', 'deal',
        'review', 'rating', 'recommend', 'suggest', 'like', 'love',
        'hate', 'opinion', 'thought', 'feeling', 'believe', 'think'
      ],
      // Platform-specific noise
      twitter: [
        'rt ', '@', '#follow', '#fbf', '#tbt', '#motivation', '#inspiration',
        'quote', 'quotes', 'wisdom', 'motivational', 'inspirational'
      ]
    };
    
    // Rate limits (requests per window)
    this.rateLimits = {
      twitter: {
        requestsPerWindow: 450, // Standard Twitter API v2 limit
        windowMs: 15 * 60 * 1000 // 15 minutes
      }
    };
    
    this.log('info', 'Loaded disaster keywords and noise filters');
  }

  /**
   * Set up social media streaming connections
   * In real implementation, this would use Twitter API v2 filtered stream
   */
  async setupSocialMediaStreaming() {
    // Simulate setting up streaming connections
    // In reality, we would:
    // 1. Authenticate with Twitter API (Bearer token)
    // 2. Set up filtered stream with our disaster keywords
    // 3. Handle connection events (open, close, error)
    // 4. Process incoming tweets in real-time
    
    this.log('info', 'Setting up social media streaming connections (simulated)');
    
    // Simulate starting the stream
    this.isStreaming = true;
    
    // In a real app, we would set up actual streaming here
    // For demo purposes, we'll simulate periodic checking
    this.simulateSocialMediaStream();
  }

  /**
   * Simulate social media streaming for demo purposes
   * In production, this would be replaced with actual Twitter API streaming
   */
  simulateSocialMediaStream() {
    // Simulate receiving social media posts periodically
    setInterval(async () => {
      if (this.isStreaming) {
        await this.processSimulatedSocialMediaPost();
      }
    }, 10000); // Every 10 seconds for demo
    
    this.log('info', 'Started simulated social media stream');
  }

  /**
   * Process a simulated social media post
   * In real implementation, this would process actual tweet data
   */
  async processSimulatedSocialMediaPost() {
    // Simulate different types of social media posts
    const postTypes = [
      {
        // Genuine disaster report
        id: `social_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        text: `EARTHQUAKE ALERT: Strong tremors felt in Delhi-NCR region. Magnitude estimated 5.2. People evacuating buildings. #Earthquake #Delhi`,
        userLocation: { latitude: 28.6139, longitude: 77.2090 },
        timestamp: Date.now(),
        language: 'en',
        isRetweet: false,
        followerCount: 1250
      },
      {
        # Another genuine report
        id: `social_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        text: `Heavy rainfall causing waterlogging in Mumbai streets. Traffic disrupted on Western Express Highway. #MumbaiRains #Flood`,
        userLocation: { latitude: 19.0760, longitude: 72.8777 },
        timestamp: Date.now() - 5000,
        language: 'en',
        isRetweet: false,
        followerCount: 890
      },
      {
        # Noise post (should be filtered)
        id: `social_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        text: `Just watched an amazing earthquake movie! The special effects were incredible. #MovieNight #EarthquakeMovie`,
        userLocation: { latitude: 26.9124, longitude: 75.7873 },
        timestamp: Date.now() - 2000,
        language: 'en',
        isRetweet: false,
        followerCount: 450
      },
      {
        # Retweet (might be duplicate)
        id: `social_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        text: `RT @DisasterAlert: EARTHQUAKE ALERT: Strong tremors felt in Delhi-NCR region. Magnitude estimated 5.2. #Earthquake`,
        userLocation: { latitude: 28.6139, longitude: 77.2090 },
        timestamp: Date.now() - 1000,
        language: 'en',
        isRetweet: true,
        followerCount: 2200
      }
    ];
    
    // Pick a random post type
    const post = postTypes[Math.floor(Math.random() * postTypes.length)];
    
    // Process the post
    await this.processSocialMediaPost(post);
  }

  /**
   * Process a social media post (tweet, etc.)
   * @param {Object} post - Social media post object
   * @returns {Object|null} Normalized event or null if filtered out
   */
  async processSocialMediaPost(post) {
    try {
      // Skip if we've already processed this post (deduplication)
      if (this.processedPosts.has(post.id)) {
        this.log('debug', `Already processed social media post: ${post.id}`);
        return null;
      }
      
      // Add to processed set (with cleanup to prevent memory growth)
      this.processedPosts.add(post.id);
      if (this.processedPosts.size > this.maxProcessedPosts) {
        // Remove oldest entries (simplified - in practice would use LRU)
        const entries = Array.from(this.processedPosts);
        this.processedPosts = new Set(entries.slice(-this.maxProcessedPosts/2));
      }
      
      this.log('info', `Processing social media post: ${post.id}`);
      
      // Step 1: Basic validation
      if (!this.isValidPost(post)) {
        this.log('warn', `Invalid social media post: ${post.id}`);
        return null;
      }
      
      # Step 2: Apply noise filters
      if (this.isNoise(post)) {
        this.log('info', `Filtered as noise: ${post.id}`);
        return null;
      }
      
      # Step 3: Detect disaster type and language
      const detection = this.detectDisasterType(post);
      if (!detection.isDisaster) {
        this.log('info', `No disaster detected in post: ${post.id}`);
        return null;
      }
      
      # Step 4: Extract location information
      const location = this.extractLocation(post);
      if (!location.isValid) {
        this.log('warn', `Could not extract valid location from post: ${post.id}`);
        # We might still process it with user's last known location or approximate
        # For now, we'll continue but mark location as uncertain
      }
      
      # Step 5: Calculate confidence based on various factors
      const confidence = this.calculateConfidence(post, detection, location);
      
      # Step 6: Determine severity based on keywords and context
      const severity = this.determineSeverity(post, detection, confidence);
      
      # Step 7: Build normalized event
      const event = {
        # Core identifiers
        id: `social_${post.id}`, # Prefix to distinguish from other sources
        source: 'social_media',
        sourceId: post.id,
        
        # Event classification
        type: detection.type,
        subtype: detection.subtype,
        
        # Temporal data
        timestamp: post.timestamp || Date.now(),
        updatedAt: Date.now(),
        
        # Geospatial data
        location: {
          latitude: location.latitude || (post.userLocation?.latitude || 20.5937), # Default to India center
          longitude: location.longitude || (post.userLocation?.longitude || 78.9629),
          accuracy: location.accuracy || 5000, # 5km accuracy for social media (low)
          altitude: null # Social media doesn't provide altitude
        },
        
        # Event properties (social media specific)
        properties: {
          text: post.text.substring(0, 500), # Truncate to reasonable length
          language: post.language || 'en',
          isRetweet: post.isRetweet || false,
          followerCount: post.followerCount || 0,
          userHandle: post.userHandle || '@unknown',
          platform: post.platform || 'twitter',
          hashtags: this.extractHashtags(post.text),
          mentions: this.extractMentions(post.text),
          urls: this.extractUrls(post.text)
        },
        
        # Severity and impact
        severity: severity,
        confidence: confidence,
        
        # Affected area (approximate based on confidence and follower count)
        affectedArea: {
          radius: this.calculateSocialAffectedRadius(confidence, post.followerCount || 0),
          places: location.places || []
        },
        
        # Metadata
        metadata: {
          ingestedAt: Date.now(),
          processedBy: ['E06_Social_Media_Stream'],
          tags: ['social_media', detection.type, post.language || 'unknown'],
          rawData: JSON.stringify({
            id: post.id,
            text: post.text,
            userLocation: post.userLocation,
            timestamp: post.timestamp,
            language: post.language,
            platform: post.platform
          })
        }
      };
      
      this.log('info', `Successfully processed social media post: ${post.id} -> ${detection.type} (confidence: ${confidence}%)`);
      
      # In a real implementation, we would:
      # 1. Validate the event with E02 storage engine
      # 2. Store the event
      # 3. Notify other engines (E07 detection, E09 fusion, etc.)
      
      return event;
    } catch (error) {
      this.log('error', `Failed to process social media post: ${error.message}`, { postId: post.id });
      return null;
    }
  }

  /**
   * Validate that a post has the basic required structure
   * @param {Object} post - Social media post
   * @returns {boolean} True if post appears valid
   */
  isValidPost(post) {
    return post &&
           typeof post === 'object' &&
           post.id !== undefined &&
           post.id !== null &&
           post.id.toString().length > 0 &&
           post.text !== undefined &&
           post.text !== null &&
           typeof post.text === 'string' &&
           post.text.length > 0;
  }

  /**
   * Check if a post is noise/non-disaster content
   * @param {Object} post - Social media post
   * @returns {boolean} True if post should be filtered as noise
   */
  isNoise(post) {
    const textLower = post.text.toLowerCase();
    
    # Check general noise filters
    for (const filter of this.filters.general) {
      if (textLower.includes(filter.toLowerCase())) {
        return true;
      }
    }
    
    # Check platform-specific noise
    for (const filter of this.filters.twitter) {
      if (textLower.includes(filter.toLowerCase())) {
        return true;
      }
    }
    
    # Additional noise indicators
    # Very short posts with disaster keywords might still be noise
    if (post.text.length < 20) {
      # Check if it's just a keyword without context
      const words = post.text.trim().split(/\s+/);
      if (words.length <= 3) {
        # Could be just "earthquake" or "flood" without context
        const disasterWords = ['earthquake', 'flood', 'cyclone', 'wildfire', 'tsunami', 'landslide'];
        const hasDisasterWord = disasterWords.some(word => textLower.includes(word));
        if (hasDisasterWord && words.length <= 2) {
          return true; # Likely just a keyword tag
        }
      }
    }
    
    # Posts that are just URLs or hashtags with little text
    const urlCount = (post.text.match(/https?:\/\/\S+/g) || []).length;
    const hashtagCount = (post.text.match(/#\w+/g) || []).length;
    const mentionCount = (post.text.match(/@\w+/g) || []).length;
    
    # If mostly URLs/hashtags/mentions with little actual text
    const nonTextChars = (post.text.match(/[#@\w]/g) || []).length;
    const textCharCount = post.text.length;
    if (textCharCount > 0 && (nonTextChars / textCharCount) > 0.7) {
      return true;
    }
    
    return false;
  }

  /**
   * Detect disaster type from social media post text
   * @param {Object} post - Social media post
   * @returns {Object} { isDisaster: boolean, type: string, subtype: string|null, confidence: number }
   */
  detectDisasterType(post) {
    const textLower = post.text.toLowerCase();
    const language = post.language || 'en';
    
    # Get keywords for this language (fallback to English)
    const langKeywords = this.keywords[language] || this.keywords.en;
    
    # Check each disaster type
    for (const [type, keywords] of Object.entries(langKeywords)) {
      let matchCount = 0;
      let matchedKeywords = [];
      
      for (const keyword of keywords) {
        if (textLower.includes(keyword.toLowerCase())) {
          matchCount++;
          matchedKeywords.push(keyword);
        }
      }
      
      # If we found multiple disaster-related keywords, it's more likely to be real
      if (matchCount >= 2) {
        return {
          isDisaster: true,
          type: type,
          subtype: matchedKeywords.length > 0 ? matchedKeywords[0] : null,
          confidence: Math.min(matchCount * 30, 90) # Base confidence from keyword matches
        };
      }
      
      # Even single strong indicators can be valid
      if (matchCount >= 1) {
        # Check for strong indicator words
        const strongIndicators = {
          earthquake: ['quake', 'tremor', 'seismic', 'richter', 'magnitude'],
          flood: ['inundation', 'flash flood', 'river overflow', 'dam break', 'waterlogging'],
          cyclone: ['storm surge', 'gale', 'tropical storm', 'hurricane', 'typhoon'],
          wildfire: ['blaze', 'evacuation', 'smoke', 'fire spreading'],
          tsunami: ['tidal wave', 'ocean surge', 'seiche', 'warning'],
          landslide: ['mudslide', 'rock fall', 'avalanche', 'debris flow', 'hill slope'],
          volcano: ['eruption', 'ash cloud', 'lava flow', 'pyroclastic', 'magma']
        };
        
        const strongMatches = strongIndicators[type] || [];
        const hasStrongIndicator = strongMatches.some(indicator => 
          textLower.includes(indicator.toLowerCase())
        );
        
        if (hasStrongIndicator) {
          return {
            isDisaster: true,
            type: type,
            subtype: matchedKeywords.length > 0 ? matchedKeywords[0] : null,
            confidence: Math.min(60 + matchCount * 15, 95)
          };
        }
        
        # Still consider it a potential disaster but with lower confidence
        return {
          isDisaster: true,
          type: type,
          subtype: matchedKeywords.length > 0 ? matchedKeywords[0] : null,
          confidence: Math.min(40 + matchCount * 20, 80)
        };
      }
    }
    
    # No disaster detected
    return {
      isDisaster: false,
      type: null,
      subtype: null,
      confidence: 0
    };
  }

  /**
   * Extract location information from social media post
   * @param {Object} post - Social media post
   * @returns {Object} { isValid: boolean, latitude: number, longitude: number, accuracy: number, places: string[] }
   */
  extractLocation(post) {
    # Start with user-provided location if available and valid
    if (post.userLocation && 
        typeof post.userLocation.latitude === 'number' &&
        typeof post.userLocation.longitude === 'number' &&
        post.userLocation.latitude >= -90 && post.userLocation.latitude <= 90 &&
        post.userLocation.longitude >= -180 && post.userLocation.longitude <= 180) {
      
      return {
        isValid: true,
        latitude: post.userLocation.latitude,
        longitude: post.userLocation.longitude,
        accuracy: post.userLocation.accuracy || 1000, # 1km accuracy if provided
        places: [] # Would need reverse geocoding to get place names
      };
    }
    
    # Try to extract location from text
    const textLocations = this.extractPlaceNamesFromText(post.text);
    if (textLocations.length > 0) {
      # In a real implementation, we would geocode these place names
      # For now, we'll return the first location with low accuracy
      # This is a simplification - real implementation would use a geocoding service
      return {
        isValid: true,
        latitude: 20.5937, # Default to India center
        longitude: 78.9629,
        accuracy: 50000, # 50km accuracy - very low confidence
        places: textLocations
      };
    }
    
    # No location information available
    return {
      isValid: false,
      latitude: null,
      longitude: null,
      accuracy: null,
      places: []
    };
  }

  /**
   * Extract place names from text using simple pattern matching
   * @param {string} text - Text to search
   * @returns {string[]} Array of potential place names
   */
  extractPlaceNamesFromText(text) {
    const places = [];
    const textLower = text.toLowerCase();
    
    # Common Indian cities (for demo - in reality would use comprehensive gazetteer)
    const indianCities = [
      'Delhi', 'Mumbai', 'Chennai', 'Kolkata', 'Bangalore', 'Hyderabad',
      'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur',
      'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad',
      'Patna', 'Vadodara', 'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik',
      'Faridabad', 'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar',
      'Varanasi', 'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar',
      'Navi Mumbai', 'Allahabad', 'Ranchi', 'Haora', 'Coimbatore',
      'Jabalpur', 'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai',
      'Raipur', 'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli–Dharwad',
      'Bareilly', 'Moradabad', 'Mysore', 'Gurgaon', 'Aligarh', 'Jalandhar',
      'Tiruchirappalli', 'Bhubaneswar', 'Salem', 'Mira-Bhayandar',
      'Thiruvananthapuram', 'Bhiwandi', 'Saharanpur', 'Gorakhpur'
    ];
    
    # Check for city names in text
    for (const city of indianCities) {
      if (textLower.includes(city.toLowerCase())) {
        places.push(city);
      }
    }
    
    # Also look for patterns like "in [PLACE]" or "at [PLACE]"
    const locationPatterns = [
      /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /at\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /of\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      /near\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi
    ];
    
    for (const pattern of locationPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const potentialPlace = match[1];
        # Basic validation - should be reasonable length and not a common word
        if (potentialPlace.length >= 3 && 
            potentialPlace.length <= 20 &&
            !['the', 'and', 'for', 'with', 'from', 'this', 'that', 'have', 'been'].includes(potentialPlace.toLowerCase())) {
          places.push(potentialPlace);
        }
      }
    }
    
    # Remove duplicates while preserving order
    return [...new Set(places)];
  }

  /**
   * Extract hashtags from text
   * @param {string} text - Text to search
   * @returns {string[]} Array of hashtags (without #)
   */
  extractHashtags(text) {
    const matches = text.match(/#\w+/g) || [];
    return matches.map(tag => tag.substring(1)); # Remove the # prefix
  }

  /**
   * Extract mentions from text
   * @param {string} text - Text to search
   * @returns {string[]} Array of mentions (without @)
   */
  extractMentions(text) {
    const matches = text.match(/@\w+/g) || [];
    return matches.map(mention => mention.substring(1)); # Remove the @ prefix
  }

  /**
   * Extract URLs from text
   * @param {string} text - Text to search
   * @returns {string[]} Array of URLs
   */
  extractUrls(text) {
    const matches = text.match(/https?:\/\/\S+/g) || [];
    return matches;
  }

  /**
   * Calculate confidence score for a social media post
   * @param {Object} post - Social media post
   * @param {Object} detection - Disaster detection result
   * @param {Object} location - Location extraction result
   * @returns {number} Confidence score (0-100)
   */
  calculateConfidence(post, detection, location) {
    let confidence = 0;
    
    # Base confidence from disaster detection
    confidence += detection.confidence * 0.4; # 40% weight
    
    # Location accuracy bonus
    if (location.isValid) {
      # Better accuracy = higher confidence
      const locationScore = Math.max(0, 30 - (location.accuracy || 50000) / 1000); # 30pts for <1km accuracy
      confidence += Math.min(locationScore, 30); # Max 30pts for location
    } else {
      # No location = penalty
      confidence -= 10;
    }
    
    # User credibility factors
    const followerCount = post.followerCount || 0;
    if (followerCount > 10000) {
      confidence += 15; # High follower count = more credible
    } else if (followerCount > 1000) {
      confidence += 10; # Medium follower count
    } else if (followerCount > 100) {
      confidence += 5; # Low follower count
    }
    # Very low follower count might indicate spam/bot accounts
    
    # Account age would be another factor (not available in simulated data)
    
    # Content quality factors
    const textLength = post.text.length;
    if (textLength > 50) {
      confidence += 10; # Longer posts tend to be more informative
    }
    if (textLength > 100) {
      confidence += 5; # Extra bonus for detailed posts
    }
    
    # Hashtag and mention usage (proper use indicates awareness)
    const hashtagCount = this.extractHashtags(post.text).length;
    const mentionCount = this.extractMentions(post.text).length;
    if (hashtagCount > 0 && hashtagCount <= 3) {
      confidence += 5; # Reasonable hashtag use
    }
    if (mentionCount > 0 && mentionCount <= 2) {
      confidence += 5; # Reasonable mention use
    }
    
    # Language confidence (if we detected non-English)
    if (post.language && post.language !== 'en') {
      # Bonus for multilingual capability
      confidence += 5;
    }
    
    # Timestamp recency
    const ageMs = Date.now() - (post.timestamp || Date.now());
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours < 1) {
      confidence += 10; # Very recent post
    } else if (ageHours < 6) {
      confidence += 5; # Recently posted
    }
    # Older posts get no bonus (might be outdated information)
    
    # Ensure confidence is in valid range
    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  /**
   * Determine severity level based on post content and context
   * @param {Object} post - Social media post
   * @param {Object} detection - Disaster detection result
   * @param {number} confidence - Calculated confidence score
   * @returns {string} Severity level (INFO, WARNING, ALERT, EMERGENCY)
   */
  determineSeverity(post, detection, confidence) {
    # Start with confidence-based severity
    let severity = 'INFO';
    if (confidence >= 85) {
      severity = 'EMERGENCY';
    } else if (confidence >= 70) {
      severity = 'ALERT';
    } else if (confidence >= 50) {
      severity = 'WARNING';
    } else {
      severity = 'INFO';
    }
    
    # Adjust based on specific keywords in the text
    const textLower = post.text.toLowerCase();
    
    # Emergency indicators
    const emergencyWords = [
      'emergency', 'evacuate', 'evacuation', 'immediate danger',
      'life threatening', 'casualties', 'fatalities', 'dead', 'died',
      'injured', 'trapped', 'rescue', 'emergency services', 'ambulance',
      'fire department', 'police', 'disaster', 'catastrophe'
    ];
    
    # Warning indicators
    const warningWords = [
      'warning', 'alert', 'watch', 'advisory', 'be careful',
      'avoid area', 'road closed', 'school closed', 'office closed',
      'flight cancelled', 'train delayed', 'power outage'
    ];
    
    # Check for emergency indicators
    if (emergencyWords.some(word => textLower.includes(word))) {
      # Upgrade severity if we see emergency words
      if (severity === 'INFO') severity = 'WARNING';
      else if (severity === 'WARNING') severity = 'ALERT';
      else if (severity === 'ALERT') severity = 'EMERGENCY';
      # EMERGENCY stays EMERGENCY
    }
    # Check for warning indicators
    else if (warningWords.some(word => textLower.includes(word))) {
      # Upgrade severity if we see warning words (but not past WARNING)
      if (severity === 'INFO') severity = 'WARNING';
    }
    
    # Check for magnitude or intensity indicators (for earthquakes)
    if (detection.type === 'earthquake') {
      # Look for magnitude mentions
      const magMatch = textLower.match(/magnitude\s*[:\s]*(\d+\.?\d*)/i);
      if (magMatch) {
        const mag = parseFloat(magMatch[1]);
        if (mag >= 7.0) {
          severity = 'EMERGENCY';
        } else if (mag >= 6.0) {
          severity = 'ALERT';
        } else if (mag >= 5.0) {
          severity = 'WARNING';
        }
      }
      
      # Look for intensity descriptions
      const intensityWords = {
        'strong': 'WARNING',
        'severe': 'ALERT',
        'major': 'ALERT',
        'great': 'EMERGENCY',
        'devastating': 'EMERGENCY',
        'destructive': 'ALERT'
      };
      
      for (const [word, level] of Object.entries(intensityWords)) {
        if (textLower.includes(word)) {
          # Upgrade to at least this level
          const levels = ['INFO', 'WARNING', 'ALERT', 'EMERGENCY'];
          const currentIndex = levels.indexOf(severity);
          const targetIndex = levels.indexOf(level);
          if (targetIndex > currentIndex) {
            severity = level;
          }
        }
      }
    }
    
    return severity;
  }

  /**
   * Calculate affected area radius for social media reports
   * @param {number} confidence - Confidence score (0-100)
   * @param {number} followerCount - Follower count of the poster
   * @returns {number} Radius in meters
   */
  calculateSocialAffectedRadius(confidence, followerCount) {
    # Base radius on confidence - higher confidence = more specific location
    let baseRadius = 50000; # 50km default for low confidence
    
    if (confidence >= 80) {
      baseRadius = 5000; # 5km for high confidence
    } else if (confidence >= 60) {
      baseRadius = 15000; # 15km for medium confidence
    } else if (confidence >= 40) {
      baseRadius = 25000; # 25km for low-medium confidence
    }
    # Below 40 confidence stays at 50km default
    
    # Adjust based on follower count - more followers = wider potential reach
    # But we cap this to prevent overestimation
    let followerFactor = 1.0;
    if (followerCount > 100000) {
      followerFactor = 2.0; # Very influential accounts
    } else if (followerCount > 10000) {
      followerFactor = 1.5; # Moderately influential
    } else if (followerCount > 1000) {
      followerFactor = 1.2; # Somewhat influential
    }
    # Below 1000 followers: no extra reach factor
    
    # Calculate final radius
    const radius = baseRadius * followerFactor;
    
    # Cap at reasonable maximum (we don't want to alert entire country for one tweet)
    return Math.min(radius, 500000); # Max 500km
  }

  /**
   * Start streaming social media for disaster reports
   */
  async startStreaming() {
    if (this.isStreaming) {
      this.log('warn', 'Social media streaming is already active');
      return;
    }
    
    this.isStreaming = true;
    await this.setupSocialMediaStreaming();
    
    this.log('info', 'Started social media streaming');
    
    # Update engine status
    await this.updateEngineStatus('E06', 'active');
  }

  /**
   * Stop streaming social media
   */
  async stopStreaming() {
    if (!this.isStreaming) {
      this.log('warn', 'Social media streaming is not active');
      return;
    }
    
    this.isStreaming = false;
    
    # Clear any active timeouts
    for (const timeoutId of Object.values(this.streamTimeouts)) {
      clearTimeout(timeoutId);
    }
    this.streamTimeouts = {};
    
    this.log('info', 'Stopped social media streaming');
    
    # Update engine status
    await this.updateEngineStatus('E06', 'inactive');
  }

  /**
   * Get social media streaming status
   */
  getStatus() {
    return {
      engine: 'E06_SocialMediaStream',
      initialized: this.isInitialized,
      isStreaming: this.isStreaming,
      processedPostsCount: this.processedPosts.size,
      keywordsLoaded: Object.keys(this.keywords).length,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Set up logging (simplified version)
   */
  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    if (__DEV__) {
      console.log(`[E06_SocialMedia][${level.toUpperCase()}] ${message}`, metadata);
    }
    # In production, might send to centralized logging
  }

  /**
   * Update engine status in storage
   */
  async updateEngineStatus(engineId, status) {
    try {
      # In real implementation, would use AsyncStorage or similar
      # For now, just log
      this.log('info', `Engine ${engineId} status updated to ${status}`);
    } catch (error) {
      this.log('warn', `Could not update engine status: ${error.message}`);
    }
  }

  /**
   * Shutdown the social media stream engine
   */
  async shutdown() {
    this.log('info', 'Shutting down Social Media Stream Engine');
    await this.stopStreaming();
    this.isInitialized = false;
    return true;
  }
}

// Export singleton instance
const socialMediaEngine = new SocialMediaStreamEngine();
export default socialMediaEngine;
