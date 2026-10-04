import RssParser from 'rss-parser';
import { DisasterEvent } from '../store.js';

const GDACS_RSS_URL = 'https://www.gdacs.org/xml/rss.xml';
const parser = new RssParser({
    headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    customFields: {
        item: [
            ['gdacs:severity', 'gdacsSeverity'],
            ['gdacs:eventtype', 'gdacsEventType'],
            ['gdacs:country', 'gdacsCountry'],
            ['geo:lat', 'geoLat'],
            ['geo:long', 'geoLong'],
        ],
    },
});

function mapEventType(gdacsType: string): DisasterEvent['type'] {
    const map: Record<string, DisasterEvent['type']> = {
        EQ: 'earthquake',
        TC: 'cyclone',
        FL: 'flood',
        TS: 'tsunami',
        VO: 'volcano',
        WF: 'wildfire',
        DR: 'other',
    };
    return map[gdacsType] || 'other';
}

function mapSeverity(text: string): DisasterEvent['severity'] {
    const lower = (text || '').toLowerCase();
    if (lower.includes('red') || lower.includes('orange')) return 'critical';
    if (lower.includes('high')) return 'high';
    if (lower.includes('yellow') || lower.includes('moderate')) return 'moderate';
    return 'low';
}

export async function fetchGDACS(): Promise<DisasterEvent[]> {
    try {
        const feed = await parser.parseURL(GDACS_RSS_URL);

        return feed.items.map((item: any) => {
            const lat = parseFloat(item.geoLat) || 0;
            const lon = parseFloat(item.geoLong) || 0;
            const severity = mapSeverity(item.gdacsSeverity?.['_'] || item.gdacsSeverity || '');
            const eventType = mapEventType(item.gdacsEventType || '');

            return {
                id: `gdacs-${item.guid || item.link || item.title}`,
                source: 'gdacs' as const,
                type: eventType,
                title: item.title || 'GDACS Event',
                description: (item.contentSnippet || item.content || item.title || '').substring(0, 300),
                latitude: lat,
                longitude: lon,
                severity,
                timestamp: item.isoDate || new Date(item.pubDate || Date.now()).toISOString(),
                url: item.link,
            };
        });
    } catch (err: any) {
        console.error('[GDACS] Fetch error:', err.message);
        return [];
    }
}
