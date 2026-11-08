/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { WeatherAlert } from '../types/weather';

interface WeatherAlertBannerProps {
  alerts: WeatherAlert[];
}

export function WeatherAlertBanner({ alerts }: WeatherAlertBannerProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 mb-3.5">
      {alerts.map((alert, idx) => {
        const isExpanded = expandedId === (alert.alertId || `alert-${idx}`);
        const severity = alert.severity || 'MODERATE';
        const isSevere = severity === 'EXTREME' || severity === 'SEVERE';

        return (
          <div
            key={alert.alertId || idx}
            className={`rounded-xl border p-3 transition-all ${
              isSevere
                ? 'bg-rose-50 border-rose-200 text-rose-900 shadow-xs'
                : 'bg-amber-50 border-amber-200 text-amber-900 shadow-xs'
            }`}
          >
            <div
              className="flex items-start justify-between gap-2 cursor-pointer select-none"
              onClick={() => setExpandedId(isExpanded ? null : (alert.alertId || `alert-${idx}`))}
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className={`w-4 h-4 shrink-0 ${isSevere ? 'text-rose-600 animate-pulse' : 'text-amber-600'}`} />
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wide ${
                        isSevere ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
                      }`}
                    >
                      {severity}
                    </span>
                    <span className="text-xs font-bold line-clamp-1 text-slate-900">{alert.headline || alert.eventDescription || 'Weather Advisory'}</span>
                  </div>
                </div>
              </div>
              <button className="text-slate-500 hover:text-slate-900 p-0.5">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {isExpanded && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-xs text-slate-700 flex flex-col gap-1.5">
                <p className="leading-relaxed whitespace-pre-wrap font-sans">{alert.description || 'Active advisory for this region.'}</p>
                {alert.areas && alert.areas.length > 0 && (
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-700">Affecting:</span> {alert.areas.join(', ')}
                  </div>
                )}
                {alert.senderName && (
                  <div className="text-[10px] text-slate-400 italic">
                    Issued by {alert.senderName}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
