import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger.js';

interface DataSourceConfig {
  name: string;
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

const dataSources: Record<string, DataSourceConfig> = {
  usgs: {
    name: 'USGS',
    baseURL: process.env.USGS_EARTHQUAKE_API || 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary',
    timeout: 10000,
  },
  weatherGov: {
    name: 'Weather.gov',
    baseURL: process.env.WEATHER_GOV_API || 'https://api.weather.gov',
    timeout: 10000,
    headers: {
      'User-Agent': process.env.WEATHER_GOV_USER_AGENT || 'disaster-dashboard/1.0',
      'Accept': 'application/geo+json',
    },
  },
  gdacs: {
    name: 'GDACS',
    baseURL: process.env.GDACS_API || 'https://www.gdacs.org/gdacsapi/api/events/geteventlist',
    timeout: 15000,
  },
  firms: {
    name: 'FIRMS',
    baseURL: process.env.FIRMS_API || 'https://firms.modaps.eosdis.nasa.gov/api/area/csv',
    timeout: 30000,
  },
  openaq: {
    name: 'OpenAQ',
    baseURL: process.env.OPENAQ_API || 'https://api.openaq.org/v2',
    timeout: 10000,
    headers: {
      'X-API-Key': process.env.OPENAQ_API_KEY || '',
    },
  },
  openweather: {
    name: 'OpenWeatherMap',
    baseURL: process.env.OPENWEATHER_API || 'https://api.openweathermap.org/data/2.5',
    timeout: 10000,
  },
  nominatim: {
    name: 'Nominatim',
    baseURL: 'https://nominatim.openstreetmap.org',
    timeout: 10000,
    headers: {
      'User-Agent': process.env.NOMINATIM_USER_AGENT || 'disaster-dashboard/1.0',
    },
  },
  overpass: {
    name: 'Overpass',
    baseURL: process.env.OVERPASS_API || 'https://overpass-api.de/api/interpreter',
    timeout: 30000,
  },
};

const clients: Record<string, AxiosInstance> = {};

Object.entries(dataSources).forEach(([key, config]) => {
  clients[key] = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    headers: config.headers,
    params: config.params,
  });

  // Request interceptor for logging
  clients[key].interceptors.request.use(
    (config) => {
      logger.debug(`${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor for error handling
  clients[key].interceptors.response.use(
    (response) => response,
    (error) => {
      logger.error(`${config.name} API Error:`, error.message);
      return Promise.reject(error);
    }
  );
});

export function getClient(source: keyof typeof clients): AxiosInstance {
  const client = clients[source];
  if (!client) {
    throw new Error(`Unknown data source: ${source}`);
  }
  return client;
}

export { dataSources };
export type { DataSourceConfig };