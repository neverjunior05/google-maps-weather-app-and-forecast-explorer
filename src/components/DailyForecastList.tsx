/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cloud, CloudRain, Sun, CloudLightning, CloudSnow } from 'lucide-react';
import { DailyForecast } from '../types/weather';

interface DailyForecastListProps {
  daily: DailyForecast[];
}

export function DailyForecastList({ daily }: DailyForecastListProps) {
  if (!daily || daily.length === 0) return null;

  const getConditionIcon = (type?: string) => {
    const t = (type || '').toLowerCase();
    if (t.includes('rain') || t.includes('shower')) return <CloudRain className="w-4 h-4 text-sky-400" />;
    if (t.includes('thunder') || t.includes('storm')) return <CloudLightning className="w-4 h-4 text-amber-400" />;
    if (t.includes('snow') || t.includes('ice')) return <CloudSnow className="w-4 h-4 text-blue-200" />;
    if (t.includes('cloud')) return <Cloud className="w-4 h-4 text-slate-300" />;
    return <Sun className="w-4 h-4 text-amber-300" />;
  };

  const getDayName = (item: DailyForecast, idx: number) => {
    if (idx === 0) return 'Today';
    if (item.displayDate) {
      const { year, month, day } = item.displayDate;
      if (year && month && day) {
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString([], { weekday: 'short' });
      }
    }
    if (item.interval?.startTime) {
      const d = new Date(item.interval.startTime);
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return `Day +${idx}`;
  };

  // Find min and max across all days for normalized temperature bar
  const allMins = daily.map((d) => d.minTemperature?.degrees ?? 10);
  const allMaxs = daily.map((d) => d.maxTemperature?.degrees ?? 25);
  const globalMin = Math.min(...allMins);
  const globalMax = Math.max(...allMaxs);
  const range = Math.max(1, globalMax - globalMin);

  return (
    <div className="my-3.5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          10-Day Weather Forecast
        </h4>
        <span className="text-[11px] text-slate-400">Google Weather Models</span>
      </div>

      <div className="flex flex-col gap-1.5">
        {daily.slice(0, 10).map((d, idx) => {
          const dayName = getDayName(d, idx);
          const maxTemp = d.maxTemperature?.degrees ?? 24;
          const minTemp = d.minTemperature?.degrees ?? 14;
          const precipProb = d.precipitation?.probability?.percent ?? d.daytimeForecast?.precipitation?.probability?.percent ?? 0;
          const condType = d.daytimeForecast?.weatherCondition?.type;

          const leftPercent = ((minTemp - globalMin) / range) * 100;
          const widthPercent = Math.max(15, ((maxTemp - minTemp) / range) * 100);

          return (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 rounded-xl bg-slate-50 border border-slate-200/90 hover:bg-slate-100/80 transition-colors text-xs shadow-xs"
            >
              {/* Day Name */}
              <div className="w-14 font-semibold text-slate-700">
                {dayName}
              </div>

              {/* Weather Icon & Rain % */}
              <div className="flex items-center gap-1.5 w-16">
                {getConditionIcon(condType)}
                {precipProb > 25 ? (
                  <span className="text-[10px] font-bold text-sky-600">
                    {precipProb}%
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">--</span>
                )}
              </div>

              {/* Min Temp */}
              <div className="w-7 text-right font-mono text-slate-500 text-xs">
                {minTemp}°
              </div>

              {/* Temperature Bar */}
              <div className="flex-1 mx-3 h-1.5 bg-slate-200 rounded-full overflow-hidden relative">
                <div
                  className="absolute h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-300 to-rose-400"
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                  }}
                />
              </div>

              {/* Max Temp */}
              <div className="w-7 text-left font-mono font-bold text-slate-900 text-xs">
                {maxTemp}°
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
