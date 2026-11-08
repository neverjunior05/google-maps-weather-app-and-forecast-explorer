/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { LocationWeatherBundle, WeatherLocation, WeatherMapType, WeatherUnitSystem, MinuteHistorySnapshot, MinuteTrendSummary } from './types/weather';
import { PRESET_LOCATIONS } from './utils/mockWeatherData';
import { fetchWeatherConfig, fetchCompleteWeather } from './services/weatherApi';
import { APIProvider } from '@vis.gl/react-google-maps';
import { WeatherMap } from './components/WeatherMap';
import { WeatherSidebar } from './components/WeatherSidebar';
import { ApiKeyModal } from './components/ApiKeyModal';

export function App() {
  const envMapsKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';
  const [apiKey, setApiKey] = useState<string>(envMapsKey);
  const [hasKey, setHasKey] = useState<boolean>(!!envMapsKey);
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation>(PRESET_LOCATIONS[0]);
  const [weatherBundle, setWeatherBundle] = useState<LocationWeatherBundle | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState<boolean>(false);
  const [unitSystem, setUnitSystem] = useState<WeatherUnitSystem>('METRIC');
  const [radarMapType, setRadarMapType] = useState<WeatherMapType>('US_PRECIPITATION_CURRENT');
  const [radarOpacity, setRadarOpacity] = useState<number>(0.8);
  const [radarVisible, setRadarVisible] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(Date.now());
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(false);
  const [refreshCountdown, setRefreshCountdown] = useState<number>(0);
  const [historyMap, setHistoryMap] = useState<Record<string, MinuteHistorySnapshot[]>>({});

  // Initialize config from backend or environment
  useEffect(() => {
    fetchWeatherConfig().then((cfg) => {
      setHasKey(cfg.hasKey);
      if (cfg.apiKey) {
        setApiKey(cfg.apiKey);
      }
    });
  }, []);

  // Fetch weather data and accumulate minute history snapshots
  const loadWeather = useCallback(async (location: WeatherLocation, units: WeatherUnitSystem) => {
    setIsLoadingWeather(true);
    try {
      const bundle = await fetchCompleteWeather(location, units);
      if (bundle) {
        // Calculate minute history & trend
        if (bundle.minutes && bundle.minutes.length > 0) {
          const currentProb = bundle.minutes[0]?.precipitation?.probability?.percent || 0;
          const currentQpf = bundle.minutes[0]?.precipitation?.qpf?.quantity;
          const currentType = bundle.minutes[0]?.precipitation?.type || 'Rain';

          const locHistory = historyMap[location.id] || [];
          const lastSnapshot = locHistory[locHistory.length - 1];

          let trendSummary: MinuteTrendSummary;
          if (lastSnapshot) {
            const delta = currentProb - lastSnapshot.probability;
            if (delta >= 5) {
              trendSummary = {
                direction: 'INCREASING',
                text: `Precipitation chance increasing (+${delta}%)`,
                deltaProbability: delta,
                previousUpdateTime: lastSnapshot.timestamp,
              };
            } else if (delta <= -5) {
              trendSummary = {
                direction: 'DECREASING',
                text: `Precipitation chance easing (${delta}%)`,
                deltaProbability: delta,
                previousUpdateTime: lastSnapshot.timestamp,
              };
            } else if (currentProb >= 20) {
              trendSummary = {
                direction: 'STABLE_RAIN',
                text: `Steady ${currentType.toLowerCase()} projected`,
                deltaProbability: delta,
                previousUpdateTime: lastSnapshot.timestamp,
              };
            } else {
              trendSummary = {
                direction: 'STABLE_DRY',
                text: 'Stable dry conditions',
                deltaProbability: delta,
                previousUpdateTime: lastSnapshot.timestamp,
              };
            }
          } else {
            trendSummary = {
              direction: currentProb >= 20 ? 'STABLE_RAIN' : 'STABLE_DRY',
              text: currentProb >= 20 ? `Current: ${currentProb}% chance ${currentType}` : 'Clear & Dry Nowcast',
              deltaProbability: 0,
            };
          }

          const newSnapshot: MinuteHistorySnapshot = {
            timestamp: Date.now(),
            probability: currentProb,
            qpfQuantity: currentQpf,
            precipType: currentType,
          };

          const updatedHistory = [...locHistory.slice(-9), newSnapshot];
          setHistoryMap((prev) => ({ ...prev, [location.id]: updatedHistory }));

          bundle.historySnapshots = updatedHistory;
          bundle.trendSummary = trendSummary;
        }

        // Stop auto-refresh polling if the location is outside weather coverage
        if (bundle.isUnsupportedLocation) {
          setAutoRefreshEnabled(false);
        }

        setWeatherBundle(bundle);
      } else {
        // No bundle returned (terminal failure) -> stop polling
        setAutoRefreshEnabled(false);
      }
    } catch (err) {
      console.error('Failed to load weather bundle:', err);
      // Disable auto-refresh on request failures to prevent unbounded polling
      setAutoRefreshEnabled(false);
    } finally {
      setIsLoadingWeather(false);
    }
  }, [historyMap]);

  useEffect(() => {
    loadWeather(selectedLocation, unitSystem);
  }, [selectedLocation, unitSystem]);

  // Optional manual or periodic reload (only if user explicitly enables it)
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      loadWeather(selectedLocation, unitSystem);
      setRefreshTrigger(Date.now());
    }, 60000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, selectedLocation, unitSystem, loadWeather]);

  // Handle location selection
  const handleSelectLocation = (loc: WeatherLocation) => {
    setSelectedLocation(loc);
    // Auto switch radar tile type if in Europe vs Americas
    if (loc.lng >= -30 && loc.lng <= 45 && loc.lat >= 35 && loc.lat <= 70) {
      setRadarMapType('EU_PRECIPITATION_CURRENT');
    } else {
      setRadarMapType('US_PRECIPITATION_CURRENT');
    }
  };

  const handleToggleUnitSystem = () => {
    setUnitSystem((prev) => (prev === 'METRIC' ? 'IMPERIAL' : 'METRIC'));
  };

  const handleRefreshWeather = () => {
    setRefreshTrigger(Date.now());
    loadWeather(selectedLocation, unitSystem);
  };

  const mapsApiKey = apiKey || (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <APIProvider
      apiKey={mapsApiKey}
      libraries={['places', 'maps', 'marker']}
      solutionChannel="gmp_aistudio_weatherexplorer_v1.0.0"
    >
      <div className="relative w-screen h-screen overflow-hidden bg-slate-100 text-slate-900 font-sans">
        {/* Background Interactive Google Weather Map */}
        <WeatherMap
          apiKey={mapsApiKey}
          selectedLocation={selectedLocation}
          weatherBundle={weatherBundle}
          onSelectLocation={handleSelectLocation}
          radarMapType={radarMapType}
          onChangeRadarMapType={setRadarMapType}
          radarOpacity={radarOpacity}
          onChangeRadarOpacity={setRadarOpacity}
          radarVisible={radarVisible}
          onToggleRadarVisible={() => setRadarVisible((v) => !v)}
          refreshTrigger={refreshTrigger}
          onTriggerRefresh={() => setRefreshTrigger(Date.now())}
          isSidebarCollapsed={isCollapsed}
          onToggleSidebar={() => setIsCollapsed((c) => !c)}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={() => setAutoRefreshEnabled((v) => !v)}
          refreshCountdown={refreshCountdown}
        />

        {/* Primary Weather Drawer / Sidebar */}
        <WeatherSidebar
          selectedLocation={selectedLocation}
          weatherBundle={weatherBundle}
          isLoading={isLoadingWeather}
          unitSystem={unitSystem}
          onToggleUnitSystem={handleToggleUnitSystem}
          onSelectLocation={handleSelectLocation}
          onRefreshWeather={handleRefreshWeather}
          onOpenKeyModal={() => setIsKeyModalOpen(true)}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((c) => !c)}
          autoRefreshEnabled={autoRefreshEnabled}
          onToggleAutoRefresh={() => setAutoRefreshEnabled((v) => !v)}
          refreshCountdown={refreshCountdown}
        />

        {/* Key Setup & Quickstart Guide Modal */}
        <ApiKeyModal
          isOpen={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          hasKey={hasKey}
        />
      </div>
    </APIProvider>
  );
}

export default App;
