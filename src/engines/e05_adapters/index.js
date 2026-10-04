
/**
 * E05: Source Adapters Index
 * Exports all available data source adapters
 */

import usgsAdapter from './UsgsAdapter';
import openweatherAdapter from './OpenweatherAdapter';
import gdacsAdapter from './GdacsAdapter';
// Import other adapters as they are created
// import nasafirmsAdapter from './NasafirmsAdapter';
// import imdAdapter from './ImdAdapter';
// etc.

export {
  usgsAdapter,
  openweatherAdapter,
  gdacsAdapter
  // other adapters
};

// Utility function to get adapter by source ID
export function getAdapterBySourceId(sourceId) {
  const adapters = {
    usgs: usgsAdapter,
    openweather: openweatherAdapter,
    gdacs: gdacsAdapter
    // Add others here
  };
  
  return adapters[sourceId] || null;
}

// Utility function to get all adapters
export function getAllAdapters() {
  return [
    usgsAdapter,
    openweatherAdapter,
    gdacsAdapter
    // Add others here
  ];
}
