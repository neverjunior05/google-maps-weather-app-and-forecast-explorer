/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { CloudRain, Wind, Droplets, Sun, Cloud, Compass, Gauge, Eye } from 'lucide-react';
import { CurrentWeather, WeatherUnitSystem } from '../types/weather';

interface AtmosphericMetricsGridProps {
  current: CurrentWeather;
  unitSystem: WeatherUnitSystem;
}

export function AtmosphericMetricsGrid({ current, unitSystem }: AtmosphericMetricsGridProps) {
  const isMetric = unitSystem === 'METRIC';

  // UV index category
  const uv = current.uvIndex ?? 0;
  const getUvCategory = (val: number) => {
    if (val <= 2) return { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/20' };
    if (val <= 5) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/20' };
    if (val <= 7) return { label: 'High', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    if (val <= 10) return { label: 'Very High', color: 'text-rose-400', bg: 'bg-rose-500/20' };
    return { label: 'Extreme', color: 'text-purple-400', bg: 'bg-purple-500/20' };
  };
  const uvCat = getUvCategory(uv);

  const windSpeed = current.windSpeed?.value ?? 0;
  const windDir = current.windDirection?.degrees ?? 0;
  const windCardinal = current.windDirection?.cardinal ?? 'N';
  const windGust = current.windGust?.value;
  const precipProb = current.precipitation?.probability?.percent ?? 0;
  const precipQpf = current.precipitation?.qpf?.quantity ?? 0;
  const humidity = current.relativeHumidity ?? 0;
  const dewPoint = current.dewPoint?.degrees;
  const cloudCover = current.cloudCover ?? 0;
  const pressure = current.airPressure?.meanSeaLevelMillibars ?? 1013;
  const visibility = current.visibility?.distance ?? (isMetric ? 10 : 6.2);

  return (
    <div className="grid grid-cols-2 gap-2.5 my-3.5">
      
      {/* 1. Precipitation */}
      <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-700">
            <CloudRain className="w-3.5 h-3.5 text-sky-600" /> Precipitation
          </span>
          <span className="text-[11px] font-bold text-sky-600">{precipProb}%</span>
        </div>
        <div className="mt-2">
          <div className="text-lg font-bold text-slate-900">
            {precipQpf > 0 ? `${precipQpf} ${isMetric ? 'mm/h' : 'in/h'}` : '0 mm/h'}
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1.5 overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(5, precipProb))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Wind */}
      <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-700">
            <Wind className="w-3.5 h-3.5 text-teal-600" /> Wind
          </span>
          <span className="text-[11px] font-mono text-slate-500">{windCardinal}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <div>
            <span className="text-lg font-bold text-slate-900">{windSpeed}</span>
            <span className="text-xs text-slate-500 ml-1">{isMetric ? 'km/h' : 'mph'}</span>
          </div>
          {windGust && (
            <span className="text-[11px] text-slate-500">
              Gusts {windGust} {isMetric ? 'km/h' : 'mph'}
            </span>
          )}
        </div>
      </div>

      {/* 3. Humidity & Dew Point */}
      <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-700">
            <Droplets className="w-3.5 h-3.5 text-cyan-600" /> Humidity
          </span>
          <span className="text-[11px] font-bold text-cyan-700">{humidity}%</span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {dewPoint !== undefined ? (
            <span>Dew point is {dewPoint}°{isMetric ? 'C' : 'F'}</span>
          ) : (
            <span>Normal moisture level</span>
          )}
        </div>
      </div>

      {/* 4. UV Index */}
      <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-700">
            <Sun className="w-3.5 h-3.5 text-amber-500" /> UV Index
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${uvCat.bg} ${uvCat.color}`}>
            {uvCat.label}
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-lg font-bold text-slate-900">{uv}</span>
          <span className="text-xs text-slate-400">/ 11+</span>
        </div>
      </div>

      {/* 5. Cloud Cover */}
      <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-700">
            <Cloud className="w-3.5 h-3.5 text-indigo-500" /> Cloud Cover
          </span>
          <span className="text-[11px] font-bold text-indigo-600">{cloudCover}%</span>
        </div>
        <div className="mt-2">
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(5, cloudCover)}%` }}
            />
          </div>
        </div>
      </div>

      {/* 6. Pressure & Visibility */}
      <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-semibold flex items-center gap-1.5 text-slate-700">
            <Gauge className="w-3.5 h-3.5 text-emerald-600" /> Pressure
          </span>
          <span className="text-[11px] font-mono text-slate-700">{pressure} hPa</span>
        </div>
        <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
          <Eye className="w-3 h-3 text-slate-400" /> Vis: {visibility} {isMetric ? 'km' : 'mi'}
        </div>
      </div>

    </div>
  );
}
