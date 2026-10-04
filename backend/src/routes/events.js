import express from 'express';
import { Router } from 'express';
import { fetchUSGSEarthquakes } from '../services/usgs.js';
import { fetchWeatherAlerts } from '../services/weather.js';
import { fetchGDACSEvents } from '../services/gdacs.js';
import { fetchFIRMSFires } from '../services/firms.js';
import { fetchOpenAQData } from '../services/openaq.js';
import { getCachedEvents, setCachedEvents } from '../utils/cache.js';
import { Event } from '../models/Event.js';
import { Alert } from '../models/Alert.js';

const router = Router();

// Get live events from all sources
router.get('/live', async (req, res) => {
  try {
    const cached = getCachedEvents();
    if (cached && cached.length > 0) {
      return res.json({ events: cached, cached: true, timestamp: new Date().toISOString() });
    }

    const [earthquakes, weatherAlerts, gdacsEvents, fires, airQuality] = await Promise.allSettled([
      fetchUSGSEarthquakes(),
      fetchWeatherAlerts(),
      fetchGDACSEvents(),
      fetchFIRMSFires(),
      fetchOpenAQData()
    ]);

    const events = [
      ...(earthquakes.status === 'fulfilled' ? earthquakes.value : []),
      ...(weatherAlerts.status === 'fulfilled' ? weatherAlerts.value : []),
      ...(gdacsEvents.status === 'fulfilled' ? gdacsEvents.value : []),
      ...(fires.status === 'fulfilled' ? fires.value : []),
      ...(airQuality.status === 'fulfilled' ? airQuality.value : [])
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setCachedEvents(events);
    
    // Also store in database
    for (const event of events) {
      try {
        const existing = await Event.findOne({ source: event.source, sourceId: event.sourceId });
        if (!existing) {
          await Event.create(event);
        }
      } catch (error) {
        console.error('Error storing event:', error.message);
      }
    }

    res.json({ events, cached: false, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching live events:', error);
    res.status(500).json({ error: 'Failed to fetch live events' });
  }
});

// Get earthquakes from USGS
router.get('/earthquakes', async (req, res) => {
  try {
    const earthquakes = await fetchUSGSEarthquakes();
    res.json({ earthquakes, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch earthquakes' });
  }
});

// Get weather alerts
router.get('/weather-alerts', async (req, res) => {
  try {
    const alerts = await fetchWeatherAlerts();
    res.json({ alerts, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weather alerts' });
  }
});

// Get GDACS events
router.get('/gdacs', async (req, res) => {
  try {
    const events = await fetchGDACSEvents();
    res.json({ events, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch GDACS events' });
  }
});

// Get fires
router.get('/fires', async (req, res) => {
  try {
    const fires = await fetchFIRMSFires();
    res.json({ fires, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch fire data' });
  }
});

// Get air quality
router.get('/air-quality', async (req, res) => {
  try {
    const data = await fetchOpenAQData();
    res.json({ data, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch air quality data' });
  }
});

// Get stored events from database
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      severity, 
      source, 
      limit = 100, 
      page = 1,
      startDate,
      endDate,
    } = req.query;

    const query = {};
    if (type) query.disasterType = type;
    if (severity) query.severity = severity;
    if (source) query.source = source;
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    const events = await Event.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Event.countDocuments(query);

    res.json({
      events,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ event, timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

export { router as eventsRouter };