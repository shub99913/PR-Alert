// USGS Earthquake Service
import axios from 'axios';

const USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson';

export async function fetchUSGSEarthquakes() {
  try {
    const response = await axios.get(USGS_URL, {
      timeout: 30000,
      headers: { 'Accept': 'application/json' },
    });

    if (!response.data?.features) {
      console.warn('Invalid USGS response: missing features');
      return [];
    }

    return response.data.features.map(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates;
      
      if (!coords || coords.length < 2) return null;

      const [lon, lat, depth] = coords;
      const magnitude = props.mag ?? 0;
      const time = props.time ? new Date(props.time) : new Date();
      
      let severity = 'info';
      if (magnitude >= 7.0) severity = 'emergency';
      else if (magnitude >= 6.0) severity = 'alert';
      else if (magnitude >= 5.0) severity = 'warning';
      else if (magnitude >= 4.0) severity = 'info';

      let confidence = 0.9;
      if (props.status === 'reviewed') confidence = 0.95;
      else if (props.status === 'automatic') confidence = 0.8;
      if (props.gap && props.gap > 180) confidence -= 0.1;
      if (props.rms && props.rms > 1.0) confidence -= 0.1;
      if (props.nst && props.nst < 6) confidence -= 0.1;
      confidence = Math.max(0.3, Math.min(1.0, confidence));

      const affectedRadiusKm = calculateAffectedRadius(magnitude);

      return {
        source: 'usgs',
        sourceId: feature.id,
        disasterType: 'earthquake',
        severity,
        confidence,
        location: { type: 'Point', coordinates: [lon, lat] },
        properties: {
          magnitude,
          depth: depth ?? null,
          place: props.place,
          type: props.type,
          status: props.status,
          nst: props.nst,
          gap: props.gap,
          rms: props.rms,
          net: props.net,
          id: props.ids?.split(',')[0] || feature.id,
          affectedRadiusKm,
          mmi: props.mmi,
          cdi: props.cdi,
          alert: props.alert,
          tsunami: props.tsunami ?? 0,
        },
        timestamp: time,
        receivedAt: new Date(),
        deduplicationKey: `usgs:earthquake:${lat.toFixed(2)}:${lon.toFixed(2)}:${Math.floor(time.getTime() / 3600000)}:${magnitude.toFixed(1)}`,
      };
    }).filter(Boolean);
  } catch (error) {
    console.error('Error fetching USGS earthquakes:', error.message);
    return [];
  }
}

function calculateAffectedRadius(magnitude) {
  if (magnitude < 4.0) return 10;
  if (magnitude < 5.0) return 20;
  if (magnitude < 6.0) return 50;
  if (magnitude < 7.0) return 100;
  if (magnitude < 8.0) return 200;
  return 300;
}