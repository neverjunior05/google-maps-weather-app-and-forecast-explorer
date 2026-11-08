/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// -------------------------------------------------------------
// Two API Keys Architecture:
// 1. PUBLIC KEY: Google Maps JavaScript API (client-side map rendering)
//    - Loaded by the browser when Google Maps initializes.
// 2. BACKEND KEY: Web Services (Google Weather, Geocoding, Places)
//    - Kept secret in backend environment and NEVER revealed to the browser.
function getBackendWebServiceApiKey(): string {
  return process.env.GOOGLE_WEATHER_API_KEY || '';
}

function getPublicMapsApiKey(): string {
  return process.env.VITE_GOOGLE_MAPS_API_KEY || '';
}

// Aliases for server-side proxy routes
const getMapsApiKey = getBackendWebServiceApiKey;
const getWeatherApiKey = getBackendWebServiceApiKey;

// Structured logger for Google Weather API calls
function logWeatherApiRequest(
  endpointName: string,
  targetUrl: string,
  status: number,
  statusText: string,
  dataOrError?: any,
  locationInfo?: Record<string, any>
) {
  const timestamp = new Date().toISOString();
  const maskedUrl = targetUrl.replace(/key=[^&]+/, 'key=***');
  const isOk = status >= 200 && status < 300;
  const isExpectedOutOfCoverage =
    (status === 400 || status === 404) &&
    (JSON.stringify(dataOrError || '').toLowerCase().includes('coverage') ||
      JSON.stringify(dataOrError || '').toLowerCase().includes('not supported') ||
      JSON.stringify(dataOrError || '').includes('NOT_FOUND'));

  const statusColor = isOk ? '\x1b[32m' : isExpectedOutOfCoverage ? '\x1b[33m' : '\x1b[31m';
  const resetColor = '\x1b[0m';
  const statusBadge = `${statusColor}[${status} ${statusText}]${resetColor}`;

  console.log(`\n================== 🌐 [GOOGLE WEATHER API REQUEST] ==================`);
  console.log(`⏱️ Timestamp : ${timestamp}`);
  console.log(`📌 Endpoint  : ${endpointName}`);
  if (locationInfo?.lat && locationInfo?.lng) {
    console.log(`📍 Location  : lat=${locationInfo.lat}, lng=${locationInfo.lng}`);
  }
  console.log(`🔗 Target URL: ${maskedUrl}`);
  console.log(`📊 Status    : ${statusBadge}`);

  if (isExpectedOutOfCoverage) {
    console.log(`ℹ️ Coverage Note: Location is outside supported coverage for ${endpointName}.`);
  } else if (!isOk) {
    console.log(`⚠️ API Response Notice (${status}): ${dataOrError?.error?.message || statusText}`);
  } else {
    const keys = Object.keys(dataOrError || {});
    console.log(`✅ Response Success: Returned keys [${keys.join(', ')}]`);
  }
  console.log(`======================================================================\n`);
}

// 1. Client Map Config
// Returns ONLY the public Maps JavaScript API key for the browser to render the map.
// The backend Web Service key is kept strictly secret on the server and never sent.
app.get('/api/weather/config', (req, res) => {
  const publicMapsKey = getPublicMapsApiKey();
  res.json({
    hasKey: !!publicMapsKey,
    apiKey: publicMapsKey,
  });
});

// 2. Current Conditions Lookup (Global coverage)
app.get('/api/weather/current', async (req, res) => {
  const { lat, lng, units = 'METRIC' } = req.query;
  const weatherKey = getWeatherApiKey();

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  const url = `https://weather.googleapis.com/v1/currentConditions:lookup?location.latitude=${lat}&location.longitude=${lng}&unitsSystem=${units}&key=${weatherKey}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    logWeatherApiRequest('currentConditions:lookup', url, response.status, response.statusText, data, { lat, lng });

    if (!response.ok) {
      return res.json({
        isUnsupportedLocation: true,
        status: response.status,
        statusText: response.statusText,
        apiStatus: response.status,
        apiError: data.error || data,
        error: data.error || data,
        endpoint: 'currentConditions:lookup',
      });
    }

    return res.json(data);
  } catch (err: any) {
    console.error('Error fetching current weather conditions:', err);
    logWeatherApiRequest('currentConditions:lookup', url, 500, 'Fetch Exception', err.message, { lat, lng });
    return res.status(500).json({ isUnsupportedLocation: true, status: 500, error: { message: 'Weather service request failed' } });
  }
});

// 3. Hourly Forecast Lookup (Global coverage)
app.get('/api/weather/forecast/hourly', async (req, res) => {
  const { lat, lng, hours = '24', units = 'METRIC' } = req.query;
  const weatherKey = getWeatherApiKey();

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  const url = `https://weather.googleapis.com/v1/forecast/hours:lookup?location.latitude=${lat}&location.longitude=${lng}&hours=${hours}&unitsSystem=${units}&key=${weatherKey}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    logWeatherApiRequest('forecast/hours:lookup', url, response.status, response.statusText, data, { lat, lng });

    if (!response.ok) {
      return res.json({
        forecastHours: [],
        status: response.status,
        statusText: response.statusText,
        apiStatus: response.status,
        apiError: data.error || data,
        error: data.error || data,
        endpoint: 'forecast/hours:lookup',
      });
    }

    return res.json(data);
  } catch (err: any) {
    console.error('Error fetching hourly weather forecast:', err);
    logWeatherApiRequest('forecast/hours:lookup', url, 500, 'Fetch Exception', err.message, { lat, lng });
    return res.status(500).json({ forecastHours: [], status: 500, error: { message: 'Hourly forecast request failed' } });
  }
});

// 4. Daily Forecast Lookup (Global coverage)
app.get('/api/weather/forecast/daily', async (req, res) => {
  const { lat, lng, days = '10', units = 'METRIC' } = req.query;
  const weatherKey = getWeatherApiKey();

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  const url = `https://weather.googleapis.com/v1/forecast/days:lookup?location.latitude=${lat}&location.longitude=${lng}&days=${days}&unitsSystem=${units}&key=${weatherKey}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    logWeatherApiRequest('forecast/days:lookup', url, response.status, response.statusText, data, { lat, lng });

    if (!response.ok) {
      return res.json({
        forecastDays: [],
        status: response.status,
        statusText: response.statusText,
        apiStatus: response.status,
        apiError: data.error || data,
        error: data.error || data,
        endpoint: 'forecast/days:lookup',
      });
    }

    return res.json(data);
  } catch (err: any) {
    console.error('Error fetching daily weather forecast:', err);
    logWeatherApiRequest('forecast/days:lookup', url, 500, 'Fetch Exception', err.message, { lat, lng });
    return res.status(500).json({ forecastDays: [], status: 500, error: { message: 'Daily forecast request failed' } });
  }
});

// 5. Minute-by-Minute Forecast Lookup (Nowcast - US & parts of Europe only)
app.get('/api/weather/forecast/minutes', async (req, res) => {
  const { lat, lng } = req.query;
  const weatherKey = getWeatherApiKey();

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  const url = `https://weather.googleapis.com/v1/forecast/minutes:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${weatherKey}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    logWeatherApiRequest('forecast/minutes:lookup', url, response.status, response.statusText, data, { lat, lng });

    if (!response.ok) {
      return res.json({
        isOutOfCoverage: true,
        endpoint: 'forecast/minutes:lookup',
        status: response.status,
        statusText: response.statusText,
        segments: [],
        error: data.error || data,
      });
    }

    return res.json(data);
  } catch (err: any) {
    console.error('Error fetching minute nowcast forecast:', err);
    logWeatherApiRequest('forecast/minutes:lookup', url, 500, 'Fetch Exception', err.message, { lat, lng });
    return res.json({ isOutOfCoverage: true, error: { message: 'Nowcast forecast request failed' }, segments: [] });
  }
});

// 6. Real-Time Weather Alerts Lookup (Global coverage)
app.get('/api/weather/alerts', async (req, res) => {
  const { lat, lng } = req.query;
  const weatherKey = getWeatherApiKey();

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  const url = `https://weather.googleapis.com/v1/publicAlerts:lookup?location.latitude=${lat}&location.longitude=${lng}&key=${weatherKey}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    logWeatherApiRequest('publicAlerts:lookup', url, response.status, response.statusText, data, { lat, lng });

    if (!response.ok) {
      return res.json({ weatherAlerts: [], apiStatus: response.status, apiError: data.error || data });
    }

    return res.json(data);
  } catch (err: any) {
    console.error('Error fetching weather alerts:', err);
    logWeatherApiRequest('publicAlerts:lookup', url, 500, 'Fetch Exception', err.message, { lat, lng });
    return res.json({ weatherAlerts: [] });
  }
});

// 7. Hourly History Weather Lookup (Past 24 hours of actual observed weather)
app.get('/api/weather/history/hourly', async (req, res) => {
  const { lat, lng, hours = '24', units = 'METRIC' } = req.query;
  const weatherKey = getWeatherApiKey();

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  const url = `https://weather.googleapis.com/v1/history/hours:lookup?location.latitude=${lat}&location.longitude=${lng}&hours=${hours}&unitsSystem=${units}&key=${weatherKey}`;

  try {
    const response = await fetch(url);
    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    logWeatherApiRequest('history/hours:lookup', url, response.status, response.statusText, data, { lat, lng, hours, units });

    if (!response.ok) {
      return res.json({
        historyHours: [],
        endpoint: 'history/hours:lookup',
        status: response.status,
        statusText: response.statusText,
        error: data.error || data,
      });
    }

    return res.json(data);
  } catch (err: any) {
    console.error('Error fetching hourly weather history:', err);
    logWeatherApiRequest('history/hours:lookup', url, 500, 'Fetch Exception', err.message, { lat, lng, hours, units });
    return res.json({ historyHours: [], error: { message: 'History weather request failed' } });
  }
});

// 7. Weather Map Tiles Proxy (US_PRECIPITATION_CURRENT / EU_PRECIPITATION_CURRENT regional)
// Endpoint: https://weather.googleapis.com/v1/mapTypes/{map_type}/mapTiles/{zoom}/{x}/{y}
const ALLOWED_MAP_TYPES = new Set(['US_PRECIPITATION_CURRENT', 'EU_PRECIPITATION_CURRENT']);

app.get('/api/weather/tiles/:mapType/:z/:x/:y', async (req, res) => {
  const { mapType, z, x, y } = req.params;
  const weatherKey = getWeatherApiKey();

  // Validate mapType against explicit allowlist to prevent SSRF
  if (!ALLOWED_MAP_TYPES.has(mapType)) {
    return res.status(400).json({ error: 'Invalid mapType' });
  }

  // Ensure zoom and tile coordinates are non-negative integer digits only
  if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
    return res.status(400).json({ error: 'Coordinates z, x, and y must be positive integers' });
  }

  const emptyPng = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64'
  );

  const tileUrl = `https://weather.googleapis.com/v1/mapTypes/${mapType}/mapTiles/${z}/${x}/${y}?key=${weatherKey}`;

  try {
    const tileResponse = await fetch(tileUrl);

    if (!tileResponse.ok) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.send(emptyPng);
    }

    const buffer = await tileResponse.arrayBuffer();
    const contentType = tileResponse.headers.get('content-type') || 'image/png';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    return res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error('Error fetching weather map tile:', err);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.send(emptyPng);
  }
});

// 8. Geocoding Proxy
app.get('/api/geocode', async (req, res) => {
  const { address } = req.query;
  const mapsKey = getMapsApiKey();

  if (!address) {
    return res.status(400).json({ error: 'address query parameter is required' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      String(address)
    )}&key=${mapsKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('Error in /api/geocode:', err);
    return res.status(500).json({ error: 'Geocoding request failed' });
  }
});

// 9. Reverse Geocoding Proxy
app.get('/api/geocode/reverse', async (req, res) => {
  const { lat, lng } = req.query;
  const mapsKey = getMapsApiKey();

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng query parameters are required' });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${mapsKey}`;
    const response = await fetch(url);
    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('Error in /api/geocode/reverse:', err);
    return res.status(500).json({ error: 'Reverse geocoding request failed' });
  }
});

// 10. Places API (New) - Nearby Search by Lat/Lng
app.all(['/api/places/nearby', '/api/places/searchNearby'], async (req, res) => {
  const lat = req.query.lat || req.body?.lat;
  const lng = req.query.lng || req.body?.lng;
  const radius = req.query.radius || req.body?.radius || 15000;
  const mapsKey = getMapsApiKey();

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng parameters are required' });
  }

  try {
    const url = 'https://places.googleapis.com/v1/places:searchNearby';
    const payload = {
      maxResultCount: 8,
      locationRestriction: {
        circle: {
          center: {
            latitude: parseFloat(String(lat)),
            longitude: parseFloat(String(lng)),
          },
          radius: parseFloat(String(radius)),
        },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': mapsKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.shortFormattedAddress,places.location,places.addressComponents,places.primaryTypeDisplayName,places.types',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error('Error in /api/places/nearby:', err);
    return res.status(500).json({ error: 'Places search request failed' });
  }
});

// Vite & Static Asset Handling
async function startServer() {
  const server = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port is already in use, retrying connection...`);
    } else {
      console.error('Server error:', err);
    }
  });

  const port = Number(process.env.PORT) || PORT;
  server.listen(port, '0.0.0.0', () => {
    console.log(`Weather Map Server running on http://0.0.0.0:${port}`);
  });
}

startServer();
