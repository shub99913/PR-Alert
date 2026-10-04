/**
 * PR-Alert Core Configuration
 * Standalone disaster warning system - no government dependencies
 */

import { z } from 'zod';

export const configSchema = z.object({
    // Server
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5002),
    CLIENT_URL: z.string().url().default('http://localhost:3000'),

    // Database
    MONGODB_URI: z.string().default('mongodb://localhost:27017/pr-alert'),

    // Redis (for caching and queues)
    REDIS_URL: z.string().url().default('redis://localhost:6379'),

    // External APIs
    USGS_URL: z.string().url().default('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson'),
    GDACS_URL: z.string().url().default('https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH'),
    FIRMS_MAP_KEY: z.string().optional(),
    OPENWEATHER_API_KEY: z.string().optional(),
    OPENWEATHER_API_URL: z.string().url().default('https://api.openweathermap.org/data/2.5'),

    // Alerting & Notifications
    TWILIO_ACCOUNT_SID: z.string().optional(),
    TWILIO_AUTH_TOKEN: z.string().optional(),
    TWILIO_PHONE_NUMBER: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
    SENDGRID_FROM_EMAIL: z.string().email().default('alerts@pr-alert.local'),
    FCM_SERVER_KEY: z.string().optional(),

    // Social Media
    TWITTER_BEARER_TOKEN: z.string().optional(),

    // ML Service
    ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),
    ML_SERVICE_API_KEY: z.string().optional(),

    // Feature Flags
    ENABLE_REAL_DISPATCH: z.coerce.boolean().default(false),
    ENABLE_ML_INFERENCE: z.coerce.boolean().default(false),
    ENABLE_CROWD_REPORTS: z.coerce.boolean().default(true),

    // Logging
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function loadConfig(): Config {
    if (cachedConfig) return cachedConfig;

    const parsed = configSchema.safeParse(process.env);
    if (!parsed.success) {
        console.warn('[Config] Validation warnings:', parsed.error.flatten().fieldErrors);
    }

    cachedConfig = parsed.data;
    return cachedConfig;
}

export const config = loadConfig();