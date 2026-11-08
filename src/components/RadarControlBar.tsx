/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { Play, Pause, RotateCw, Layers, Eye, EyeOff, MapPin, Sliders } from 'lucide-react';
import { WeatherMapType } from '../types/weather';

interface RadarControlBarProps {
  mapType: WeatherMapType;
  onSelectMapType: (type: WeatherMapType) => void;
  opacity: number;
  onChangeOpacity: (val: number) => void;
  visible: boolean;
  onToggleVisible: () => void;
  onRefresh: () => void;
  onJumpRegion: (region: 'US' | 'EU' | 'WORLD') => void;
  isSidebarCollapsed?: boolean;
  autoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
  refreshCountdown?: number;
}

export function RadarControlBar({
  mapType,
  onSelectMapType,
  opacity,
  onChangeOpacity,
  visible,
  onToggleVisible,
  onRefresh,
  onJumpRegion,
  isSidebarCollapsed = true,
  autoRefreshEnabled = true,
  onToggleAutoRefresh,
  refreshCountdown = 45,
}: RadarControlBarProps) {
  return (
    <div
      className={`fixed bottom-4 z-20 pointer-events-none flex justify-center px-4 transition-all duration-300 ${
        isSidebarCollapsed
          ? 'left-0 w-full'
          : 'left-0 sm:left-[416px] w-full sm:w-[calc(100vw-416px)]'
      }`}
    >
      <div className="w-full max-w-2xl pointer-events-auto">
        <div className="rounded-2xl bg-white/95 border border-slate-200/90 p-3 shadow-2xl shadow-slate-300/40 backdrop-blur-xl flex flex-col gap-2.5 text-slate-800">
        
        {/* Upper row: Layer Switch, Controls, Animation & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Layer Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              id="btn-layer-us"
              onClick={() => {
                onSelectMapType('US_PRECIPITATION_CURRENT');
                onJumpRegion('US');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mapType === 'US_PRECIPITATION_CURRENT'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              US Precipitation
            </button>
            <button
              id="btn-layer-eu"
              onClick={() => {
                onSelectMapType('EU_PRECIPITATION_CURRENT');
                onJumpRegion('EU');
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                mapType === 'EU_PRECIPITATION_CURRENT'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Europe Precipitation
            </button>
          </div>

          {/* Quick Region Jump */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-slate-500">
            <span className="text-[11px] font-medium mr-1 text-slate-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Focus:
            </span>
            <button
              onClick={() => onJumpRegion('US')}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
            >
              USA
            </button>
            <button
              onClick={() => onJumpRegion('EU')}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
            >
              Europe
            </button>
            <button
              onClick={() => onJumpRegion('WORLD')}
              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
            >
              Global
            </button>
          </div>

          {/* Action buttons & Opacity slider */}
          <div className="flex items-center gap-2">
            
            {/* Opacity control */}
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-xl border border-slate-200">
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <input
                id="radar-opacity-slider"
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={opacity}
                onChange={(e) => onChangeOpacity(parseFloat(e.target.value))}
                className="w-16 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-sky-500"
                title="Layer Opacity"
              />
              <span className="text-[10px] font-mono text-slate-600 w-7">
                {Math.round(opacity * 100)}%
              </span>
            </div>

            {/* Live Auto-Sync Toggle */}
            {onToggleAutoRefresh && (
              <button
                id="btn-radar-auto-sync"
                onClick={onToggleAutoRefresh}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  autoRefreshEnabled
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-700'
                }`}
                title="Toggle real-time auto sync"
              >
                <span className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                <span className="text-[11px]">
                  {autoRefreshEnabled ? `Live Sync (${refreshCountdown}s)` : 'Paused'}
                </span>
              </button>
            )}

            {/* Refresh Layer */}
            <button
              id="btn-radar-refresh"
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition-colors"
              title="Refresh Radar Tile Cache"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Visibility Toggle */}
            <button
              id="btn-radar-toggle-visibility"
              onClick={onToggleVisible}
              className={`p-2 rounded-xl border transition-all ${
                visible
                  ? 'bg-sky-50 border-sky-300 text-sky-600 shadow-sm'
                  : 'bg-slate-100 border-slate-200 text-slate-400 hover:text-slate-600'
              }`}
              title={visible ? 'Hide Radar Overlay' : 'Show Radar Overlay'}
            >
              {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
          </div>

        </div>

        {/* Lower row: Radar Intensity Color Legend */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-[11px]">
          
          <div className="flex items-center gap-2">
            <span className="text-slate-600 font-medium">Precipitation Radar:</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-500 mr-1">Light</span>
              <div className="flex h-2.5 rounded overflow-hidden shadow-inner border border-slate-300">
                <div className="w-6 bg-[#00e400]" title="Light Rain (< 2 mm/h)" />
                <div className="w-6 bg-[#009b00]" title="Moderate Rain (2-4 mm/h)" />
                <div className="w-6 bg-[#ffff00]" title="Moderate-Heavy (4-8 mm/h)" />
                <div className="w-6 bg-[#ff7e00]" title="Heavy Rain (8-16 mm/h)" />
                <div className="w-6 bg-[#ff0000]" title="Very Heavy (16-32 mm/h)" />
                <div className="w-6 bg-[#99004c]" title="Extreme / Severe (> 32 mm/h)" />
                <div className="w-6 bg-[#7e0023]" title="Hail / Severe Storm" />
              </div>
              <span className="text-[10px] text-slate-500 ml-1">Heavy</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <span className="flex items-center gap-1.5" title="Google Maps Weather Map Tiles provide the real-time Doppler radar mosaic current scan.">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-slate-700">Real-Time Doppler Radar Scan</span>
            </span>
            <span className="font-mono text-slate-400">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
            </span>
          </div>

        </div>

      </div>
    </div>
  </div>
  );
}
