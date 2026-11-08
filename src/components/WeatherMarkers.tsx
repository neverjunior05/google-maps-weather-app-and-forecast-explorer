/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Wind, Droplets, CloudRain, Sun, AlertTriangle, Eye, Gauge, Compass, MapPin, X, Clock, Layers, Sparkles } from 'lucide-react';
import { LocationWeatherBundle, WeatherLocation } from '../types/weather';
import { PRESET_LOCATIONS } from '../utils/mockWeatherData';
import { panToWithVerticalOffset } from '../utils/mapUtils';

interface WeatherMarkersProps {
  selectedLocation: WeatherLocation;
  currentBundle: LocationWeatherBundle | null;
  onSelectLocation: (loc: WeatherLocation) => void;
  showStations: boolean;
  autoRefreshEnabled?: boolean;
  refreshCountdown?: number;
  onRefreshWeather?: () => void;
}

export function WeatherMarkers({
  selectedLocation,
  currentBundle,
  onSelectLocation,
  showStations,
  autoRefreshEnabled = true,
  refreshCountdown = 45,
  onRefreshWeather,
}: WeatherMarkersProps) {
  const map = useMap();
  const [showInfoWindow, setShowInfoWindow] = useState(true);
  const [hoveredSegmentIdx, setHoveredSegmentIdx] = useState<number | null>(null);
  const [timeframeMode, setTimeframeMode] = useState<'1H' | '2H' | '6H'>('1H');
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setShowInfoWindow(true);
  }, [selectedLocation.id]);

  const isManual = selectedLocation.isManual || selectedLocation.id.startsWith('custom-') || selectedLocation.id.startsWith('loc-');
  const current = currentBundle?.current;
  const isUnsupported = !!currentBundle?.isUnsupportedLocation;
  const temp = current?.temperature?.degrees;
  const feelsLike = current?.feelsLikeTemperature?.degrees;
  const conditionText = isUnsupported
    ? 'Out of Coverage'
    : current?.weatherCondition?.description?.text || (current ? 'Clear' : 'Loading...');

  const minuteNowcast = currentBundle?.minuteNowcast;
  const rawSegments = minuteNowcast?.segments || currentBundle?.minutes || [];
  const timeZoneId = minuteNowcast?.timeZone?.id || selectedLocation.timezone || '';
  const overallTimeframe = minuteNowcast?.overallPredictionTimeframe;

  // Filter segments based on timeframe mode (1H: 4 segments/60m, 2H: 8 segments/120m, 6H: all 24 segments)
  const displaySegments = useMemo(() => {
    if (!rawSegments || rawSegments.length === 0) return [];
    if (timeframeMode === '1H') {
      return rawSegments.slice(0, Math.min(rawSegments.length, 4));
    }
    if (timeframeMode === '2H') {
      return rawSegments.slice(0, Math.min(rawSegments.length, 8));
    }
    return rawSegments;
  }, [rawSegments, timeframeMode]);

  // Compute minute forecast summary across display segments
  const minuteSummary = useMemo(() => {
    if (!rawSegments || rawSegments.length === 0) return null;
    let rainStart = -1;
    let rainEnd = -1;
    let maxProb = 0;
    let maxQpf = 0;
    let precipType = 'Rain';
    let peakIntensity = 'NO_INTENSITY';

    rawSegments.forEach((seg, i) => {
      const p = seg.probability ?? seg.precipitation?.probability?.percent ?? 0;
      const q = seg.qpf?.quantity ?? seg.precipitation?.qpf?.quantity ?? 0;
      const t = seg.type ?? seg.precipitation?.type;
      const intens = seg.intensity ?? seg.precipitation?.intensity;

      if (t && t !== 'NONE') precipType = t === 'RAIN' ? 'Rain' : t === 'SNOW' ? 'Snow' : t;
      if (p > maxProb) maxProb = p;
      if (q > maxQpf) maxQpf = q;
      if (intens && intens !== 'NO_INTENSITY') peakIntensity = intens;

      if (p >= 20 && rainStart === -1) rainStart = i;
      if (rainStart !== -1 && p < 20 && rainEnd === -1) rainEnd = i;
    });

    const formatIntensity = (i: string) => {
      if (i === 'LIGHT') return 'Light';
      if (i === 'MODERATE') return 'Moderate';
      if (i === 'HEAVY') return 'Heavy';
      if (i === 'VERY_HEAVY') return 'Very Heavy';
      return '';
    };

    const intensText = formatIntensity(peakIntensity);

    if (maxProb < 15) {
      return {
        headline: `No ${precipType.toLowerCase()} expected`,
        detail: 'Dry conditions projected over the 6-hour prediction window.',
        isRaining: false,
        maxProb,
        maxQpf,
        precipType,
        intensity: 'None',
      };
    }
    if (rainStart === 0) {
      return {
        headline: `${intensText ? `${intensText} ` : ''}${precipType} active now`,
        detail: `Peak probability ${maxProb}% with ~${maxQpf} mm quantity.`,
        isRaining: true,
        maxProb,
        maxQpf,
        precipType,
        intensity: intensText,
      };
    }
    if (rainStart > 0) {
      return {
        headline: `${precipType} expected in timeframe`,
        detail: `Precipitation chance climbs to ${maxProb}% within ~${rainStart * 15} min.`,
        isRaining: true,
        maxProb,
        maxQpf,
        precipType,
        intensity: intensText,
      };
    }
    return {
      headline: `Scattered ${precipType.toLowerCase()} possible`,
      detail: `Variable chances (peak ${maxProb}%).`,
      isRaining: true,
      maxProb,
      maxQpf,
      precipType,
      intensity: intensText,
    };
  }, [rawSegments]);

  // Format ISO timestamps to local time hh:mm
  const formatTimeOnly = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '';
    }
  };

  // Dropped Red Pin (Teardrop needle-point pin for manual clicks on map)
  const manualDroppedPinIcon = {
    url: `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46"><filter id="s" x="0" y="0" width="36" height="46"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="%230f172a" flood-opacity="0.4"/></filter><path d="M18 2C9.163 2 2 9.163 2 18c0 11.5 16 26 16 26s16-14.5 16-26c0-8.837-7.163-16-16-16z" fill="%23ea4335" stroke="%23ffffff" stroke-width="2" filter="url(%23s)"/><circle cx="18" cy="18" r="6" fill="%23ffffff"/><circle cx="18" cy="18" r="3" fill="%23b91c1c"/></svg>`,
    scaledSize: { width: 34, height: 44 } as google.maps.Size,
    anchor: { x: 17, y: 44 } as google.maps.Point,
  };

  // Selected Location Blue Teardrop Pin (for searched / preset cities)
  const defaultActivePinIcon = {
    url: `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46"><filter id="s" x="0" y="0" width="36" height="46"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="%230f172a" flood-opacity="0.35"/></filter><path d="M18 2C9.163 2 2 9.163 2 18c0 11.5 16 26 16 26s16-14.5 16-26c0-8.837-7.163-16-16-16z" fill="%230284c7" stroke="%23ffffff" stroke-width="2" filter="url(%23s)"/><circle cx="18" cy="18" r="6" fill="%23ffffff"/><circle cx="18" cy="18" r="3" fill="%230369a1"/></svg>`,
    scaledSize: { width: 34, height: 44 } as google.maps.Size,
    anchor: { x: 17, y: 44 } as google.maps.Point,
  };

  // Station dot icon in light mode
  const stationIcon = {
    url: `data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="10" fill="%23ffffff" stroke="%2364748b" stroke-width="2.5"/><circle cx="14" cy="14" r="4" fill="%230284c7"/></svg>`,
    scaledSize: { width: 20, height: 20 } as google.maps.Size,
    anchor: { x: 10, y: 10 } as google.maps.Point,
  };

  return (
    <>
      {/* Selected Location Pin (Teardrop Needle Pin) */}
      <Marker
        position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
        title={`${selectedLocation.name} ${temp !== undefined ? `${temp}°` : ''}`}
        zIndex={100}
        icon={isManual ? manualDroppedPinIcon : defaultActivePinIcon}
        animation={isManual ? google.maps.Animation.DROP : undefined}
        onClick={() => {
          setShowInfoWindow((prev) => {
            const next = !prev;
            if (next && map) {
              panToWithVerticalOffset(map, selectedLocation.lat, selectedLocation.lng);
            }
            return next;
          });
        }}
      />

      {/* Focused Google Weather Minute Forecast Card: Desktop InfoWindow vs Mobile Floating Sheet */}
      {showInfoWindow && !isMobile && (
        <InfoWindow
          position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
          pixelOffset={[0, -48]}
          disableAutoPan={true}
          onCloseClick={() => setShowInfoWindow(false)}
        >
          <div
            className="w-[300px] sm:w-[330px] max-h-[min(380px,calc(100vh-210px))] overflow-y-auto overscroll-contain p-0.5 text-slate-800 font-sans text-xs"
            onWheel={(e) => e.stopPropagation()}
          >
            {/* Top API Badge & Location Header (NO Lat/Lng coordinates displayed) */}
            <div className="border-b border-slate-100 pb-2 mb-2">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200/80 text-[10px] font-bold text-sky-700">
                  <CloudRain className="w-3 h-3 text-sky-600" />
                  Google Weather · forecast/minutes
                </span>
                {timeZoneId && (
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[120px]">
                    {timeZoneId}
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between gap-2">
                <h4 className="text-sm font-black text-slate-900 truncate">
                  {selectedLocation.name}
                </h4>
                {selectedLocation.country && (
                  <div className="text-[10px] font-medium text-slate-500 shrink-0">
                    {selectedLocation.region ? `${selectedLocation.region}, ` : ''}{selectedLocation.country}
                  </div>
                )}
              </div>

              {/* Current Temperature & Condition in one sleek row */}
              {!isUnsupported && current && (
                <div className="flex items-center justify-between mt-1 text-[11px]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-slate-900">
                      {temp !== undefined ? `${temp}°` : '--'}
                    </span>
                    <span className="text-slate-600">
                      {conditionText}
                    </span>
                    {feelsLike !== undefined && (
                      <span className="text-[10px] text-slate-600 font-medium ml-1">
                        (Feels {feelsLike}°)
                      </span>
                    )}
                  </div>

                  {overallTimeframe && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      6h ({formatTimeOnly(overallTimeframe.startTime)}–{formatTimeOnly(overallTimeframe.endTime)})
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* If location is unsupported (e.g. 404 outside US/EU or excluded territory) */}
            {isUnsupported ? (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-950">HTTP 404 · Out of Coverage</div>
                  <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    {selectedLocation.country === 'Japan' ||
                    selectedLocation.country === 'South Korea' ||
                    (currentBundle?.isUnsupportedLocation && !current) ? (
                      <>
                        The Google Maps Platform Weather API currently does not cover{' '}
                        <strong className="font-semibold text-amber-950">
                          {selectedLocation.name || selectedLocation.country || 'this region'}
                        </strong>{' '}
                        due to regional meteorological licensing exclusions (e.g. Japan and South Korea are excluded under local JMA/KMA agreements). Live weather is available in North America, Europe, Taiwan, Singapore, and Australia.
                      </>
                    ) : (
                      <>
                        Google Maps Platform Minute Forecast (<code className="font-mono text-[10px]">forecast/minutes:lookup</code>) is active for US and Europe. Global 24h & 10-day forecasts remain active.
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Minute Forecast Headline Banner */}
                {minuteSummary && (
                  <div
                    className={`p-2 rounded-xl border flex items-start justify-between gap-2 ${
                      minuteSummary.isRaining
                        ? 'bg-sky-50/95 border-sky-200 text-sky-950 shadow-xs'
                        : 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-xs'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-xs flex items-center gap-1.5 truncate">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${minuteSummary.isRaining ? 'bg-sky-500 animate-ping' : 'bg-emerald-500'}`} />
                        <span className="truncate">{minuteSummary.headline}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                        {minuteSummary.detail}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black font-mono px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 text-sky-700">
                        {minuteSummary.maxProb}%
                      </span>
                      {minuteSummary.maxQpf > 0 && (
                        <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                          {minuteSummary.maxQpf} mm
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 6-Hour Timeframe Duration Toggle */}
                {rawSegments && rawSegments.length > 0 && (
                  <div className="flex items-center justify-between bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <span className="text-slate-500 px-1.5">View Timeframe:</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setTimeframeMode('1H')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          timeframeMode === '1H'
                            ? 'bg-white text-sky-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        1 Hour
                      </button>
                      <button
                        onClick={() => setTimeframeMode('2H')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          timeframeMode === '2H'
                            ? 'bg-white text-sky-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        2 Hours
                      </button>
                      <button
                        onClick={() => setTimeframeMode('6H')}
                        className={`px-2 py-0.5 rounded-md transition-all ${
                          timeframeMode === '6H'
                            ? 'bg-white text-sky-700 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        6h (Full)
                      </button>
                    </div>
                  </div>
                )}

                {/* High-Definition SVG Trend Graph from forecast/minutes:lookup */}
                {displaySegments && displaySegments.length > 0 && (
                  <div className="space-y-1.5 bg-slate-50/90 p-2 rounded-xl border border-slate-200/90">
                    <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-sky-500" />
                        {timeframeMode === '1H' ? '0–60 Min' : timeframeMode === '2H' ? '0–2 Hour' : '0–6 Hour'} Precip Nowcast
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">
                        {displaySegments.length} Segments
                      </span>
                    </div>

                    {/* SVG Curve Chart */}
                    <div className="relative w-full h-14 bg-white rounded-lg border border-slate-200/80 overflow-hidden px-1 pt-1">
                      <svg viewBox="0 0 280 48" className="w-full h-full pointer-events-none" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="infoWindowPrecipGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        {/* Grid guidelines */}
                        <line x1="0" y1="12" x2="280" y2="12" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                        <line x1="0" y1="24" x2="280" y2="24" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                        <line x1="0" y1="36" x2="280" y2="36" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />

                        {/* Area Fill */}
                        {(() => {
                          const count = displaySegments.length;
                          const pts = displaySegments.map((seg, i) => {
                            const p = seg.probability ?? seg.precipitation?.probability?.percent ?? 0;
                            const x = count > 1 ? (i / (count - 1)) * 280 : 140;
                            const y = 46 - (p / 100) * 40;
                            return { x, y, p, i };
                          });

                          if (pts.length === 0) return null;

                          let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                          for (let i = 1; i < pts.length; i++) {
                            const prev = pts[i - 1];
                            const curr = pts[i];
                            const midX = (prev.x + curr.x) / 2;
                            d += ` C ${midX.toFixed(1)},${prev.y.toFixed(1)} ${midX.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
                          }
                          const area = `${d} L 280,48 L 0,48 Z`;

                          return (
                            <>
                              <path d={area} fill="url(#infoWindowPrecipGrad)" />
                              <path d={d} fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" />
                            </>
                          );
                        })()}

                        {/* Hover indicator vertical line & dot */}
                        {hoveredSegmentIdx !== null && displaySegments.length > 0 && (() => {
                          const count = displaySegments.length;
                          const seg = displaySegments[hoveredSegmentIdx];
                          if (!seg) return null;
                          const p = seg.probability ?? seg.precipitation?.probability?.percent ?? 0;
                          const x = count > 1 ? (hoveredSegmentIdx / (count - 1)) * 280 : 140;
                          const y = 46 - (p / 100) * 40;
                          return (
                            <g>
                              <line
                                x1={x}
                                y1="0"
                                x2={x}
                                y2="48"
                                stroke="#0284c7"
                                strokeWidth="1.5"
                                strokeDasharray="2,2"
                              />
                              <circle
                                cx={x}
                                cy={y}
                                r="3.5"
                                fill="#0284c7"
                                stroke="#ffffff"
                                strokeWidth="1.5"
                              />
                            </g>
                          );
                        })()}
                      </svg>

                      {/* Interactive scrubber overlay with touch-pan-y so vertical scrolling works seamlessly */}
                      <div
                        className="absolute inset-0 cursor-crosshair touch-pan-y"
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          const idx = Math.min(displaySegments.length - 1, Math.round(relX * (displaySegments.length - 1)));
                          setHoveredSegmentIdx(idx);
                        }}
                        onMouseLeave={() => setHoveredSegmentIdx(null)}
                        onTouchMove={(e) => {
                          const touch = e.touches[0];
                          if (!touch) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const relX = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
                          const idx = Math.min(displaySegments.length - 1, Math.round(relX * (displaySegments.length - 1)));
                          setHoveredSegmentIdx(idx);
                        }}
                        onTouchEnd={() => setHoveredSegmentIdx(null)}
                      />
                    </div>

                    {/* Timeline Labels based on timeframe */}
                    <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 px-0.5">
                      {timeframeMode === '1H' && (
                        <>
                          <span className="font-bold text-slate-700">Now</span>
                          <span>+15m</span>
                          <span>+30m</span>
                          <span>+45m</span>
                          <span>+60m</span>
                        </>
                      )}
                      {timeframeMode === '2H' && (
                        <>
                          <span className="font-bold text-slate-700">Now</span>
                          <span>+30m</span>
                          <span>+1h</span>
                          <span>+1.5h</span>
                          <span>+2h</span>
                        </>
                      )}
                      {timeframeMode === '6H' && (
                        <>
                          <span className="font-bold text-slate-700">Now</span>
                          <span>+1.5h</span>
                          <span>+3.0h</span>
                          <span>+4.5h</span>
                          <span>+6.0h</span>
                        </>
                      )}
                    </div>

                    {/* Stable, zero-layout-shift detail bar that NEVER breaks scrolling or shifts scroll height */}
                    <div className="h-10 min-h-[40px] px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] flex items-center justify-between select-none">
                      {hoveredSegmentIdx !== null && displaySegments[hoveredSegmentIdx] ? (() => {
                        const seg = displaySegments[hoveredSegmentIdx];
                        const prob = seg.probability ?? seg.precipitation?.probability?.percent ?? 0;
                        const qpf = seg.qpf?.quantity ?? seg.precipitation?.qpf?.quantity;
                        const intens = seg.intensity ?? seg.precipitation?.intensity;
                        const startTimeStr = formatTimeOnly(seg.timeFrame?.startTime || seg.interval?.startTime);
                        const endTimeStr = formatTimeOnly(seg.timeFrame?.endTime || seg.interval?.endTime);

                        return (
                          <div className="w-full flex items-center justify-between">
                            <div className="flex flex-col min-w-0 pr-1">
                              <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                <span>Seg {hoveredSegmentIdx + 1}/{displaySegments.length}</span>
                                {startTimeStr && (
                                  <span className="font-mono text-slate-400 text-[9px]">({startTimeStr}–{endTimeStr})</span>
                                )}
                              </div>
                              <div className="text-[9px] text-slate-400 truncate">
                                Intensity: <span className="text-slate-200 font-medium">{intens || 'None'}</span>
                                {qpf !== undefined && qpf > 0 && (
                                  <span className="ml-1 text-sky-300">({qpf} mm)</span>
                                )}
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="font-mono text-xs font-black text-sky-300">
                                {prob}%
                              </span>
                              <span className="text-[9px] text-slate-400 ml-1">chance</span>
                            </div>
                          </div>
                        );
                      })() : (
                        <div className="w-full flex items-center justify-between text-slate-400 text-[10px]">
                          <div className="flex items-center gap-1.5 truncate">
                            <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                            <span className="truncate">
                              {timeframeMode === '1H' ? '0–60m Nowcast' : timeframeMode === '2H' ? '0–2h Nowcast' : '0–6h Full Nowcast'}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">
                            Hover or scrub curve
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Additional Minute Data & Status */}
                <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="truncate max-w-[180px]">
                      {overallTimeframe ? `6h Prediction (${displaySegments.length} segments)` : 'Real-time Nowcast'}
                    </span>
                  </div>

                  {onRefreshWeather && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRefreshWeather();
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors text-[10px]"
                      title="Refresh forecast"
                    >
                      Refresh
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </InfoWindow>
      )}

      {/* Floating Mobile Weather Nowcast Sheet (Ensures 100% visibility on mobile screens without being cropped) */}
      {showInfoWindow && isMobile && (
        <div className="fixed bottom-36 left-3 right-3 z-30 bg-white/98 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 p-3 max-h-[46vh] overflow-y-auto overscroll-contain animate-in slide-in-from-bottom-4 duration-200 text-slate-800 text-xs select-none">
          <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-2" />

          {/* Top API Badge & Location Header */}
          <div className="border-b border-slate-100 pb-2 mb-2">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200/80 text-[10px] font-bold text-sky-700">
                <CloudRain className="w-3 h-3 text-sky-600" />
                Google Weather · forecast/minutes
              </span>
              <div className="flex items-center gap-1.5">
                {timeZoneId && (
                  <span className="text-[10px] font-mono text-slate-500 truncate max-w-[110px]">
                    {timeZoneId}
                  </span>
                )}
                <button
                  onClick={() => setShowInfoWindow(false)}
                  className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-sm font-black text-slate-900 truncate">
                {selectedLocation.name}
              </h4>
              {selectedLocation.country && (
                <div className="text-[10px] font-medium text-slate-500 shrink-0">
                  {selectedLocation.region ? `${selectedLocation.region}, ` : ''}{selectedLocation.country}
                </div>
              )}
            </div>

            {/* Current Temperature & Condition in one sleek row */}
            {!isUnsupported && current && (
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <div className="flex items-baseline gap-1">
                  <span className="text-base font-black text-slate-900">
                    {temp !== undefined ? `${temp}°` : '--'}
                  </span>
                  <span className="text-slate-600">
                    {conditionText}
                  </span>
                  {feelsLike !== undefined && (
                    <span className="text-[10px] text-slate-600 font-medium ml-1">
                      (Feels {feelsLike}°)
                    </span>
                  )}
                </div>

                {overallTimeframe && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    6h ({formatTimeOnly(overallTimeframe.startTime)}–{formatTimeOnly(overallTimeframe.endTime)})
                  </div>
                )}
              </div>
            )}
          </div>

          {/* If location is unsupported */}
          {isUnsupported ? (
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-950">HTTP 404 · Out of Coverage</div>
                <div className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  {selectedLocation.country === 'Japan' ||
                  selectedLocation.country === 'South Korea' ||
                  (currentBundle?.isUnsupportedLocation && !current) ? (
                    <>
                      Google Maps Platform Weather API does not currently cover{' '}
                      <strong className="font-semibold text-amber-950">
                        {selectedLocation.name || selectedLocation.country || 'this region'}
                      </strong>{' '}
                      due to regional meteorological licensing exclusions (Japan & South Korea).
                    </>
                  ) : (
                    <>
                      Google Maps Platform Minute Forecast (<code className="font-mono text-[10px]">forecast/minutes:lookup</code>) is active for US and Europe. Global 24h & 10-day forecasts remain active.
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Minute Forecast Headline Banner */}
              {minuteSummary && (
                <div
                  className={`p-2 rounded-xl border flex items-start justify-between gap-2 ${
                    minuteSummary.isRaining
                      ? 'bg-sky-50/95 border-sky-200 text-sky-950 shadow-xs'
                      : 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-xs'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-bold text-xs flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${minuteSummary.isRaining ? 'bg-sky-500 animate-ping' : 'bg-emerald-500'}`} />
                      <span className="truncate">{minuteSummary.headline}</span>
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                      {minuteSummary.detail}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black font-mono px-1.5 py-0.5 rounded bg-white/90 border border-slate-200 text-sky-700">
                      {minuteSummary.maxProb}%
                    </span>
                    {minuteSummary.maxQpf > 0 && (
                      <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                        {minuteSummary.maxQpf} mm
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6-Hour Timeframe Duration Toggle */}
              {rawSegments && rawSegments.length > 0 && (
                <div className="flex items-center justify-between bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                  <span className="text-slate-500 px-1.5">View Timeframe:</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setTimeframeMode('1H')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        timeframeMode === '1H'
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      1 Hour
                    </button>
                    <button
                      onClick={() => setTimeframeMode('2H')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        timeframeMode === '2H'
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      2 Hours
                    </button>
                    <button
                      onClick={() => setTimeframeMode('6H')}
                      className={`px-2 py-0.5 rounded-md transition-all ${
                        timeframeMode === '6H'
                          ? 'bg-white text-sky-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      6h (Full)
                    </button>
                  </div>
                </div>
              )}

              {/* High-Definition SVG Trend Graph */}
              {displaySegments && displaySegments.length > 0 && (
                <div className="space-y-1.5 bg-slate-50/90 p-2 rounded-xl border border-slate-200/90">
                  <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium">
                    <span className="font-bold text-slate-800 flex items-center gap-1">
                      <Droplets className="w-3 h-3 text-sky-500" />
                      {timeframeMode === '1H' ? '0–60 Min' : timeframeMode === '2H' ? '0–2 Hour' : '0–6 Hour'} Precip Nowcast
                    </span>
                    <span className="font-mono text-[9px] text-slate-500">
                      {displaySegments.length} Segments
                    </span>
                  </div>

                  <div className="relative w-full h-14 bg-white rounded-lg border border-slate-200/80 overflow-hidden px-1 pt-1">
                    <svg viewBox="0 0 280 48" className="w-full h-full pointer-events-none" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="infoWindowPrecipGradMobile" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
                          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      <line x1="0" y1="12" x2="280" y2="12" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="0" y1="24" x2="280" y2="24" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
                      <line x1="0" y1="36" x2="280" y2="36" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />

                      {(() => {
                        const count = displaySegments.length;
                        const pts = displaySegments.map((seg, i) => {
                          const p = seg.probability ?? seg.precipitation?.probability?.percent ?? 0;
                          const x = count > 1 ? (i / (count - 1)) * 280 : 140;
                          const y = 46 - (p / 100) * 40;
                          return { x, y, p, i };
                        });

                        if (pts.length === 0) return null;

                        let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
                        for (let i = 1; i < pts.length; i++) {
                          const prev = pts[i - 1];
                          const curr = pts[i];
                          const midX = (prev.x + curr.x) / 2;
                          d += ` C ${midX.toFixed(1)},${prev.y.toFixed(1)} ${midX.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
                        }
                        const area = `${d} L 280,48 L 0,48 Z`;

                        return (
                          <>
                            <path d={area} fill="url(#infoWindowPrecipGradMobile)" />
                            <path
                              d={d}
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </>
                        );
                      })()}

                      {hoveredSegmentIdx !== null && displaySegments[hoveredSegmentIdx] && (() => {
                        const count = displaySegments.length;
                        const seg = displaySegments[hoveredSegmentIdx];
                        const p = seg.probability ?? seg.precipitation?.probability?.percent ?? 0;
                        const x = count > 1 ? (hoveredSegmentIdx / (count - 1)) * 280 : 140;
                        const y = 46 - (p / 100) * 40;
                        return (
                          <g>
                            <line x1={x} y1="0" x2={x} y2="48" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="2,2" />
                            <circle cx={x} cy={y} r="3.5" fill="#0284c7" stroke="#ffffff" strokeWidth="1.5" />
                          </g>
                        );
                      })()}
                    </svg>

                    <div className="absolute inset-0 flex touch-pan-y">
                      {displaySegments.map((_, i) => (
                        <div
                          key={i}
                          className="flex-1 h-full cursor-crosshair"
                          onMouseEnter={() => setHoveredSegmentIdx(i)}
                          onTouchStart={() => setHoveredSegmentIdx(i)}
                          onTouchEnd={() => setHoveredSegmentIdx(null)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 px-0.5">
                    {timeframeMode === '1H' && (
                      <>
                        <span className="font-bold text-slate-700">Now</span>
                        <span>+15m</span>
                        <span>+30m</span>
                        <span>+45m</span>
                        <span>+60m</span>
                      </>
                    )}
                    {timeframeMode === '2H' && (
                      <>
                        <span className="font-bold text-slate-700">Now</span>
                        <span>+30m</span>
                        <span>+1h</span>
                        <span>+1.5h</span>
                        <span>+2h</span>
                      </>
                    )}
                    {timeframeMode === '6H' && (
                      <>
                        <span className="font-bold text-slate-700">Now</span>
                        <span>+1.5h</span>
                        <span>+3.0h</span>
                        <span>+4.5h</span>
                        <span>+6.0h</span>
                      </>
                    )}
                  </div>

                  {/* Stable detail bar that never shifts layout or scroll height */}
                  <div className="h-10 min-h-[40px] px-2 py-1 rounded-lg bg-slate-900 text-white text-[10px] flex items-center justify-between select-none">
                    {hoveredSegmentIdx !== null && displaySegments[hoveredSegmentIdx] ? (() => {
                      const seg = displaySegments[hoveredSegmentIdx];
                      const prob = seg.probability ?? seg.precipitation?.probability?.percent ?? 0;
                      const qpf = seg.qpf?.quantity ?? seg.precipitation?.qpf?.quantity;
                      const intens = seg.intensity ?? seg.precipitation?.intensity;
                      const startTimeStr = formatTimeOnly(seg.timeFrame?.startTime || seg.interval?.startTime);
                      const endTimeStr = formatTimeOnly(seg.timeFrame?.endTime || seg.interval?.endTime);

                      return (
                        <div className="w-full flex items-center justify-between">
                          <div className="flex flex-col min-w-0 pr-1">
                            <div className="font-semibold text-slate-200 truncate flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                              <span>Seg {hoveredSegmentIdx + 1}/{displaySegments.length}</span>
                              {startTimeStr && (
                                <span className="font-mono text-slate-400 text-[9px]">({startTimeStr}–{endTimeStr})</span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">
                              Intensity: <span className="text-slate-200 font-medium">{intens || 'None'}</span>
                              {qpf !== undefined && qpf > 0 && (
                                <span className="ml-1 text-sky-300">({qpf} mm)</span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-black text-sky-300">
                              {prob}%
                            </span>
                            <span className="text-[9px] text-slate-400 ml-1">chance</span>
                          </div>
                        </div>
                      );
                    })() : (
                      <div className="w-full flex items-center justify-between text-slate-400 text-[10px]">
                        <div className="flex items-center gap-1.5 truncate">
                          <Clock className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="truncate">
                            {timeframeMode === '1H' ? '0–60m Nowcast' : timeframeMode === '2H' ? '0–2h Nowcast' : '0–6h Full Nowcast'}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-400 shrink-0">
                          Tap or scrub curve
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Status & Refresh Footer */}
              <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-600">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate max-w-[180px]">
                    {overallTimeframe ? `6h Prediction (${displaySegments.length} segments)` : 'Real-time Nowcast'}
                  </span>
                </div>

                {onRefreshWeather && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshWeather();
                    }}
                    className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors text-[10px]"
                    title="Refresh forecast"
                  >
                    Refresh
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preset Weather Stations Pins */}
      {showStations &&
        PRESET_LOCATIONS.filter(
          (loc) =>
            loc.id !== selectedLocation.id &&
            (Math.abs(loc.lat - selectedLocation.lat) > 0.05 || Math.abs(loc.lng - selectedLocation.lng) > 0.05)
        ).map((station) => (
          <Marker
            key={station.id}
            position={{ lat: station.lat, lng: station.lng }}
            title={station.name}
            zIndex={20}
            icon={stationIcon}
            onClick={() => {
              onSelectLocation(station);
              setShowInfoWindow(true);
            }}
          />
        ))}
    </>
  );
}
