/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CurrentWeather, DailyForecast, HourlyForecast, LocationWeatherBundle, WeatherAlert, WeatherLocation, WeatherUnitSystem } from '../types/weather';

export const PRESET_LOCATIONS: WeatherLocation[] = [
  { id: 'nyc', name: 'New York', country: 'United States', region: 'New York', lat: 40.7128, lng: -74.0060, timezone: 'America/New_York' },
  { id: 'london', name: 'London', country: 'United Kingdom', region: 'Greater London', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
  { id: 'paris', name: 'Paris', country: 'France', region: 'Île-de-France', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
  { id: 'tokyo', name: 'Tokyo', country: 'Japan', region: 'Kanto', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
  { id: 'chicago', name: 'Chicago', country: 'United States', region: 'Illinois', lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago' },
  { id: 'miami', name: 'Miami', country: 'United States', region: 'Florida', lat: 25.7617, lng: -80.1918, timezone: 'America/New_York' },
  { id: 'seattle', name: 'Seattle', country: 'United States', region: 'Washington', lat: 47.6062, lng: -122.3321, timezone: 'America/Los_Angeles' },
  { id: 'sf', name: 'San Francisco', country: 'United States', region: 'California', lat: 37.7749, lng: -122.4194, timezone: 'America/Los_Angeles' },
  { id: 'berlin', name: 'Berlin', country: 'Germany', region: 'Berlin', lat: 52.5200, lng: 13.4050, timezone: 'Europe/Berlin' },
  { id: 'rome', name: 'Rome', country: 'Italy', region: 'Lazio', lat: 41.9028, lng: 12.4964, timezone: 'Europe/Rome' },
  { id: 'sydney', name: 'Sydney', country: 'Australia', region: 'NSW', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' },
];

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateRealisticWeather(
  location: WeatherLocation,
  unitSystem: WeatherUnitSystem = 'METRIC'
): LocationWeatherBundle {
  const isMetric = unitSystem === 'METRIC';
  const now = new Date();
  const seed = Math.abs(Math.round(location.lat * 100) + Math.round(location.lng * 100));
  
  // Base climate temperature based on latitude
  const latFactor = Math.cos((location.lat * Math.PI) / 180);
  const baseTempC = Math.round(24 * latFactor + (pseudoRandom(seed) * 10 - 5));
  const temp = isMetric ? baseTempC : Math.round((baseTempC * 9) / 5 + 32);
  const feelsLike = temp + (pseudoRandom(seed + 1) > 0.5 ? 2 : -2);
  
  const conditionPool = [
    { type: 'CLEAR', text: 'Clear Sky', icon: 'https://maps.gstatic.com/weather/icons/v1/sunny' },
    { type: 'PARTLY_CLOUDY', text: 'Partly Cloudy', icon: 'https://maps.gstatic.com/weather/icons/v1/partly_cloudy' },
    { type: 'MOSTLY_CLOUDY', text: 'Mostly Cloudy', icon: 'https://maps.gstatic.com/weather/icons/v1/mostly_cloudy' },
    { type: 'SCATTERED_SHOWERS', text: 'Scattered Showers', icon: 'https://maps.gstatic.com/weather/icons/v1/scattered_showers' },
    { type: 'RAIN', text: 'Light to Moderate Rain', icon: 'https://maps.gstatic.com/weather/icons/v1/rain' },
    { type: 'THUNDERSTORM', text: 'Thunderstorms', icon: 'https://maps.gstatic.com/weather/icons/v1/thunderstorms' },
  ];
  
  const condIdx = Math.floor(pseudoRandom(seed + 2) * conditionPool.length);
  const condition = conditionPool[condIdx];
  const precipProb = condition.type === 'RAIN' ? 85 : condition.type === 'SCATTERED_SHOWERS' ? 55 : condition.type === 'THUNDERSTORM' ? 90 : 15;
  const windSpeedVal = Math.round(12 + pseudoRandom(seed + 3) * 18);
  const windSpeed = isMetric ? windSpeedVal : Math.round(windSpeedVal * 0.621371);
  const humidity = Math.round(45 + pseudoRandom(seed + 4) * 45);
  const pressure = Math.round(1012 + (pseudoRandom(seed + 5) * 16 - 8));
  const uvIndex = Math.max(1, Math.min(11, Math.round(8 * latFactor * pseudoRandom(seed + 6))));
  const cloudCover = condition.type === 'CLEAR' ? 10 : condition.type === 'PARTLY_CLOUDY' ? 40 : 85;

  const current: CurrentWeather = {
    temperature: { degrees: temp, unit: isMetric ? 'CELSIUS' : 'FAHRENHEIT' },
    feelsLikeTemperature: { degrees: feelsLike, unit: isMetric ? 'CELSIUS' : 'FAHRENHEIT' },
    dewPoint: { degrees: Math.round(temp - ((100 - humidity) / 5)), unit: isMetric ? 'CELSIUS' : 'FAHRENHEIT' },
    relativeHumidity: humidity,
    windSpeed: { value: windSpeed, unit: isMetric ? 'KILOMETERS_PER_HOUR' : 'MILES_PER_HOUR' },
    windDirection: { degrees: Math.round(pseudoRandom(seed + 7) * 360), cardinal: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(pseudoRandom(seed + 7) * 8)] },
    windGust: { value: windSpeed + 8, unit: isMetric ? 'KILOMETERS_PER_HOUR' : 'MILES_PER_HOUR' },
    precipitation: {
      probability: { percent: precipProb },
      qpf: { quantity: precipProb > 50 ? +(pseudoRandom(seed + 8) * 3.5).toFixed(1) : 0, unit: isMetric ? 'MILLIMETERS' : 'INCHES' },
      type: precipProb > 50 ? 'RAIN' : 'NONE',
    },
    airPressure: { meanSeaLevelMillibars: pressure },
    cloudCover,
    uvIndex,
    visibility: { distance: isMetric ? 10 : 6.2, unit: isMetric ? 'KILOMETERS' : 'MILES' },
    weatherCondition: {
      type: condition.type,
      description: { text: condition.text },
      iconBaseUri: condition.icon,
    },
    isDaytime: true,
    currentTime: now.toISOString(),
    timeZone: { id: location.timezone || 'UTC' },
    sunAndMoon: {
      sunrise: '06:14 AM',
      sunset: '07:48 PM',
      moonPhase: 'Waxing Gibbous',
      moonrise: '03:45 PM',
      moonset: '04:12 AM',
    },
  };

  // Hourly Forecast (24 hours)
  const hourly: HourlyForecast[] = Array.from({ length: 24 }).map((_, i) => {
    const hourDate = new Date(now.getTime() + i * 3600 * 1000);
    const hour = hourDate.getHours();
    const tempDelta = Math.sin(((hour - 6) / 24) * 2 * Math.PI) * 4;
    const hTemp = Math.round(temp + tempDelta + (pseudoRandom(seed + i * 13) * 2 - 1));
    const hPrecip = Math.max(0, Math.min(100, Math.round(precipProb + Math.sin(i / 3) * 25)));
    const hCond = hPrecip > 60 ? conditionPool[4] : hPrecip > 35 ? conditionPool[3] : hour >= 6 && hour <= 20 ? conditionPool[1] : conditionPool[0];

    return {
      interval: {
        startTime: hourDate.toISOString(),
        endTime: new Date(hourDate.getTime() + 3600 * 1000).toISOString(),
      },
      displayDateTime: {
        year: hourDate.getFullYear(),
        month: hourDate.getMonth() + 1,
        day: hourDate.getDate(),
        hours: hour,
        minutes: 0,
        seconds: 0,
      },
      temperature: { degrees: hTemp },
      feelsLikeTemperature: { degrees: hTemp + 1 },
      precipitation: {
        probability: { percent: hPrecip },
        qpf: { quantity: hPrecip > 50 ? +(pseudoRandom(seed + i * 7) * 2.2).toFixed(1) : 0 },
        type: hPrecip > 50 ? 'RAIN' : 'NONE',
      },
      weatherCondition: {
        type: hCond.type,
        description: { text: hCond.text },
        iconBaseUri: hCond.icon,
      },
      windSpeed: { value: Math.round(windSpeed + (pseudoRandom(seed + i) * 6 - 3)) },
      windDirection: { cardinal: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(pseudoRandom(seed + i * 2) * 8)] },
      relativeHumidity: Math.min(100, Math.max(20, Math.round(humidity - tempDelta * 2))),
      uvIndex: hour >= 10 && hour <= 16 ? Math.round(uvIndex * (1 - Math.abs(hour - 13) / 4)) : 0,
      cloudCover: Math.round(cloudCover + (pseudoRandom(seed + i * 5) * 20 - 10)),
      isDaytime: hour >= 6 && hour <= 20,
    };
  });

  // Daily Forecast (10 days)
  const daily: DailyForecast[] = Array.from({ length: 10 }).map((_, i) => {
    const dayDate = new Date(now.getTime() + i * 86400 * 1000);
    const dayTempMax = Math.round(temp + 3 + (pseudoRandom(seed + i * 21) * 6 - 3));
    const dayTempMin = Math.round(temp - 4 + (pseudoRandom(seed + i * 31) * 4 - 2));
    const dPrecip = Math.round(Math.max(5, Math.min(95, pseudoRandom(seed + i * 41) * 100)));
    const dCond = dPrecip > 65 ? conditionPool[4] : dPrecip > 35 ? conditionPool[3] : conditionPool[Math.floor(pseudoRandom(seed + i) * 3)];

    return {
      interval: {
        startTime: dayDate.toISOString(),
        endTime: new Date(dayDate.getTime() + 86400 * 1000).toISOString(),
      },
      displayDate: {
        year: dayDate.getFullYear(),
        month: dayDate.getMonth() + 1,
        day: dayDate.getDate(),
      },
      maxTemperature: { degrees: dayTempMax },
      minTemperature: { degrees: dayTempMin },
      precipitation: {
        probability: { percent: dPrecip },
        qpf: { quantity: dPrecip > 50 ? +(pseudoRandom(seed + i) * 5.0).toFixed(1) : 0 },
      },
      daytimeForecast: {
        weatherCondition: {
          type: dCond.type,
          description: { text: dCond.text },
          iconBaseUri: dCond.icon,
        },
        relativeHumidity: humidity,
        windSpeed: { value: windSpeed },
        windDirection: { cardinal: 'SW' },
        cloudCover,
        precipitation: { probability: { percent: dPrecip } },
      },
      nighttimeForecast: {
        weatherCondition: {
          type: 'PARTLY_CLOUDY',
          description: { text: 'Partly Cloudy Night' },
          iconBaseUri: 'https://maps.gstatic.com/weather/icons/v1/partly_cloudy_night',
        },
        relativeHumidity: Math.min(100, humidity + 15),
        windSpeed: { value: Math.max(5, windSpeed - 4) },
        windDirection: { cardinal: 'W' },
        cloudCover: Math.max(10, cloudCover - 15),
        precipitation: { probability: { percent: Math.round(dPrecip * 0.7) } },
      },
      sunAndMoon: {
        sunrise: '06:14 AM',
        sunset: '07:48 PM',
        moonPhase: ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'][i % 8],
      },
    };
  });

  const alerts: WeatherAlert[] = [];
  if (precipProb >= 80) {
    alerts.push({
      alertId: `alert-${location.id}-${now.getDate()}`,
      headline: `Special Weather Statement: Moderate to Heavy Rainfall in ${location.name}`,
      description: `Meteorological radar detects localized convective precipitation cells moving across the ${location.region || location.name} metropolitan area. Localized ponding and reduced roadway visibility expected.`,
      severity: 'MODERATE',
      urgency: 'EXPECTED',
      certainty: 'LIKELY',
      effectiveTime: now.toISOString(),
      expireTime: new Date(now.getTime() + 6 * 3600 * 1000).toISOString(),
      eventDescription: 'Precipitation & Wind Advisory',
      areas: [location.name, `${location.region || location.country} Regional Corridor`],
      senderName: 'National Weather Service / Meteorological Center',
    });
  }

  return {
    location,
    current,
    hourly,
    daily,
    alerts,
    isSimulated: true,
    lastUpdated: Date.now(),
  };
}
