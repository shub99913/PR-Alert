import Parser from 'rss-parser';
import axios from 'axios';
import { Event } from '../models/Event.js';

const parser = new Parser({
    customFields: {
        item: ['source', 'pubDate'],
    }
});

const NEWS_RSS_URL = 'https://news.google.com/rss/search?q=earthquake+OR+wildfire+OR+flood+OR+hurricane+OR+tsunami+OR+"natural+disaster"&hl=en-US&gl=US&ceid=US:en';

export async function fetchGlobalNews() {
    try {
        const { data: xml } = await axios.get(NEWS_RSS_URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/xml, text/xml, */*'
            }
        });
        const feed = await parser.parseString(xml);

        return feed.items.slice(0, 30).map((item: any) => {
            // Generate a deterministic ID based on the URL or guid
            const uniqueId = `news-${Buffer.from(item.guid || item.link || item.title).toString('base64').substring(0, 16)}`;

            return {
                id: uniqueId,
                source: 'news',
                type: 'news',
                title: item.title,
                description: item.contentSnippet || item.title,
                latitude: 0, // News is global/abstracted
                longitude: 0,
                severity: 'low', // Default info
                timestamp: new Date(item.pubDate || new Date()).toISOString(),
                raw: { link: item.link, sourceTitle: item.source }
            };
        });
    } catch (err: any) {
        console.error('[News API] Fetch error:', err.message);
        return [];
    }
}
