// Polling Jobs for Ingestion Framework
import { fetchUSGSEarthquakes } from '../services/usgs.js';
import { fetchWeatherAlerts } from '../services/weather.js';
import { fetchGDACSEvents } from '../services/gdacs.js';
import { fetchFIRMSFires } from '../services/firms.js';
import { fetchOpenAQData } from '../services/openaq.js';
import { getCachedEvents, setCachedEvents } from '../utils/cache.js';
import { Event } from '../models/Event.js';
import { Alert } from '../models/Alert.js';

const POLL_INTERVALS = {
  usgs: 5 * 60 * 1000,      // 5 minutes
  weather: 10 * 60 * 1000,  // 10 minutes
  gdacs: 15 * 60 * 1000,    // 15 minutes
  firms: 60 * 60 * 1000,    // 1 hour
  openaq: 30 * 60 * 1000,   // 30 minutes
};

const timers = {};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function processAndStoreEvents(events, io) {
  if (!events || events.length === 0) return 0;
  
  let stored = 0;
  for (const event of events) {
    try {
      // Check for duplicate
      const existing = await Event.findOne({ 
        source: event.source, 
        sourceId: event.sourceId 
      });
      
      if (!existing) {
        await Event.create(event);
        stored++;
        
        // Emit real-time event
        if (io) {
          io.emit('event:new', event);
        }
      }
    } catch (error) {
      console.error('Error storing event:', error.message);
    }
  }
  
  return stored;
}

async function pollUSGS(io) {
  console.log('[Poll] Fetching USGS earthquakes...');
  const events = await fetchUSGSEarthquakes();
  const stored = await processAndStoreEvents(events, io);
  console.log(`[Poll] USGS: ${events.length} fetched, ${stored} stored`);
}

async function pollWeather(io) {
  console.log('[Poll] Fetching weather alerts...');
  const events = await fetchWeatherAlerts();
  const stored = await processAndStoreEvents(events, io);
  console.log(`[Poll] Weather: ${events.length} fetched, ${stored} stored`);
}

async function pollGDACS(io) {
  console.log('[Poll] Fetching GDACS events...');
  const events = await fetchGDACSEvents();
  const stored = await processAndStoreEvents(events, io);
  console.log(`[Poll] GDACS: ${events.length} fetched, ${stored} stored`);
}

async function pollFIRMS(io) {
  console.log('[Poll] Fetching FIRMS fires...');
  const events = await fetchFIRMSFires();
  const stored = await processAndStoreEvents(events, io);
  console.log(`[Poll] FIRMS: ${events.length} fetched, ${stored} stored`);
}

async function pollOpenAQ(io) {
  console.log('[Poll] Fetching OpenAQ data...');
  const events = await fetchOpenAQData();
  const stored = await processAndStoreEvents(events, io);
  console.log(`[Poll] OpenAQ: ${events.length} fetched, ${stored} stored`);
}

async function runAllPolls(io) {
  await Promise.allSettled([
    pollUSGS(io),
    pollWeather(io),
    pollGDACS(io),
    pollFIRMS(io),
    pollOpenAQ(io),
  ]);
}

export function startPollingJobs(io) {
  console.log('🔄 Starting polling jobs...');
  
  // Initial run
  runAllPolls(io);
  
  // Schedule recurring polls
  timers.usgs = setInterval(() => pollUSGS(io), POLL_INTERVALS.usgs);
  timers.weather = setInterval(() => pollWeather(io), POLL_INTERVALS.weather);
  timers.gdacs = setInterval(() => pollGDACS(io), POLL_INTERVALS.gdacs);
  timers.firms = setInterval(() => pollFIRMS(io), POLL_INTERVALS.firms);
  timers.openaq = setInterval(() => pollOpenAQ(io), POLL_INTERVALS.openaq);
  
  console.log('✅ Polling jobs started');
}

export function stopPollingJobs() {
  Object.values(timers).forEach(timer => clearInterval(timer));
  console.log('🛑 Polling jobs stopped');
}

export function getPollingStatus() {
  return {
    running: Object.keys(timers).length > 0,
    intervals: POLL_INTERVALS,
    activeJobs: Object.keys(timers),
  };
}