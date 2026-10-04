import * as cheerio from 'cheerio';
import * as fs from 'fs';

async function testAJ() {
    const res = await fetch('https://www.aljazeera.com/');
    const html = await res.text();
    const $ = cheerio.load(html);
    const events: any[] = [];

    // Al Jazeera uses h3.gc__title for most article blocks on their frontend
    $('h3.gc__title a, h3.article-trending__title a, a.u-clickable-card__link').each((i, el) => {
        const title = $(el).text().trim();
        const link = $(el).attr('href');

        if (title && link) {
            events.push({
                title,
                link: link.startsWith('http') ? link : `https://www.aljazeera.com${link}`
            });
        }
    });

    // Filter by disaster keywords
    const keywords = ['quake', 'storm', 'hurricane', 'flood', 'wildfire', 'fire', 'disaster', 'tsunami', 'cyclone', 'volcano'];
    const filtered = events.filter(e => keywords.some(k => e.title.toLowerCase().includes(k)));

    console.log(`Found ${filtered.length} disaster news web-scrapes!`);
    console.log(filtered.slice(0, 5));
}
testAJ();
