import cron from 'node-cron';
import { Server as SocketServer } from 'socket.io';
import { fetchEarthquakes } from './services/usgs.js';
import { fetchGDACS } from './services/gdacs.js';
import { fetchFIRMS } from './services/firms.js';
import { fetchWeatherAlerts } from './services/weather.js';
import { fetchWeatherAPIAlerts } from './services/weatherapi.js';
import { fetchGlobalNews } from './services/news.js';
import { fetchScrapedNews } from './services/scraper.js';
import { Event } from './models/Event.js';
import { analyzeEvent } from './detection/rules.js';

export function startCronJobs(io: SocketServer) {
    console.log('[Cron] Starting scheduled data polling...');

    setTimeout(async () => {
        await pollUSGS(io);
        await pollWeather(io);
        await pollGDACS(io);
        await pollFIRMS(io);
        await pollNews(io);
        await pollWeatherAPI(io);
    }, 2000);

    cron.schedule('*/1 * * * *', () => pollUSGS(io));
    cron.schedule('*/3 * * * *', () => pollWeather(io));
    cron.schedule('*/5 * * * *', () => pollGDACS(io));
    cron.schedule('*/5 * * * *', () => pollNews(io));
    cron.schedule('*/10 * * * *', () => pollFIRMS(io));
    cron.schedule('*/5 * * * *', () => pollWeatherAPI(io));
}

async function processEvents(io: SocketServer, source: string, events: any[]) {
    try {
        let newEventsCount = 0;
        const newEventsArray = [];

        for (const ev of events) {
            const existing = await Event.findOne({ id: ev.id });
            if (!existing) {
                const mongoEvent = {
                    id: ev.id,
                    type: ev.type,
                    source: ev.source,
                    magnitude: ev.magnitude,
                    location: { lat: ev.latitude, lng: ev.longitude },
                    place: ev.title || ev.place,
                    depth: ev.depth,
                    timestamp: ev.timestamp,
                    severity: ev.severity,
                    additional: ev.raw
                };

                const saved = await Event.create(mongoEvent);
                newEventsCount++;
                newEventsArray.push(saved);

                const threat = analyzeEvent(saved);
                if (threat) {
                    // Threat engine handled autonomously
                }
            }
        }

        if (newEventsCount > 0) {
            console.log(`[Cron] ${source} registered ${newEventsCount} NEW events in MongoDB`);
            const frontendReady = newEventsArray.map(e => ({
                id: e.id, type: e.type, source: e.source, severity: e.severity,
                latitude: e.location.lat, longitude: e.location.lng,
                title: e.place, timestamp: e.timestamp, magnitude: e.magnitude
            }));
            io.emit('new_events', frontendReady);
        }
    } catch (err) {
        console.error(`[Cron] processEvents Error writing to DB:`, err);
    }
}

async function pollUSGS(io: SocketServer) {
    const events = await fetchEarthquakes(true);
    await processEvents(io, 'USGS', events);
}

async function pollWeather(io: SocketServer) {
    const events = await fetchWeatherAlerts();
    await processEvents(io, 'Weather.gov', events);
}

async function pollWeatherAPI(io: SocketServer) {
    const events = await fetchWeatherAPIAlerts();
    await processEvents(io, 'WeatherAPI', events);
}

async function pollGDACS(io: SocketServer) {
    const events = await fetchGDACS();
    await processEvents(io, 'GDACS', events);
}

async function pollFIRMS(io: SocketServer) {
    const events = await fetchFIRMS();
    await processEvents(io, 'FIRMS', events);
}

async function pollNews(io: SocketServer) {
    const events = await fetchGlobalNews();
    const scraped = await fetchScrapedNews();
    const merged = [...events, ...scraped];
    await processEvents(io, 'Global News & Scraper', merged);
}
