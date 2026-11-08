/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

export type WeatherUnitSystem = 'METRIC' | 'IMPERIAL';

export type WeatherMapType = 'US_PRECIPITATION_CURRENT' | 'EU_PRECIPITATION_CURRENT';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface WeatherCondition {
  iconBaseUri?: string;
  description?: {
    text?: string;
    languageCode?: string;
  };
  type?: string;
}

export interface CurrentWeather {
  temperature?: {
    degrees?: number;
    unit?: string;
  };
  feelsLikeTemperature?: {
    degrees?: number;
    unit?: string;
  };
  dewPoint?: {
    degrees?: number;
    unit?: string;
  };
  relativeHumidity?: number;
  windSpeed?: {
    value?: number;
    unit?: string;
  };
  windDirection?: {
    degrees?: number;
    cardinal?: string;
  };
  windGust?: {
    value?: number;
    unit?: string;
  };
  precipitation?: {
    probability?: {
      percent?: number;
    };
    qpf?: {
      quantity?: number;
      unit?: string;
    };
    type?: string;
  };
  airPressure?: {
    meanSeaLevelMillibars?: number;
  };
  cloudCover?: number;
  uvIndex?: number;
  visibility?: {
    distance?: number;
    unit?: string;
  };
  weatherCondition?: WeatherCondition;
  isDaytime?: boolean;
  currentTime?: string;
  timeZone?: {
    id?: string;
  };
  sunAndMoon?: {
    sunrise?: string;
    sunset?: string;
    moonPhase?: string;
    moonrise?: string;
    moonset?: string;
  };
}

export interface HourlyForecast {
  interval?: {
    startTime?: string;
    endTime?: string;
  };
  displayDateTime?: {
    year?: number;
    month?: number;
    day?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    timeZone?: {
      id?: string;
    };
  };
  temperature?: {
    degrees?: number;
  };
  feelsLikeTemperature?: {
    degrees?: number;
  };
  precipitation?: {
    probability?: {
      percent?: number;
    };
    qpf?: {
      quantity?: number;
      unit?: string;
    };
    type?: string;
  };
  weatherCondition?: WeatherCondition;
  windSpeed?: {
    value?: number;
    unit?: string;
  };
  windDirection?: {
    degrees?: number;
    cardinal?: string;
  };
  relativeHumidity?: number;
  uvIndex?: number;
  cloudCover?: number;
  isDaytime?: boolean;
}

export interface DailyForecast {
  interval?: {
    startTime?: string;
    endTime?: string;
  };
  displayDate?: {
    year?: number;
    month?: number;
    day?: number;
  };
  maxTemperature?: {
    degrees?: number;
  };
  minTemperature?: {
    degrees?: number;
  };
  precipitation?: {
    probability?: {
      percent?: number;
    };
    qpf?: {
      quantity?: number;
      unit?: string;
    };
    type?: string;
  };
  daytimeForecast?: {
    weatherCondition?: WeatherCondition;
    relativeHumidity?: number;
    windSpeed?: {
      value?: number;
      unit?: string;
    };
    windDirection?: {
      cardinal?: string;
    };
    cloudCover?: number;
    precipitation?: {
      probability?: {
        percent?: number;
      };
      qpf?: {
        quantity?: number;
        unit?: string;
      };
    };
  };
  nighttimeForecast?: {
    weatherCondition?: WeatherCondition;
    relativeHumidity?: number;
    windSpeed?: {
      value?: number;
      unit?: string;
    };
    windDirection?: {
      cardinal?: string;
    };
    cloudCover?: number;
    precipitation?: {
      probability?: {
        percent?: number;
      };
      qpf?: {
        quantity?: number;
        unit?: string;
      };
    };
  };
  sunAndMoon?: {
    sunrise?: string;
    sunset?: string;
    moonPhase?: string;
  };
}

export interface WeatherAlert {
  alertId?: string;
  headline?: string;
  description?: string;
  severity?: 'EXTREME' | 'SEVERE' | 'MODERATE' | 'MINOR' | 'UNKNOWN_SEVERITY';
  urgency?: 'IMMEDIATE' | 'EXPECTED' | 'FUTURE' | 'PAST' | 'UNKNOWN_URGENCY';
  certainty?: 'OBSERVED' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY' | 'UNKNOWN_CERTAINTY';
  effectiveTime?: string;
  expireTime?: string;
  eventDescription?: string;
  areas?: string[];
  senderName?: string;
}

export interface WeatherLocation {
  id: string;
  name: string;
  country: string;
  region?: string;
  lat: number;
  lng: number;
  timezone?: string;
  isManual?: boolean;
}

export interface MinuteForecastSegment {
  interval?: {
    startTime?: string;
    endTime?: string;
  };
  timeFrame?: {
    startTime?: string;
    endTime?: string;
  };
  probability?: number;
  qpf?: {
    quantity?: number;
    unit?: string;
  };
  snowfallAmount?: {
    quantity?: number;
    unit?: string;
  };
  type?: 'RAIN' | 'SNOW' | 'ICE' | 'HAIL' | 'NONE' | string;
  intensity?: 'NO_INTENSITY' | 'LIGHT' | 'MODERATE' | 'HEAVY' | 'VERY_HEAVY' | string;
  precipitation?: {
    probability?: {
      percent?: number;
    };
    qpf?: {
      quantity?: number;
      unit?: string;
    };
    type?: string;
    intensity?: string;
  };
}

export type MinuteForecast = MinuteForecastSegment;

export interface OverallPredictionTimeframe {
  startTime?: string;
  endTime?: string;
}

export interface MinuteNowcastBundle {
  overallPredictionTimeframe?: OverallPredictionTimeframe;
  timeZone?: {
    id?: string;
    version?: string;
  };
  segments: MinuteForecastSegment[];
}

export interface CoverageInfo {
  minutesForecastSupported: boolean;
  radarTilesSupported: boolean;
  isOutOfCoverage: boolean;
  notes?: string;
  endpointsStatus?: Record<string, { status: number; ok: boolean; message?: string }>;
}

export interface MinuteHistorySnapshot {
  timestamp: number;
  probability: number;
  qpfQuantity?: number;
  precipType?: string;
}

export interface MinuteTrendSummary {
  direction: 'INCREASING' | 'DECREASING' | 'STABLE_RAIN' | 'STABLE_DRY';
  text: string;
  deltaProbability: number;
  previousUpdateTime?: number;
}

export interface LocationWeatherBundle {
  location: WeatherLocation;
  current?: CurrentWeather;
  hourly: HourlyForecast[];
  historyHours?: HourlyForecast[];
  daily: DailyForecast[];
  alerts: WeatherAlert[];
  minutes?: MinuteForecast[];
  minuteNowcast?: MinuteNowcastBundle;
  historySnapshots?: MinuteHistorySnapshot[];
  trendSummary?: MinuteTrendSummary;
  coverage?: CoverageInfo;
  isUnsupportedLocation?: boolean;
  errorMessage?: string;
  isSimulated?: boolean;
  lastUpdated: number;
}
