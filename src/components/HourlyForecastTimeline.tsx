import { useState } from 'react';
import { Cloud, CloudRain, Sun, CloudLightning, CloudSnow, History, Sparkles } from 'lucide-react';
import { HourlyForecast } from '../types/weather';

interface HourlyForecastTimelineProps {
  hourly?: HourlyForecast[];
  historyHours?: HourlyForecast[];
}

export function HourlyForecastTimeline({ hourly = [], historyHours = [] }: HourlyForecastTimelineProps) {
  const [viewMode, setViewMode] = useState<'FORECAST' | 'HISTORY'>('FORECAST');

  const hasHistory = Array.isArray(historyHours) && historyHours.length > 0;
  const hasForecast = Array.isArray(hourly) && hourly.length > 0;

  if (!hasForecast && !hasHistory) return null;

  const currentList = viewMode === 'HISTORY' && hasHistory ? historyHours : hourly;

  const getConditionIcon = (type?: string, isDay?: boolean) => {
    const t = (type || '').toLowerCase();
    if (t.includes('rain') || t.includes('shower')) return <CloudRain className="w-4 h-4 text-sky-500" />;
    if (t.includes('thunder') || t.includes('storm')) return <CloudLightning className="w-4 h-4 text-amber-500" />;
    if (t.includes('snow') || t.includes('ice')) return <CloudSnow className="w-4 h-4 text-blue-300" />;
    if (t.includes('cloud')) return <Cloud className="w-4 h-4 text-slate-400" />;
    return <Sun className="w-4 h-4 text-amber-500" />;
  };

  const formatHour = (item: HourlyForecast, idx: number, isHistory: boolean) => {
    if (!isHistory && idx === 0) return 'Now';
    if (item.displayDateTime?.hours !== undefined) {
      const h = item.displayDateTime.hours;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formatted = h % 12 === 0 ? 12 : h % 12;
      return `${formatted} ${ampm}`;
    }
    if (item.interval?.startTime) {
      const d = new Date(item.interval.startTime);
      return d.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    }
    return isHistory ? `-${idx + 1}h` : `+${idx}h`;
  };

  return (
    <div className="my-3.5 space-y-2">
      {/* Header with Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('FORECAST')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                viewMode === 'FORECAST'
                  ? 'bg-white text-sky-700 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Next 24h Forecast</span>
            </button>
            {hasHistory && (
              <button
                onClick={() => setViewMode('HISTORY')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1 text-[11px] ${
                  viewMode === 'HISTORY'
                    ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <History className="w-3 h-3" />
                <span>Past 24h Observed</span>
              </button>
            )}
          </div>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          {viewMode === 'HISTORY' ? 'history/hours:lookup' : 'forecast/hours:lookup'}
        </span>
      </div>

      {/* Horizontal Scrollable Timeline */}
      <div className="flex gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar select-none">
        {currentList.slice(0, 24).map((h, idx) => {
          const temp = h.temperature?.degrees !== undefined ? Math.round(h.temperature.degrees) : '--';
          const precipProb = h.precipitation?.probability?.percent ?? 0;
          const conditionType = h.weatherCondition?.type;
          const isHistory = viewMode === 'HISTORY';

          return (
            <div
              key={idx}
              className={`shrink-0 flex flex-col items-center justify-between p-2 rounded-xl border transition-all ${
                !isHistory && idx === 0
                  ? 'bg-sky-50/80 border-sky-300 text-sky-900 min-w-[66px] shadow-2xs'
                  : isHistory
                  ? 'bg-slate-50/90 border-slate-200 text-slate-700 min-w-[62px] hover:border-indigo-300 shadow-2xs'
                  : 'bg-slate-50/90 border-slate-200 text-slate-700 min-w-[62px] hover:border-sky-300 shadow-2xs'
              }`}
            >
              <span className="text-[11px] font-medium text-slate-500">
                {formatHour(h, idx, isHistory)}
              </span>

              <div className="my-2 flex flex-col items-center gap-1">
                {getConditionIcon(conditionType, h.isDaytime)}
                {precipProb > 10 && (
                  <span className="text-[10px] font-bold text-sky-600">
                    {precipProb}%
                  </span>
                )}
              </div>

              <span className="text-xs font-bold text-slate-900">
                {temp}°
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
