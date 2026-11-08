/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { MapPin, RefreshCw, ChevronLeft, ChevronRight, Sparkles, Sun, CloudRain, Cloud, CloudLightning, CloudSnow, Info, Compass, Key, AlertTriangle, CloudOff } from 'lucide-react';
import { LocationWeatherBundle, WeatherLocation, WeatherUnitSystem } from '../types/weather';
import { PRESET_LOCATIONS } from '../utils/mockWeatherData';
import { PlaceAutocompleteNew } from './PlaceAutocompleteNew';
import { AtmosphericMetricsGrid } from './AtmosphericMetricsGrid';
import { MinuteForecastCard } from './MinuteForecastCard';
import { HourlyForecastTimeline } from './HourlyForecastTimeline';
import { DailyForecastList } from './DailyForecastList';
import { SunMoonTracker } from './SunMoonTracker';
import { WeatherAlertBanner } from './WeatherAlertBanner';

interface WeatherSidebarProps {
  selectedLocation: WeatherLocation;
  weatherBundle: LocationWeatherBundle | null;
  isLoading: boolean;
  unitSystem: WeatherUnitSystem;
  onToggleUnitSystem: () => void;
  onSelectLocation: (loc: WeatherLocation) => void;
  onRefreshWeather: () => void;
  onOpenKeyModal: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
  refreshCountdown?: number;
}

export function WeatherSidebar({
  selectedLocation,
  weatherBundle,
  isLoading,
  unitSystem,
  onToggleUnitSystem,
  onSelectLocation,
  onRefreshWeather,
  onOpenKeyModal,
  isCollapsed,
  onToggleCollapse,
  autoRefreshEnabled = true,
  onToggleAutoRefresh,
  refreshCountdown = 45,
}: WeatherSidebarProps) {
  const [isSearchActive, setIsSearchActive] = useState(false);
  const isUnsupported = !!weatherBundle?.isUnsupportedLocation;
  const current = weatherBundle?.current;
  const temp = current?.temperature?.degrees;
  const feelsLike = current?.feelsLikeTemperature?.degrees;
  const conditionText = isUnsupported
    ? 'Out of Coverage'
    : current?.weatherCondition?.description?.text || (current ? 'Clear' : 'Loading...');
  const conditionType = current?.weatherCondition?.type;

  const getConditionIconLarge = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('rain') || t.includes('shower')) return <CloudRain className="w-12 h-12 text-sky-400" />;
    if (t.includes('thunder') || t.includes('storm')) return <CloudLightning className="w-12 h-12 text-amber-400" />;
    if (t.includes('snow') || t.includes('ice')) return <CloudSnow className="w-12 h-12 text-blue-200" />;
    if (t.includes('cloud')) return <Cloud className="w-12 h-12 text-slate-300" />;
    return <Sun className="w-12 h-12 text-amber-300" />;
  };

  return (
    <>
      {/* Minimized Quick Info & Search Bar (when sidebar is collapsed) */}
      {isCollapsed && (
        <div className="fixed top-4 left-4 right-16 sm:right-auto z-40 flex items-center gap-2 max-w-[calc(100vw-76px)]">
          {/* Quick Info Weather Button - Collapses on mobile when search is focused */}
          <button
            id="btn-sidebar-toggle-min"
            onClick={onToggleCollapse}
            className={`items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-white/95 border shadow-lg shadow-slate-200/50 backdrop-blur-md text-slate-800 hover:bg-slate-50 transition-all cursor-pointer group shrink-0 ${
              isSearchActive ? 'hidden sm:flex' : 'flex'
            } ${
              isUnsupported ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200/90'
            }`}
            title="Open Weather Panel"
          >
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-xs text-white ${
                isUnsupported ? 'bg-amber-500' : 'bg-sky-500'
              }`}
            >
              {isUnsupported ? <CloudOff className="w-4 h-4" /> : <CloudRain className="w-4 h-4" />}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                <span className="max-w-[110px] sm:max-w-[130px] truncate">{selectedLocation.name}</span>
                {!isUnsupported && temp !== undefined && (
                  <span className="text-sky-600 font-extrabold">{temp}°</span>
                )}
              </div>
              <div
                className={`text-[10px] font-medium line-clamp-1 ${
                  isUnsupported ? 'text-amber-700 font-semibold' : 'text-slate-500'
                }`}
              >
                {conditionText}
              </div>
            </div>
            <div className="ml-1 p-1 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </div>
          </button>

          {/* Search Autocomplete Container - Expands to the left when selected without overlapping top-right map controls */}
          <div
            className={`transition-all duration-300 ease-out shadow-lg shadow-slate-200/50 rounded-2xl min-w-0 ${
              isSearchActive
                ? 'flex-1 min-w-0 w-full sm:w-80 md:w-96'
                : 'w-36 sm:w-64 max-w-[calc(100vw-220px)] sm:max-w-none'
            }`}
          >
            <PlaceAutocompleteNew
              onSelectLocation={(loc) => {
                onSelectLocation(loc);
                setIsSearchActive(false);
              }}
              onFocusChange={setIsSearchActive}
              alignDropdown="right"
              placeholder="Search location..."
            />
          </div>
        </div>
      )}

      {/* Main Sidebar Panel */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-30 w-full sm:w-[416px] bg-white/95 border-r border-slate-200/90 shadow-2xl backdrop-blur-2xl flex flex-col transition-transform duration-300 ease-out text-slate-800 ${
          isCollapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/20">
              <CloudRain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                Google Weather Map
              </h1>
              <p className="text-[11px] text-slate-500">Maps Platform Weather Tiles</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Metric/Imperial switch */}
            <button
              id="btn-toggle-unit"
              onClick={onToggleUnitSystem}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 border border-slate-200 text-sky-700 hover:bg-slate-200 transition-colors"
              title="Toggle Celsius / Fahrenheit"
            >
              °{unitSystem === 'METRIC' ? 'C' : 'F'}
            </button>

            {/* API Key info */}
            <button
              id="btn-key-modal"
              onClick={onOpenKeyModal}
              className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-sky-700 hover:bg-slate-200 transition-colors"
              title="Weather API Settings & Demo Key"
            >
              <Key className="w-4 h-4" />
            </button>

            {/* Collapse toggle */}
            <button
              id="btn-sidebar-toggle"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors ml-1"
              title="Minimize Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Location Bar (Places API New) */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-2.5">
          <PlaceAutocompleteNew onSelectLocation={onSelectLocation} />

          {/* Quick preset city pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none">
            {PRESET_LOCATIONS.map((loc) => {
              const isSelected = loc.id === selectedLocation.id;
              return (
                <button
                  key={loc.id}
                  onClick={() => onSelectLocation(loc)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                    isSelected
                      ? 'bg-sky-500 text-white shadow-xs font-semibold'
                      : 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {loc.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Weather Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* Active Location Title & Coordinates */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>{selectedLocation.region ? `${selectedLocation.region}, ${selectedLocation.country}` : selectedLocation.country}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-0.5 tracking-tight flex items-center gap-2">
                <span>{selectedLocation.name}</span>
                {isUnsupported && (
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                    Out of Coverage
                  </span>
                )}
              </h2>
              <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                {selectedLocation.lat >= 0 ? `${selectedLocation.lat.toFixed(4)}°N` : `${Math.abs(selectedLocation.lat).toFixed(4)}°S`},{' '}
                {selectedLocation.lng >= 0 ? `${selectedLocation.lng.toFixed(4)}°E` : `${Math.abs(selectedLocation.lng).toFixed(4)}°W`}
              </div>
            </div>

            <button
              onClick={onRefreshWeather}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Refresh Current Weather Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-sky-600' : ''}`} />
            </button>
          </div>

          {/* If location is out of weather API coverage */}
          {isUnsupported ? (
            <div className="rounded-2xl bg-amber-50/90 border border-amber-200 p-4 text-slate-800 shadow-sm space-y-3.5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">Location Unsupported by Weather API</h3>
                  <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                    Google Maps Platform Weather API returned HTTP 404 (Not Found):{' '}
                    <span className="font-medium">{weatherBundle?.errorMessage || 'Information is not supported for this location.'}</span>
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-white/90 border border-amber-200/80 text-xs text-slate-600 space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Queried Endpoint</div>
                <div className="text-[11px] text-slate-800 font-mono break-all leading-tight">
                  currentConditions:lookup?location.latitude={selectedLocation.lat.toFixed(4)}&location.longitude={selectedLocation.lng.toFixed(4)}
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200/80">
                <div className="text-xs font-bold text-amber-900 mb-1.5">Try Supported Locations in Coverage:</div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: 'San Francisco', lat: 37.7749, lng: -122.4194, country: 'United States', region: 'California' },
                    { name: 'New York', lat: 40.7128, lng: -74.006, country: 'United States', region: 'New York' },
                    { name: 'London', lat: 51.5074, lng: -0.1278, country: 'United Kingdom' },
                    { name: 'Paris', lat: 48.8566, lng: 2.3522, country: 'France' },
                    { name: 'Berlin', lat: 52.52, lng: 13.405, country: 'Germany' },
                  ].map((city) => (
                    <button
                      key={city.name}
                      onClick={() => onSelectLocation({ id: `loc-${city.name.toLowerCase()}`, ...city })}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-950 text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer shadow-2xs"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Regional Coverage Notice if minutes nowcast is restricted */}
              {weatherBundle?.coverage?.notes && (
                <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 text-[11px] flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Regional Coverage Notice:</span>{' '}
                    <span>{weatherBundle.coverage.notes}</span>
                  </div>
                </div>
              )}

              {/* Current Weather Hero Card */}
              {current && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-sky-50/50 to-blue-50/70 border border-sky-100 p-4 shadow-sm">
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-5xl font-black text-slate-900 tracking-tight">
                          {temp !== undefined ? temp : '--'}
                        </span>
                        <span className="text-2xl font-semibold text-sky-600">
                          °{unitSystem === 'METRIC' ? 'C' : 'F'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        Feels like <span className="font-semibold text-slate-800">{feelsLike ?? temp}°</span>
                      </div>

                      <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-100/80 border border-sky-200 text-sky-800 text-xs font-semibold">
                        {conditionText}
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      {getConditionIconLarge(conditionType)}
                    </div>
                  </div>
                </div>
              )}

              {/* Minute-by-Minute Nowcast Forecast */}
              <MinuteForecastCard
                minutes={weatherBundle?.minutes}
                minuteNowcast={weatherBundle?.minuteNowcast}
                coverage={weatherBundle?.coverage}
                trendSummary={weatherBundle?.trendSummary}
                historySnapshots={weatherBundle?.historySnapshots}
                refreshCountdown={refreshCountdown}
                autoRefreshEnabled={autoRefreshEnabled}
              />

              {/* Severe Weather Alerts (if active) */}
              {weatherBundle?.alerts && weatherBundle.alerts.length > 0 && (
                <WeatherAlertBanner alerts={weatherBundle.alerts} />
              )}

              {/* Key Atmospheric Metrics Grid */}
              {current && (
                <AtmosphericMetricsGrid current={current} unitSystem={unitSystem} />
              )}

              {/* 24-Hour Forecast & Hourly Past Weather History Timeline */}
              {((weatherBundle?.hourly && weatherBundle.hourly.length > 0) || (weatherBundle?.historyHours && weatherBundle.historyHours.length > 0)) && (
                <HourlyForecastTimeline
                  hourly={weatherBundle?.hourly}
                  historyHours={weatherBundle?.historyHours}
                />
              )}

              {/* 10-Day Extended Forecast */}
              {weatherBundle?.daily && weatherBundle.daily.length > 0 && (
                <DailyForecastList daily={weatherBundle.daily} />
              )}

              {/* Sun & Moon Astronomical Tracker */}
              {current && (
                <SunMoonTracker current={current} />
              )}
            </>
          )}

          {/* Attribution & Data Info */}
          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span>Google Maps Weather API</span>
              <span>Updated {new Date(weatherBundle?.lastUpdated || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              High-resolution precipitation radar map tiles & meteorological forecast models provided via Google Maps Platform.
            </p>
          </div>

        </div>
      </aside>
    </>
  );
}
