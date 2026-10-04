import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { DisasterEvent } from '../store.js';

export async function fetchScrapedNews(): Promise<DisasterEvent[]> {
    try {
        const res = await fetch('https://www.aljazeera.com/', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!res.ok) throw new Error(`Al Jazeera HTTP ${res.status}`);

        const html = await res.text();
        const $ = cheerio.load(html);
        const events: DisasterEvent[] = [];

        const keywords = ['quake', 'storm', 'hurricane', 'flood', 'wildfire', 'fire', 'disaster', 'tsunami', 'cyclone', 'volcano'];

        $('h3.gc__title a, h3.article-trending__title a, a.u-clickable-card__link').each((i, el) => {
            const title = $(el).text().trim();
            const link = $(el).attr('href');

            if (title && link) {
                // Check if title contains disaster keywords
                const isDisaster = keywords.some(k => title.toLowerCase().includes(k));

                if (isDisaster) {
                    events.push({
                        id: `aj-scrape-${uuidv4().split('-')[0]}`,
                        source: 'aljazeera_scraper',
                        type: 'news',
                        title: title,
                        description: 'Web Scraped Article: ' + title,
                        latitude: 0,
                        longitude: 0,
                        severity: 'moderate',
                        timestamp: new Date().toISOString(),
                        url: link.startsWith('http') ? link : `https://www.aljazeera.com${link}`,
                        raw: {}
                    });
                }
            }
        });

        // Deduplicate by title
        const unique = Array.from(new Map(events.map(e => [e.title, e])).values());
        return unique.slice(0, 15);
    } catch (err: any) {
        console.error('[Scraper] Al Jazeera Fetch Error:', err.message);
        return [];
    }
}
