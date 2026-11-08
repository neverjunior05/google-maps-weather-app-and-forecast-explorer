/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CurrentWeather, DailyForecast, HourlyForecast, MinuteForecast, MinuteNowcastBundle, LocationWeatherBundle, WeatherAlert, WeatherLocation, WeatherUnitSystem } from '../types/weather';
import { generateRealisticWeather, PRESET_LOCATIONS } from '../utils/mockWeatherData';

export interface WeatherConfig {
  hasKey: boolean;
  apiKey: string | null;
}

export async function fetchWeatherConfig(): Promise<WeatherConfig> {
  try {
    const res = await fetch('/api/weather/config');
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Could not fetch server weather config:', e);
  }
  const clientKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  return {
    hasKey: !!clientKey,
    apiKey: clientKey,
  };
}

export async function fetchCompleteWeather(
  location: WeatherLocation,
  unitSystem: WeatherUnitSystem = 'METRIC'
): Promise<LocationWeatherBundle> {
  const { lat, lng } = location;

  console.group(
    `%c🌐 [Google Weather API] Fetching weather for ${location.name} (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
    'color: #0284c7; font-weight: bold; padding: 2px 4px; background: #f0f9ff; border-radius: 4px; border: 1px solid #bae6fd;'
  );

  try {
    const [currRes, hourlyRes, historyRes, dailyRes, alertsRes, minutesRes] = await Promise.allSettled([
      fetch(`/api/weather/current?lat=${lat}&lng=${lng}&units=${unitSystem}`).then((r) => r.json()),
      fetch(`/api/weather/forecast/hourly?lat=${lat}&lng=${lng}&hours=24&units=${unitSystem}`).then((r) => r.json()),
      fetch(`/api/weather/history/hourly?lat=${lat}&lng=${lng}&hours=24&units=${unitSystem}`).then((r) => r.json()),
      fetch(`/api/weather/forecast/daily?lat=${lat}&lng=${lng}&days=10&units=${unitSystem}`).then((r) => r.json()),
      fetch(`/api/weather/alerts?lat=${lat}&lng=${lng}`).then((r) => r.json()),
      fetch(`/api/weather/forecast/minutes?lat=${lat}&lng=${lng}`).then((r) => r.json()),
    ]);

    const currData = currRes.status === 'fulfilled' ? currRes.value : null;
    const hourlyData = hourlyRes.status === 'fulfilled' ? hourlyRes.value : null;
    const historyData = historyRes.status === 'fulfilled' ? historyRes.value : null;
    const dailyData = dailyRes.status === 'fulfilled' ? dailyRes.value : null;
    const alertsData = alertsRes.status === 'fulfilled' ? alertsRes.value : null;
    const minutesData = minutesRes.status === 'fulfilled' ? minutesRes.value : null;

    const isMinutesOutOfCoverage = !!minutesData?.isOutOfCoverage || minutesData?.status === 400;
    const isRadarSupported =
      (lat >= 24 && lat <= 50 && lng >= -125 && lng <= -66) || // US approx bounds
      (lat >= 34 && lat <= 72 && lng >= -25 && lng <= 45); // EU approx bounds

    console.log(
      '%c1. Current Conditions (Global):',
      'font-weight: bold; color: #0369a1;',
      `https://weather.googleapis.com/v1/currentConditions:lookup?location.latitude=${lat}&location.longitude=${lng}&unitsSystem=${unitSystem}`,
      currData
    );

    console.log(
      '%c2. Hourly Forecast (Global):',
      'font-weight: bold; color: #0369a1;',
      `https://weather.googleapis.com/v1/forecast/hours:lookup?location.latitude=${lat}&location.longitude=${lng}&hours=24&unitsSystem=${unitSystem}`,
      hourlyData
    );

    console.log(
      '%c3. Hourly History Past Weather (Global):',
      'font-weight: bold; color: #0369a1;',
      `https://weather.googleapis.com/v1/history/hours:lookup?location.latitude=${lat}&location.longitude=${lng}&hours=24&unitsSystem=${unitSystem}`,
      historyData
    );

    console.log(
      '%c4. Daily 10-Day Forecast (Global):',
      'font-weight: bold; color: #0369a1;',
      `https://weather.googleapis.com/v1/forecast/days:lookup?location.latitude=${lat}&location.longitude=${lng}&days=10&unitsSystem=${unitSystem}`,
      dailyData
    );

    console.log(
      '%c5. Minute Nowcast (US & EU only):',
      isMinutesOutOfCoverage ? 'font-weight: bold; color: #d97706;' : 'font-weight: bold; color: #059669;',
      `https://weather.googleapis.com/v1/forecast/minutes:lookup?location.latitude=${lat}&location.longitude=${lng}`,
      isMinutesOutOfCoverage
        ? { status: 'OUT_OF_COVERAGE (HTTP 400)', note: 'Minute-by-minute nowcast is only supported in US and Europe.', raw: minutesData }
        : minutesData
    );

    console.groupEnd();

    // Check if the API explicitly returned 404 or unsupported location error
    const isUnsupported =
      currData?.apiStatus === 404 ||
      currData?.status === 404 ||
      currData?.error?.code === 404 ||
      currData?.apiError?.code === 404 ||
      currData?.apiError?.status === 'NOT_FOUND' ||
      (typeof currData?.apiError?.message === 'string' && currData.apiError.message.toLowerCase().includes('not supported')) ||
      (typeof currData?.error?.message === 'string' && currData.error.message.toLowerCase().includes('not supported'));

    if (isUnsupported) {
      const errorMsg =
        currData?.apiError?.message ||
        currData?.error?.message ||
        'Information is not supported for this location by Google Maps Weather API. Please select a supported location.';

      return {
        location,
        current: undefined,
        hourly: [],
        historyHours: [],
        daily: [],
        alerts: [],
        minutes: undefined,
        isUnsupportedLocation: true,
        errorMessage: errorMsg,
        coverage: {
          minutesForecastSupported: false,
          radarTilesSupported: false,
          isOutOfCoverage: true,
          notes: errorMsg,
        },
        isSimulated: false,
        lastUpdated: Date.now(),
      };
    }

    // Check if API returned live Google Maps Weather API objects
    if (currData && !currData.error && currData.temperature) {
      const current: CurrentWeather = currData;
      const hourly: HourlyForecast[] = hourlyData?.forecastHours || [];
      const historyHours: HourlyForecast[] = historyData?.historyHours || [];
      const daily: DailyForecast[] = dailyData?.forecastDays || [];
      const alerts: WeatherAlert[] = alertsData?.weatherAlerts || [];
      
      // Parse Google Maps Weather forecast/minutes:lookup response (6-hour nowcast prediction timeframe)
      const rawSegments =
        minutesData?.segments ||
        minutesData?.forecastMinutes ||
        minutesData?.minutes ||
        minutesData?.minuteForecasts;

      let minutes: MinuteForecast[] | undefined = undefined;
      let minuteNowcast: MinuteNowcastBundle | undefined = undefined;

      if (!isMinutesOutOfCoverage && Array.isArray(rawSegments) && rawSegments.length > 0) {
        const normalizedList: MinuteForecast[] = [];
        rawSegments.forEach((seg: any) => {
          const prob = typeof seg.probability === 'number'
            ? seg.probability
            : (seg.precipitation?.probability?.percent ?? seg.probability?.percent ?? 0);

          const qpfVal = typeof seg.qpf === 'object' && seg.qpf !== null
            ? (seg.qpf.quantity ?? 0)
            : (typeof seg.precipitation?.qpf?.quantity === 'number' ? seg.precipitation.qpf.quantity : (typeof seg.qpf === 'number' ? seg.qpf : 0));

          const qpfUnit = typeof seg.qpf === 'object' && seg.qpf !== null
            ? (seg.qpf.unit ?? 'MILLIMETERS')
            : (seg.precipitation?.qpf?.unit ?? 'MILLIMETERS');

          const snowVal = typeof seg.snowfallAmount === 'object' && seg.snowfallAmount !== null
            ? (seg.snowfallAmount.quantity ?? 0)
            : 0;

          const snowUnit = typeof seg.snowfallAmount === 'object' && seg.snowfallAmount !== null
            ? (seg.snowfallAmount.unit ?? 'MILLIMETERS')
            : 'MILLIMETERS';

          const segType = seg.type || seg.precipitation?.type || (prob > 0 ? 'RAIN' : 'NONE');
          const cleanType = segType;
          const segIntensity = seg.intensity || (prob > 0 ? 'MODERATE' : 'NO_INTENSITY');

          const startTime = seg.timeFrame?.startTime || seg.interval?.startTime;
          const endTime = seg.timeFrame?.endTime || seg.interval?.endTime;

          const item: MinuteForecast = {
            interval: { startTime, endTime },
            timeFrame: { startTime, endTime },
            probability: prob,
            qpf: { quantity: qpfVal, unit: qpfUnit },
            snowfallAmount: { quantity: snowVal, unit: snowUnit },
            type: cleanType,
            intensity: segIntensity,
            precipitation: {
              probability: { percent: prob },
              qpf: { quantity: qpfVal, unit: qpfUnit },
              type: cleanType,
              intensity: segIntensity,
            },
          };

          normalizedList.push(item);
        });

        minutes = normalizedList;
        minuteNowcast = {
          overallPredictionTimeframe: minutesData?.overallPredictionTimeframe,
          timeZone: minutesData?.timeZone,
          segments: normalizedList,
        };
      }

      return {
        location,
        current,
        hourly,
        historyHours,
        daily,
        alerts,
        minutes,
        minuteNowcast,
        coverage: {
          minutesForecastSupported: !isMinutesOutOfCoverage,
          radarTilesSupported: isRadarSupported,
          isOutOfCoverage: isMinutesOutOfCoverage && !isRadarSupported,
          notes: isMinutesOutOfCoverage
            ? 'Minute-by-minute nowcast and high-res radar tiles are currently restricted to US & EU regions. Global hourly and 10-day forecasts are fully active.'
            : undefined,
        },
        isSimulated: false,
        lastUpdated: Date.now(),
      };
    }
  } catch (err: any) {
    console.warn('Weather API request error:', err);
    console.groupEnd();
  }

  // If there is an API error or unsupported location, return error bundle
  return {
    location,
    current: undefined,
    hourly: [],
    daily: [],
    alerts: [],
    minutes: undefined,
    isUnsupportedLocation: true,
    errorMessage: 'No meteorological data returned for this location by Google Maps Weather API.',
    coverage: {
      minutesForecastSupported: false,
      radarTilesSupported: false,
      isOutOfCoverage: true,
      notes: 'Out of coverage or unsupported by Google Maps Weather API.',
    },
    isSimulated: false,
    lastUpdated: Date.now(),
  };
}

export async function geocodeSearch(query: string): Promise<WeatherLocation | null> {
  if (!query || query.trim().length === 0) return null;

  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const parts = item.formatted_address.split(',').map((s: string) => s.trim());
        const name = parts[0] || query;
        const country = parts[parts.length - 1] || '';
        const region = parts.length > 2 ? parts[1] : undefined;

        return {
          id: `loc-${item.geometry.location.lat.toFixed(4)}-${item.geometry.location.lng.toFixed(4)}`,
          name,
          country,
          region,
          lat: item.geometry.location.lat,
          lng: item.geometry.location.lng,
        };
      }
    }
  } catch (e) {
    console.warn('Geocoding fetch failed:', e);
  }

  // Fallback to preset search match
  const q = query.toLowerCase();
  const found = PRESET_LOCATIONS.find(
    (l) => l.name.toLowerCase().includes(q) || l.country.toLowerCase().includes(q) || (l.region && l.region.toLowerCase().includes(q))
  );

  return found || null;
}

export async function fetchPlaceDetails(
  placeId: string,
  placesLib?: any
): Promise<WeatherLocation | null> {
  try {
    if (placesLib?.Place) {
      const place = new placesLib.Place({ id: placeId });
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents', 'types', 'id'],
      });

      const lat = place.location?.lat();
      const lng = place.location?.lng();

      if (lat !== undefined && lng !== undefined) {
        let city = '';
        let region = '';
        let country = '';

        for (const comp of place.addressComponents || []) {
          if (comp.types.includes('locality') || comp.types.includes('postal_town') || comp.types.includes('sublocality')) {
            city = comp.longText || comp.shortText;
          }
          if (comp.types.includes('administrative_area_level_1')) {
            region = comp.shortText || comp.longText;
          }
          if (comp.types.includes('country')) {
            country = comp.longText || comp.shortText;
          }
        }

        const name = place.displayName || city || (place.formattedAddress ? place.formattedAddress.split(',')[0] : 'Selected Location');

        return {
          id: `place-${placeId}`,
          name,
          country: country || (place.formattedAddress ? place.formattedAddress.split(',').pop()?.trim() : ''),
          region: region || undefined,
          lat,
          lng,
        };
      }
    }
  } catch (err) {
    console.warn('Place.fetchFields error:', err);
  }

  // Fallback to server geocode proxy
  try {
    const res = await fetch(`/api/geocode?address=${encodeURIComponent(placeId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const lat = item.geometry?.location?.lat;
        const lng = item.geometry?.location?.lng;
        if (lat !== undefined && lng !== undefined) {
          let city = '';
          let region = '';
          let country = '';
          for (const comp of item.address_components || []) {
            if (comp.types.includes('locality') || comp.types.includes('postal_town')) {
              city = comp.long_name;
            }
            if (comp.types.includes('administrative_area_level_1')) {
              region = comp.short_name || comp.long_name;
            }
            if (comp.types.includes('country')) {
              country = comp.long_name;
            }
          }
          const parts = item.formatted_address ? item.formatted_address.split(',').map((s: string) => s.trim()) : [];
          return {
            id: `place-${placeId}`,
            name: city || parts[0] || item.formatted_address,
            country: country || (parts.length > 0 ? parts[parts.length - 1] : ''),
            region: region || (parts.length > 2 ? parts[1] : undefined),
            lat,
            lng,
          };
        }
      }
    }
  } catch (e) {
    console.warn('Geocode fallback error:', e);
  }

  return null;
}

/**
 * Search and resolve real place name on map click using Places API (New) searchNearby
 */
export async function searchPlaceByCoordinates(
  lat: number,
  lng: number,
  placesLib?: any
): Promise<WeatherLocation> {
  // 1. Try client-side Places API (New) Place.searchNearby if available
  if (placesLib?.Place?.searchNearby) {
    try {
      const { places } = await placesLib.Place.searchNearby({
        fields: [
          'id',
          'displayName',
          'formattedAddress',
          'shortFormattedAddress',
          'location',
          'addressComponents',
          'types',
          'primaryTypeDisplayName',
        ],
        locationRestriction: {
          center: { lat, lng },
          radius: 15000,
        },
        maxResultCount: 8,
      });

      if (places && places.length > 0) {
        // Find the best locality/city/town/place from results
        for (const place of places) {
          let city = '';
          let region = '';
          let country = '';

          for (const comp of place.addressComponents || []) {
            if (
              comp.types?.includes('locality') ||
              comp.types?.includes('postal_town') ||
              comp.types?.includes('sublocality_level_1') ||
              comp.types?.includes('sublocality')
            ) {
              city = comp.longText || comp.shortText || '';
            }
            if (comp.types?.includes('administrative_area_level_1')) {
              region = comp.shortText || comp.longText || '';
            }
            if (comp.types?.includes('country')) {
              country = comp.longText || comp.shortText || '';
            }
          }

          const placeDisplayName =
            typeof place.displayName === 'object' && place.displayName !== null
              ? (place.displayName as any).text
              : place.displayName;

          const chosenName =
            city ||
            placeDisplayName ||
            (place.shortFormattedAddress ? place.shortFormattedAddress.split(',')[0] : '') ||
            (place.formattedAddress ? place.formattedAddress.split(',')[0] : '');

          if (chosenName) {
            return {
              id: place.id ? `place-${place.id}` : `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
              name: chosenName,
              country: country || (place.formattedAddress ? place.formattedAddress.split(',').pop()?.trim() : ''),
              region: region || undefined,
              lat,
              lng,
            };
          }
        }
      }
    } catch (clientErr) {
      console.debug('Client-side Places API (New) searchNearby error, falling back to server proxy:', clientErr);
    }
  }

  // 2. Try server-side Places API (New) nearby proxy
  try {
    const res = await fetch(`/api/places/nearby?lat=${lat}&lng=${lng}&radius=15000`);
    if (res.ok) {
      const data = await res.json();
      const places = data.places || [];
      if (Array.isArray(places) && places.length > 0) {
        for (const p of places) {
          let city = '';
          let region = '';
          let country = '';

          for (const comp of p.addressComponents || []) {
            const types = comp.types || [];
            if (
              types.includes('locality') ||
              types.includes('postal_town') ||
              types.includes('sublocality_level_1') ||
              types.includes('sublocality')
            ) {
              city = comp.longText || comp.shortText || '';
            }
            if (types.includes('administrative_area_level_1')) {
              region = comp.shortText || comp.longText || '';
            }
            if (types.includes('country')) {
              country = comp.longText || comp.shortText || '';
            }
          }

          const placeDisplayName = p.displayName?.text || p.displayName;
          const chosenName =
            city ||
            placeDisplayName ||
            (p.shortFormattedAddress ? p.shortFormattedAddress.split(',')[0] : '') ||
            (p.formattedAddress ? p.formattedAddress.split(',')[0] : '');

          if (chosenName) {
            return {
              id: p.id ? `place-${p.id}` : `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
              name: chosenName,
              country: country || (p.formattedAddress ? p.formattedAddress.split(',').pop()?.trim() : ''),
              region: region || undefined,
              lat,
              lng,
            };
          }
        }
      }
    }
  } catch (serverPlacesErr) {
    console.warn('Server Places API (New) nearby search error:', serverPlacesErr);
  }

  // 3. Fallback to Reverse Geocoding
  return reverseGeocode(lat, lng);
}

export async function reverseGeocode(lat: number, lng: number): Promise<WeatherLocation> {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        let city = '';
        let region = '';
        let country = '';

        for (const comp of item.address_components || []) {
          if (comp.types.includes('locality') || comp.types.includes('postal_town') || comp.types.includes('sublocality')) {
            city = comp.long_name;
          }
          if (comp.types.includes('administrative_area_level_1')) {
            region = comp.short_name || comp.long_name;
          }
          if (comp.types.includes('country')) {
            country = comp.long_name;
          }
        }

        const parts = item.formatted_address ? item.formatted_address.split(',').map((s: string) => s.trim()) : [];
        const name = city || parts[0] || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

        return {
          id: item.place_id ? `place-${item.place_id}` : `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
          name,
          country: country || (parts.length > 0 ? parts[parts.length - 1] : ''),
          region: region || (parts.length > 2 ? parts[1] : undefined),
          lat,
          lng,
        };
      }
    }
  } catch (e) {
    console.warn('Reverse geocoding failed:', e);
  }

  return {
    id: `loc-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    name: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
    country: '',
    lat,
    lng,
  };
}
