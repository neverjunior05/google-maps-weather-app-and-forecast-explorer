/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Sun, Moon, Sunrise, Sunset } from 'lucide-react';
import { CurrentWeather } from '../types/weather';

interface SunMoonTrackerProps {
  current: CurrentWeather;
}

export function SunMoonTracker({ current }: SunMoonTrackerProps) {
  const sunAndMoon = current.sunAndMoon;
  const sunrise = sunAndMoon?.sunrise || '06:15 AM';
  const sunset = sunAndMoon?.sunset || '07:50 PM';
  const moonPhase = sunAndMoon?.moonPhase || 'Waxing Gibbous';

  return (
    <div className="my-3.5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        Sun & Moon Tracker
      </h4>

      <div className="grid grid-cols-2 gap-2.5">
        
        {/* Sun tracker card */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-amber-600">
              <Sun className="w-3.5 h-3.5" /> Solar Cycle
            </span>
            <span className="text-[10px] text-slate-400">13h 35m</span>
          </div>

          <div className="flex items-center justify-between mt-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Sunrise className="w-4 h-4 text-amber-500" />
              <div>
                <div className="text-[10px] text-slate-400">Sunrise</div>
                <div className="font-semibold text-slate-800">{sunrise}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Sunset className="w-4 h-4 text-orange-500" />
              <div>
                <div className="text-[10px] text-slate-400">Sunset</div>
                <div className="font-semibold text-slate-800">{sunset}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Moon tracker card */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/90 p-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span className="font-semibold flex items-center gap-1.5 text-indigo-600">
              <Moon className="w-3.5 h-3.5" /> Lunar Phase
            </span>
          </div>

          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <Moon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-800">{moonPhase}</div>
              <div className="text-[10px] text-slate-400">Illumination ~78%</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
