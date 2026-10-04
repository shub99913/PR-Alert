// Simple in-memory cache for events
let eventsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

export function getCachedEvents() {
  if (eventsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return eventsCache;
  }
  return null;
}

export function setCachedEvents(events) {
  eventsCache = events;
  cacheTimestamp = Date.now();
}

export function clearCache() {
  eventsCache = null;
  cacheTimestamp = 0;
}

export function getCacheStats() {
  return {
    hasCache: !!eventsCache,
    age: eventsCache ? Date.now() - cacheTimestamp : null,
    ttl: CACHE_TTL,
  };
}