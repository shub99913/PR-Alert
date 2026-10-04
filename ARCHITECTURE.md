# PR-Alert Platform - Architecture & Implementation Plan

## Overview
Universal Multi-Disaster Intelligence & Pre-Alert Platform for India
- **Tech Stack**: React/TypeScript/Tailwind, Leaflet, Node.js/Express, MongoDB, Socket.io, Python/FastAPI
- **19 Modular Engines** covering the full pipeline
- **MVP**: USGS → normalization → MongoDB → rule-based detection → alert candidate → live map → English/Hindi message → CAP XML → simulated dispatch → delivery tracking

## 19 Engines Architecture

| Engine | Name | Responsibility | Tech |
|--------|------|----------------|------|
| E01 | Core Infrastructure | Config, logging, DI container, health checks | Node/TS |
| E02 | Event Schema & Storage | MongoDB collections, indexes, TTL, validation | MongoDB/TS |
| E03 | Geospatial Engine | Haversine, point-in-polygon, buffering, admin boundaries | TS + Turf.js |
| E04 | Ingestion Framework | Scheduler, retry/backoff, rate limiting, dedup | Node/TS + BullMQ |
| E05 | Source Adapters | USGS, IMD, GDACS, FIRMS, OpenAQ, OpenWeather, Social, Crowd | TS adapters |
| E06 | Normalization Engine | Common schema, unit conversion, enrichment, dedup | TS |
| E07 | Rule Detection Engine | Thresholds, geo-fencing, compound rules, severity | TS + JSONLogic |
| E08 | ML Inference Engine | Python/FastAPI service: quake aftershock, flood, cyclone, fire risk | Python/FastAPI + ONNX |
| E09 | Confidence Fusion | Weighted voting, Dempster-Shafer, conflict resolution | TS |
| E10 | Alert Decision Engine | Thresholds, escalation, deduplication, cooldown | TS |
| E11 | Message Generation | Multi-lang templates (EN/HI/12 Indian langs), CAP XML | TS + Handlebars |
| E12 | Dispatch Engine | SMS (Twilio), Email (SendGrid), Push (FCM), WhatsApp, Webhooks | TS + providers |
| E13 | CAP/SACHET Integration | CAP v1.2 XML, SACHET/C-DOT Cell Broadcast format | TS + XML |
| E14 | Crowd Report Engine | Citizen reports, verification, trust scoring, clustering | TS + MongoDB |
| E15 | API Gateway | REST + GraphQL, auth, rate limiting, versioning | Express + Apollo |
| E16 | Dashboard Frontend | React + Leaflet map, real-time Socket.io, multilingual | React/TS/Tailwind |
| E17 | Operator Dashboard | Real-time monitoring, manual override, audit trail | React/TS |
| E18 | ML Training Pipeline | Data prep, training, evaluation, model registry | Python + MLflow |
| E19 | Observability | Prometheus metrics, Grafana dashboards, structured logs | Prometheus/Grafana |

## MVP Vertical Slice (Week 1-2)
**USGS → E05 adapter → E06 normalize → E02 MongoDB → E07 rule detection → E11 message → E13 CAP XML → E12 simulated dispatch → E16 live map**

## Implementation Order (Engine by Engine)

1. **E01-E03**: Core infra, MongoDB schemas, Geospatial utils
2. **E04-E06**: Ingestion framework + USGS adapter + Normalization
3. **E07**: Rule-based detection (MVP: magnitude + depth + location rules)
4. **E11+E13**: Message templates (EN/HI) + CAP v1.2 XML
5. **E12**: Simulated dispatch + delivery tracking
6. **E16**: React dashboard with Leaflet map + Socket.io
7. **E14**: Crowd report submission + verification
8. **E08**: Python ML service (separate repo, FastAPI)
9. **E09+E10**: Fusion + Alert decision
10. **E15+E16**: API Gateway + Dashboard UI
11. **E17+E19**: Operator dashboard + Observability

## Project Structure (Monorepo)
```
pr-alert/
├── apps/
│   ├── api/                 # Express + Socket.io (E01, E04, E07, E10, E11, E12, E13, E15)
│   ├── dashboard/           # React + Vite + Tailwind (E16)
│   ├── operator/            # React operator dashboard (E17)
│   └── ml-service/          # Python FastAPI (E08, E18)
├── packages/
│   ├── core/                # Shared types, config, logger (E01)
│   ├── geospatial/          # Geospatial utilities (E03)
│   ├── schemas/             # Zod schemas for all engines (E02, E06)
│   ├── adapters/            # Source adapters (E05)
│   ├── normalization/       # Normalization engine (E06)
│   ├── detection/           # Rule detection (E07)
│   ├── fusion/              # Confidence fusion (E09)
│   ├── messaging/           # Message gen + CAP (E11, E13)
│   ├── dispatch/            # Dispatch engine (E12)
│   ├── crowd/               # Crowd reports (E14)
│   ├── ml-client/           # TypeScript client for ML service
│   └── ui-components/       # Shared React components
├── infrastructure/
│   ├── docker-compose.yml
│   ├── k8s/
│   └── monitoring/
└── turbo.json
```

## Data Models (Core)

### Event (Normalized)
```typescript
interface DisasterEvent {
  _id: ObjectId;
  source: 'usgs' | 'imd' | 'gdacs' | 'firms' | 'openaq' | 'crowd' | 'social';
  sourceId: string;
  disasterType: 'earthquake' | 'flood' | 'cyclone' | 'wildfire' | 'landslide' | 'heatwave' | 'tsunami' | 'air_quality';
  severity: 'info' | 'warning' | 'alert' | 'emergency';
  confidence: number; // 0-1
  location: { type: 'Point'; coordinates: [number, number] };
  area?: { type: 'Polygon'; coordinates: number[][][] };
  properties: Record<string, any>;
  timestamp: Date;
  receivedAt: Date;
  processedAt: Date;
}
```

### Alert
```typescript
interface Alert {
  _id: ObjectId;
  eventIds: ObjectId[];
  disasterType: string;
  severity: 'info' | 'warning' | 'alert' | 'emergency';
  confidence: number;
  location: GeoJSON.Point;
  affectedArea?: GeoJSON.Polygon;
  affectedPopulation?: number;
  messages: { lang: string; channel: string; content: string }[];
  capXml: string;
  status: 'draft' | 'issued' | 'cancelled' | 'expired';
  issuedAt?: Date;
  expiresAt?: Date;
  dispatches: DispatchRecord[];
}
```

## Development Rules
- **No real alerts**: All dispatch is simulated, CAP XML logged only
- **No prediction claims**: ML outputs labeled "risk assessment" not "prediction"
- **Feature flags**: Real dispatch disabled by default
- **Audit logging**: All decisions recorded with rationale
- **Tests first**: Each engine has unit + integration tests

## Next Steps
1. Initialize monorepo with TurboRepo
2. Create shared packages (core, schemas, geospatial)
3. Build USGS adapter + normalization + MongoDB storage
4. Build rule detection + message generation + CAP XML
5. Build React dashboard with Leaflet + Socket.io
6. Add ML service (Python/FastAPI)