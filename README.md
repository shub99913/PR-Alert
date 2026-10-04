# Universal Multi-Disaster Pre-Alert System (Mobile)

React Native/Expo implementation of the disaster alert system, built engine-by-engine following the architecture from the project documentation.

## Current Status: Engine-by-Engine Implementation + UI Screens + Context/Wiring

### ✅ E01: Core Infrastructure Engine
- Application initialization and configuration
- Logging and error handling
- Device capability checking
- Engine status tracking
- Configuration management

### ✅ E02: Event Schema & Storage Engine
- Event schema definition for all disaster types
- Persistent storage using AsyncStorage
- Deduplication prevention using sourceId
- Data validation and sanitization
- Query capabilities (by type, time, location)
- Geospatial calculations (distance, proximity)
- Automatic pruning of old events
- Storage statistics and monitoring
- Engine status tracking

### ✅ E03: Geospatial Utility Engine
- Distance calculation (Haversine and Vincenty formulas)
- Point-in-polygon and point-in-circle checks
- Polygon area calculation using shoelace formula
- Bounding box operations
- Centroid calculation
- Bearing and destination point calculations
- Coordinate conversion utilities
- Used by almost every other engine for spatial analysis

### ✅ E04: Ingestion Framework Engine
- Scheduled polling of data sources with configurable intervals
- Exponential backoff retry mechanism for failed requests
- Data source management (add, remove, enable/disable)
- Simulated HTTP requests for USGS, OpenWeatherMap, GDACS, NASA FIRMS
- Failure tracking and automatic recovery
- Integration-ready for E05 adapters and E02 storage
- Status monitoring and health checks

### ✅ E05: Source Adapters
- **USGS Earthquake Adapter (FULLY IMPLEMENTED)**
  - Converts USGS GeoJSON earthquake data to internal event format
  - Handles magnitude-based severity classification
  - Extracts location, depth, and temporal data
  - Calculates confidence based on data quality metrics (nst, rms, gap)
  - Determines affected area radius based on magnitude
  - Proper error handling and validation
- OpenWeatherMap Adapter (PLACEHOLDER)
  - Ready for weather-based disaster detection implementation
- GDACS Adapter (PLACEHOLDER)
  - Ready for international disaster alert implementation
- Adapter registry and utility functions
- Extensible base adapter class for easy addition of new sources

### ✅ E06: Social Media Stream Engine
- Twitter/X streaming simulation for disaster keyword detection
- Multilingual support (English and Hindi keywords)
- Advanced noise filtering to reduce false positives
- Location extraction from user coordinates and text
- Confidence scoring based on multiple factors (follower count, content quality, recency)
- Severity determination based on keywords and context
- Duplicate post prevention
- Rate limiting preparation
- Ready for integration with actual Twitter API v2

### ✅ E07: Rule-Based Detection Engine
- Fast, explainable if-then rule detection (~80% event capture)
- Comprehensive rule sets for earthquakes, floods, cyclones, wildfires
- Severity-based rule triggering (INFO/WARNING/ALERT/EMERGENCY)
- Confidence boosting based on rule matches
- Support for complex conditions (>=, <, includes, regex, etc.)
- Dynamic rule addition and enabling/disabling at runtime
- Statistics tracking (processed events, alerts generated, trigger rates)
- Ready for integration with ML models in fusion engine

### ✅ E08: ML Prediction Engine
- **E08a: Rainfall Nowcast Model (LSTM) - FULLY IMPLEMENTED**
  - Short-term rainfall prediction (1-6 hours)
  - Uses LSTM neural networks
  - Input: radar, satellite, ground sensor data
  - Output: rainfall probabilities and amounts
- **E08b: Flood Inundation Model (XGBoost + DEM) - FULLY IMPLEMENTED**
  - Flood prediction using gradient boosting
  - Uses DEM and hydrological features
  - Output: flood probability, depth, risk level
- **E08c: Aftershock Probability Model (Omori's Law) - FULLY IMPLEMENTED**
  - Statistical aftershock prediction
  - Uses Omori's law and ETAS principles
  - Output: aftershock rates, magnitude distribution
- **E08d: Anomaly Detection Model (Autoencoder) - FULLY IMPLEMENTED**
  - Neural network anomaly detection
  - Identifies precursor patterns
  - Output: anomaly score, severity assessment
- Unified ML model interface with caching
- Model information and metadata access
- Ready for integration with fusion engine (E09)

### ✅ E09: Fusion & Confidence Engine
- Combines signals from E07 (Rule-Based), E08 (ML Prediction), E06 (Social Media), and E16 (Crowd Reports)
- Implements three fusion methods: Weighted Average, Bayesian, and Dempster-Shafer theory
- Assigns confidence scores and determines severity levels
- Reduces false alarms through cross-validation and temporal consistency checks
- Only passes high-confidence candidates forward to E10 (Alert Decision)
- Configurable weights and thresholds for tuning
- Action recommendations based on confidence levels (IMMEDIATE_ALERT, ISSUE_ALERT, MONITOR_CLOSELY, etc.)
- Tracks recent fusions for temporal consistency
- Ready for integration with crowd reports engine (E16)

### ✅ E10: Alert Decision Engine
- Makes final alert decisions based on fused intelligence from E09
- Implements severity-based action thresholds (INFO/WARNING/ALERT/EMERGENCY)
- Applies jurisdictional policies (India-specific overrides included)
- Prevents duplicate alerts with configurable cooldown periods
- Enforces channel rate limits to prevent alert fatigue
- Determines optimal channels, languages, and alert properties
- Applies area expansion based on severity for safety margins
- Provides actionable recommendations (NONE, MONITOR, ALERT, EMERGENCY_ALERT)
- Tracks decision history for analytics and duplicate prevention
- Ready for integration with E11 (Message Generation) and E12 (Dispatch)

### ✅ E11: Message Generation Engine
- Creates channel-specific messages from alert properties
- Multi-language template support (12 Indian languages: English, Hindi, Tamil, Bengali, Telugu, Marathi, Gujarati, Kannada, Malayalam, Odia, Punjabi, Assamese)
- Disaster-type specific templates (earthquake, flood, cyclone, default)
- Channel-specific formatting (SMS 160-char, push 50-char title, social 280-char, etc.)
- CAP v1.2 XML generation for government integration (E14)
- Translation map for common phrases (English ↔ Hindi + 10 other languages)
- Placeholder substitution for dynamic content (location, magnitude, time, etc.)
- Template validation and caching
- Ready for integration with E12 (Alert Dispatcher) and E13 (Channel Adapters)

### ✅ E12: Dissemination Engine
- Multi-channel alert dissemination: SMS (Twilio), Email (SendGrid), Push (FCM), Siren, TV/Radio
- Retry logic with exponential backoff
- Rate limiting per channel
- Delivery tracking and logging
- Mock implementations for development (replace with real SDKs in production)
- Channel-specific formatting and optimization
- Ready for integration with E13 Channel Adapters

### ✅ E13: Channel Adapters
- Unified abstraction layer for all dissemination channels
- Base adapter class with health checks, rate limiting, stats
- **SMS Adapter** - Twilio + SACHET support
- **Email Adapter** - SendGrid with rich content
- **Push Adapter** - FCM/APNs with multicast support
- **Siren Adapter** - Local/remote siren activation
- **TV/Radio Adapter** - CAP-based EAS/CAP broadcasting
- **Web Adapter** - WebSocket, SSE, Webhook for real-time dashboards
- Channel Adapter Registry for unified management
- Consistent interface, health checks, channel-specific logic

### ✅ E14: CAP/SACHET Integration Engine
- Implements CAP v1.2 (Common Alerting Protocol) standard
- Integrates with India's SACHET (Satellite-based Alert System for Hazard Event Tracking)
- Government-level alert dissemination
- Multi-language CAP XML generation (12 Indian languages)
- SACHET-specific event codes and severity mappings
- Geocoding with Indian states/UTs
- Polygon/circle area definitions
- XML validation and escape utilities

### ✅ E15: Feedback Loop Engine
- User feedback collection on alerts (acknowledged, dismissed, false_alarm, verified, action_taken, etc.)
- Alert verification workflow with evidence support
- Crowd verification/voting system
- Feedback analytics and metrics (false alarm rate, acknowledgment rate, verification rate)
- Learning signal extraction for ML model retraining
- User engagement scoring
- Real-time metrics aggregation with periodic cleanup

### ✅ E16: Crowd Report Engine
- Citizen disaster reporting (12 report types: earthquake_feeling, flood_observation, landslide_sighting, fire_outbreak, cyclone_damage, infrastructure_damage, utility_outage, evacuation_need, medical_emergency, supply_shortage, hazard_spotting, traffic_disruption)
- Media attachments (photos, videos, audio) with validation
- Geolocation with accuracy metadata
- Anonymous and authenticated reporting
- Crowd verification/voting (agree/disagree/up/down)
- Report clustering and deduplication (spatial-temporal)
- Reporter reputation/trust scoring with levels (unreliable, new, regular, trusted, expert)
- Official validation workflow
- Integration with E07 Rules, E08 ML, E09 Fusion, E10 Decision, E15 Feedback
- Search and filtering capabilities

### ✅ E19: Observability & Ops Engine
- Comprehensive logging system with levels (debug, info, warn, error)
- Metrics collection (counters, gauges, histograms) with labels
- Health check registration and monitoring
- Distributed tracing capabilities
- Profiling support for performance analysis
- System resource monitoring (memory, CPU, disk)
- Configurable retention and sampling
- Ready for integration with external monitoring systems (Prometheus, Grafana)

### ✅ UI Screens (React Native/Expo)
- **HomeScreen.js** - Main dashboard with real-time alerts list, pull-to-refresh, location permission, nearby alerts, active disaster types, quick actions, engine status grid, settings navigation
- **AlertScreen.js** - Alert detail view with CAP XML display, share/copy actions, feedback submission, multi-language support
- **MapScreen.js** - Interactive map with react-native-maps, custom markers, disaster type filtering, cluster view, user location, callout details, legend
- **SettingsScreen.js** - Full settings: notifications, location, alerts, data, appearance, language, severity filters, disaster type filters
- **CrowdReportScreen.js** - 6-step wizard: type → severity → location → description → media → review with GPS, camera/gallery, multi-language

### ✅ Context & State Management
- **AppContext.js** - React Context for global state management with actions for: refreshData, setUserLocation, addAlert, updateAlert, dismissAlert, submitFeedback, submitCrowdReport, updateSettings
- **types/index.js** - TypeScript-like type definitions for all entities (DisasterEvent, Alert, CrowdReport, User, EngineStatus, etc.)
- **services/api.js** - API service connecting to PR-Alert backend (Express + MongoDB + Socket.io)
- **services/websocket.js** - WebSocket service for real-time updates via Socket.io

### ✅ Navigation
- **App.js** - React Navigation with bottom tabs (Home, Alerts, Map, Report, Settings) + stack navigation for detail screens

## Project Structure
```
disaster-alert-mobile/
├── src/
│   ├── engines/
│   │   ├── e01_core/           # Core Infrastructure (IMPLEMENTED)
│   │   ├── e02_storage/        # Event Schema & Storage (IMPLEMENTED)
│   │   ├── e03_geospatial/     # Geospatial Utilities (IMPLEMENTED)
│   │   ├── e04_ingestion/      # Ingestion Framework (IMPLEMENTED)
│   │   ├── e05_adapters/       # Source Adapters (IMPLEMENTED - USGS)
│   │   ├── e06_social/         # Social Media Stream (IMPLEMENTED)
│   │   ├── e07_detection/      # Rule-Based Detection (IMPLEMENTED)
│   │   ├── e08_ml/             # ML Prediction (IMPLEMENTED - 4 models)
│   │   ├── e09_fusion/         # Fusion & Confidence (IMPLEMENTED)
│   │   ├── e10_decision/       # Alert Decision (IMPLEMENTED)
│   │   ├── e11_message/        # Message Generation (IMPLEMENTED)
│   │   ├── e12_dissemination/  # Alert Dissemination (IMPLEMENTED)
│   │   ├── e13_channels/       # Channel Adapters (IMPLEMENTED)
│   │   ├── e14_capsachet/      # CAP/SACHET Integration (IMPLEMENTED)
│   │   ├── e15_feedback/       # Feedback Loop (IMPLEMENTED)
│   │   └── e19_observability/  # Observability & Ops Engine (IMPLEMENTED)
│   ├── screens/
│   │   ├── HomeScreen.js       # Main dashboard
│   │   ├── AlertScreen.js      # Alert listing
│   │   ├── MapScreen.js        # Interactive map
│   │   ├── SettingsScreen.js   # Configuration
│   │   └── CrowdReportScreen.js # 6-step crowd reporting wizard
│   ├── context/
│   │   └── AppContext.js       # Global state management
│   ├── services/
│   │   ├── api.js              # REST API client
│   │   └── websocket.js        # WebSocket for real-time
│   ├── types/
│   │   └── index.js            # Type definitions
│   ├── components/             # Reusable UI components
│   ├── assets/                 # Images, icons, etc.
│   └── utils/                  # Helper functions
├── test-engines.js             # Engine test suite (all passing)
├── package.json
├── app.json
└── README.md
```

## Development Progress
Based on the documentation in:
- AN OVERVIEW.pdf (system architecture and roadmap)
- PR-Alert step by step guide.pdf (implementation phases)
- Maps.pdf (map visualization concepts)

## Getting Started
1. Install Node.js and Expo CLI
2. Run `npm install` 
3. Run `expo start` to begin development
4. Scan QR code with Expo Go app on iOS/Android
5. For Android emulator: `expo run:android`

## Test Results
```
All engine logic tests completed successfully!
Fusion: 71.5% confidence → ALERT severity
Decision: ALERT → Channels: SACHET, SMS, PUSH, EMAIL
Languages: Hindi + English (India jurisdiction)
```

Run tests with: `npm test`

## Next Immediate Steps
1. **Wire engines to UI** - Connect HomeScreen/MapScreen/AlertScreen to actual engine APIs (E09/E10/E16)
2. **Add real API integrations** - Replace `[REDACTED]` placeholders with real credentials (Twilio, SendGrid, FCM, SACHET, Google Maps)
3. **Implement E17: API Gateway & WebSocket Engine** - Complete the backend API
4. **Implement E18: Dashboard Frontend** - React Native UI with full engine wiring
5. **End-to-end integration testing**
6. **Production deployment preparation** (EAS build, app store submission)

## Architecture References
- **Monorepo (pr-alert/)** - Full platform with 19 engines across packages/apps
- **Core Packages**: @pr-alert/core, @pr-alert/schemas, @pr-alert/geospatial, @pr-alert/adapters, @pr-alert/normalization, @pr-alert/detection, @pr-alert/fusion, @pr-alert/messaging, @pr-alert/dispatch, @pr-alert/crowd
- **Apps**: api (Express + Socket.io), ml-service (Python FastAPI), dashboard (React + Vite), operator (React)

## Key Decisions
1. **React Native/Expo over web prototype** — Mobile-first approach
2. **Engine-by-engine sequential build** — Each engine complete before next
3. **USGS adapter fully implemented first** — Highest priority per PDF Phase 1
4. **Simulated adapters for other sources** — Ready for real API integration
5. **Multi-language support from start** — 12 Indian languages per SACHET/CAP requirements
6. **CAP v1.2 XML generation in E11** — Critical for E14 government integration
7. **AsyncStorage for persistence** — Mobile-appropriate, no backend dependency for MVP
8. **Fusion engine supports 3 methods** — Weighted average, Bayesian, Dempster-Shafer
9. **E14 deferred per user request** — CAP/SACHET integration deferred; will implement after UI wiring
10. **UI screens use react-native-maps** — Following PDF recommendation for Leaflet/OpenStreetMap