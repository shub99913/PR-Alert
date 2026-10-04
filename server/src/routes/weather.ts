import express from 'express';
import axios from 'axios';
import { config } from '../config.js';

const router = express.Router();

router.get('/current', async (req, res) => {
    try {
        const lat = req.query.lat || '39.8283';
        const lon = req.query.lon || '-98.5795';

        if (!process.env.WEATHER_API_KEY) {
            return res.status(503).json({ error: 'WeatherAPI Key not configured' });
        }

        const url = `http://api.weatherapi.com/v1/current.json?key=${process.env.WEATHER_API_KEY}&q=${lat},${lon}`;
        const { data } = await axios.get(url);

        res.json({
            temp: data.current.temp_c,
            humidity: data.current.humidity,
            wind: data.current.wind_kph,
            windDeg: data.current.wind_degree,
            description: data.current.condition.text
        });
    } catch (err: any) {
        console.error('[WeatherAPI] Fetch error:', err.message);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

export default router;
