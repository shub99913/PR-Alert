export type Severity = 'critical' | 'high' | 'moderate' | 'low';

export interface DisasterEvent {
    id: string;
    source: 'usgs' | 'gdacs' | 'firms' | 'weather' | 'crowd' | 'news' | 'aljazeera_scraper';
    type: 'flood' | 'wildfire' | 'tsunami' | 'cyclone' | 'volcano' | 'weather' | 'earthquake' | 'news' | 'other';
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    severity: Severity;
    timestamp: string;
    magnitude?: number;
    depth?: number;
    url?: string;
    raw?: any;
}

class Store {
    private events: Map<string, DisasterEvent> = new Map();
    private crowdReports: any[] = [];

    addEvents(events: DisasterEvent[]) {
        events.forEach(e => this.events.set(e.id, e));
    }

    getEventsNear(lat: number, lon: number, radiusKm: number): DisasterEvent[] {
        const result: DisasterEvent[] = [];
        this.events.forEach(e => {
            if (this.haversine(lat, lon, e.latitude, e.longitude) <= radiusKm) {
                result.push(e);
            }
        });
        return result;
    }

    addCrowdReport(report: any) {
        report.id = Math.random().toString(36).substring(7);
        report.createdAt = new Date().toISOString();
        this.crowdReports.push(report);
        return report;
    }

    getCrowdReports() {
        return this.crowdReports;
    }

    private haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}

export const store = new Store();
