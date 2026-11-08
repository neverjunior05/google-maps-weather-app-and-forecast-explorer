import { useState, useMemo } from 'react';
import { CloudRain, Clock, Droplets, TrendingUp, TrendingDown, Activity, Sparkles, Layers } from 'lucide-react';
import { MinuteForecast, MinuteNowcastBundle, CoverageInfo, MinuteTrendSummary, MinuteHistorySnapshot } from '../types/weather';

interface MinuteForecastCardProps {
  minutes?: MinuteForecast[];
  minuteNowcast?: MinuteNowcastBundle;
  coverage?: CoverageInfo;
  trendSummary?: MinuteTrendSummary;
  historySnapshots?: MinuteHistorySnapshot[];
  refreshCountdown?: number;
  autoRefreshEnabled?: boolean;
}

export function MinuteForecastCard({
  minutes,
  minuteNowcast,
  coverage,
  trendSummary,
  historySnapshots,
}: MinuteForecastCardProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [timeframeMode, setTimeframeMode] = useState<'1H' | '2H' | '6H'>('1H');

  const rawSegments = minuteNowcast?.segments || minutes || [];
  const hasMinutesData = Array.isArray(rawSegments) && rawSegments.length > 0;
  const overallTimeframe = minuteNowcast?.overallPredictionTimeframe;
  const timeZone = minuteNowcast?.timeZone;

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

  // Compute narrative precipitation summary across segments
  const summary = useMemo(() => {
    if (!hasMinutesData || rawSegments.length === 0) return null;

    let rainStartIdx = -1;
    let rainEndIdx = -1;
    let maxProb = 0;
    let maxQpf = 0;
    let precipType = 'Rain';
    let peakIntensity = 'NO_INTENSITY';

    rawSegments.forEach((seg, idx) => {
      const prob = seg.probability ?? seg.precipitation?.probability?.percent ?? 0;
      const qpf = seg.qpf?.quantity ?? seg.precipitation?.qpf?.quantity ?? 0;
      const t = seg.type ?? seg.precipitation?.type;
      const intens = seg.intensity ?? seg.precipitation?.intensity;

      if (t && t !== 'NONE') precipType = t === 'RAIN' ? 'Rain' : t === 'SNOW' ? 'Snow' : t;
      if (prob > maxProb) maxProb = prob;
      if (qpf > maxQpf) maxQpf = qpf;
      if (intens && intens !== 'NO_INTENSITY') peakIntensity = intens;

      if (prob >= 20 && rainStartIdx === -1) {
        rainStartIdx = idx;
      }
      if (rainStartIdx !== -1 && prob < 20 && rainEndIdx === -1) {
        rainEndIdx = idx;
      }
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
        headline: 'No precipitation expected',
        description: 'Dry conditions projected over the 6-hour prediction window.',
        isRaining: false,
        maxProb,
        maxQpf,
        precipType,
        intensity: 'None',
      };
    }

    if (rainStartIdx === 0) {
      return {
        headline: `${intensText ? `${intensText} ` : ''}${precipType} active now`,
        description: `Current precipitation active with peak chance ${maxProb}% (~${maxQpf} mm quantity).`,
        isRaining: true,
        maxProb,
        maxQpf,
        precipType,
        intensity: intensText,
      };
    }

    if (rainStartIdx > 0) {
      const approxMin = rainStartIdx * 15;
      return {
        headline: `${precipType} forecasted in ~${approxMin} min`,
        description: `Precipitation chance climbs to ${maxProb}% around segment ${rainStartIdx + 1}.`,
        isRaining: true,
        maxProb,
        maxQpf,
        precipType,
        intensity: intensText,
      };
    }

    return {
      headline: `Scattered ${precipType.toLowerCase()} possible`,
      description: `Variable precipitation chances over the 6-hour window (peak ${maxProb}%).`,
      isRaining: true,
      maxProb,
      maxQpf,
      precipType,
      intensity: intensText,
    };
  }, [hasMinutesData, rawSegments]);

  // Generate SVG path points for the selected timeframe trend graph
  const { pathD, areaD, points, peakPoint } = useMemo(() => {
    if (!hasMinutesData || displaySegments.length === 0) return { pathD: '', areaD: '', points: [], peakPoint: null };

    const count = displaySegments.length;
    const width = 300;
    const height = 64;
    const paddingBottom = 4;
    const paddingTop = 6;
    const usableHeight = height - paddingTop - paddingBottom;

    const pts = displaySegments.map((seg, i) => {
      const prob = seg.probability ?? seg.precipitation?.probability?.percent ?? 0;
      const x = count > 1 ? (i / (count - 1)) * width : width / 2;
      const y = height - paddingBottom - (prob / 100) * usableHeight;
      const qpf = seg.qpf?.quantity ?? seg.precipitation?.qpf?.quantity;
      const intens = seg.intensity ?? seg.precipitation?.intensity;
      const startTime = formatTimeOnly(seg.timeFrame?.startTime || seg.interval?.startTime);
      const endTime = formatTimeOnly(seg.timeFrame?.endTime || seg.interval?.endTime);

      return {
        x,
        y,
        prob,
        index: i,
        qpf,
        intensity: intens,
        startTime,
        endTime,
        type: seg.type || seg.precipitation?.type || 'Rain',
      };
    });

    if (pts.length === 0) return { pathD: '', areaD: '', points: [], peakPoint: null };

    // Build smooth SVG path
    let d = `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const midX = (prev.x + curr.x) / 2;
      d += ` C ${midX.toFixed(1)},${prev.y.toFixed(1)} ${midX.toFixed(1)},${curr.y.toFixed(1)} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
    }

    const area = `${d} L ${pts[pts.length - 1].x.toFixed(1)},${height} L ${pts[0].x.toFixed(1)},${height} Z`;

    let peak = pts[0];
    pts.forEach((p) => {
      if (p.prob > peak.prob) peak = p;
    });

    return { pathD: d, areaD: area, points: pts, peakPoint: peak.prob > 0 ? peak : null };
  }, [hasMinutesData, displaySegments]);

  if (!hasMinutesData) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Clock className="w-4 h-4 text-sky-600" />
            <span>Minute-by-Minute Nowcast (6-Hour Window)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-medium border border-slate-200">
            US & Europe Only
          </span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Google Maps Platform Minute-by-Minute Nowcast (<code className="font-mono text-[10px]">forecast:minutes</code>) provides up to 6 hours of high-resolution nowcasting for United States and European territories. Hourly and 10-day forecasts remain active globally.
        </p>
      </div>
    );
  }

  const activePoint = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs flex flex-col gap-3 select-none">
      {/* Header with endpoint & timezone info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center border border-sky-100">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 tracking-tight">
              Precipitation Nowcast
            </h3>
            <p className="text-[10px] text-slate-500 font-medium font-mono">
              forecast:minutes · 6-Hour Window
            </p>
          </div>
        </div>

        {summary && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
              summary.isRaining
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            {summary.isRaining ? `${summary.maxProb}% Peak Chance` : 'Dry Conditions'}
          </span>
        )}
      </div>

      {/* Prediction Timeframe and Timezone Bar */}
      {overallTimeframe && (
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-[10px]">
          <div className="flex items-center gap-1 text-slate-600">
            <Clock className="w-3 h-3 text-sky-500" />
            <span>Timeframe:</span>
            <span className="font-bold text-slate-900 font-mono">
              {formatTimeOnly(overallTimeframe.startTime)} → {formatTimeOnly(overallTimeframe.endTime)}
            </span>
          </div>
          {timeZone?.id && (
            <span className="font-mono text-slate-500 text-[9px] truncate max-w-[130px]">
              {timeZone.id}
            </span>
          )}
        </div>
      )}

      {/* Narrative Headline */}
      {summary && (
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2 text-xs">
          <Droplets className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-900">{summary.headline}</div>
            <div className="text-[11px] text-slate-600 mt-0.5">{summary.description}</div>
          </div>
        </div>
      )}

      {/* Timeframe Duration Toggle (1H / 2H / 6H) */}
      <div className="flex items-center justify-between bg-slate-100 p-0.5 rounded-xl text-[10px] font-bold">
        <span className="text-slate-500 px-2 flex items-center gap-1">
          <Layers className="w-3 h-3 text-slate-500" />
          Resolution:
        </span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setTimeframeMode('1H')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              timeframeMode === '1H'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1 Hour
          </button>
          <button
            onClick={() => setTimeframeMode('2H')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              timeframeMode === '2H'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            2 Hours
          </button>
          <button
            onClick={() => setTimeframeMode('6H')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              timeframeMode === '6H'
                ? 'bg-white text-sky-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            6 Hours (Full)
          </button>
        </div>
      </div>

      {/* Interactive Trend Graph */}
      <div className="relative pt-1">
        <div className="relative w-full h-20 bg-slate-50/80 rounded-xl border border-slate-100 overflow-hidden px-2 pt-2">
          {/* Subtle horizontal grid lines */}
          <div className="absolute inset-x-2 top-2 h-[1px] bg-slate-200/50 border-dashed" />
          <div className="absolute inset-x-2 top-1/2 h-[1px] bg-slate-200/40" />

          {/* SVG Curve Graph */}
          <svg
            viewBox="0 0 300 64"
            preserveAspectRatio="none"
            className="w-full h-16 overflow-visible"
          >
            <defs>
              <linearGradient id="rainGradientCard" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Filled area */}
            <path d={areaD} fill="url(#rainGradientCard)" />

            {/* Main Trend Line */}
            <path
              d={pathD}
              fill="none"
              stroke="#0284c7"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Peak point indicator */}
            {peakPoint && (
              <g>
                <circle cx={peakPoint.x} cy={peakPoint.y} r="3.5" fill="#0369a1" stroke="#ffffff" strokeWidth="1.5" />
              </g>
            )}

            {/* Hover Scrubber Line & Dot */}
            {activePoint && (
              <g>
                <line
                  x1={activePoint.x}
                  y1="0"
                  x2={activePoint.x}
                  y2="64"
                  stroke="#0f172a"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r="4"
                  fill="#0284c7"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* Invisible hover overlay zones */}
          <div className="absolute inset-0 flex touch-pan-y">
            {points.map((p, idx) => (
              <div
                key={idx}
                className="flex-1 h-full cursor-crosshair"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onTouchStart={() => setHoveredIdx(idx)}
                onTouchEnd={() => setHoveredIdx(null)}
              />
            ))}
          </div>
        </div>

        {/* Timeline Axis Labels */}
        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 px-1 mt-1">
          {timeframeMode === '1H' && (
            <>
              <span className="font-semibold text-slate-700">Now</span>
              <span>+15m</span>
              <span>+30m</span>
              <span>+45m</span>
              <span>+60m</span>
            </>
          )}
          {timeframeMode === '2H' && (
            <>
              <span className="font-semibold text-slate-700">Now</span>
              <span>+30m</span>
              <span>+1h</span>
              <span>+1.5h</span>
              <span>+2h</span>
            </>
          )}
          {timeframeMode === '6H' && (
            <>
              <span className="font-semibold text-slate-700">Now</span>
              <span>+1.5h</span>
              <span>+3.0h</span>
              <span>+4.5h</span>
              <span>+6.0h</span>
            </>
          )}
        </div>
      </div>

      {/* Stable, zero-layout-shift detail bar that NEVER shifts layout or scroll height */}
      <div className="h-[52px] min-h-[52px] px-3 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] flex items-center justify-between select-none">
        {activePoint ? (
          <div className="w-full space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">
                  Segment {activePoint.index + 1}/{displaySegments.length}
                  {activePoint.startTime && ` (${activePoint.startTime}–${activePoint.endTime})`}
                </span>
              </div>
              <div className="font-mono text-sky-300 font-bold shrink-0 ml-2">
                {activePoint.prob}% Likelihood
              </div>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
              <span>
                Intensity: <strong className="text-slate-200 font-medium">{activePoint.intensity || 'None'}</strong>
              </span>
              {activePoint.qpf !== undefined && (
                <span>
                  Volume: <strong className="text-sky-300">{activePoint.qpf} mm</strong>
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-between text-slate-400 text-[11px]">
            <div className="flex items-center gap-1.5 truncate">
              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">
                {timeframeMode === '1H' ? '0–60 Min Resolution' : timeframeMode === '2H' ? '0–2 Hour Resolution' : '0–6 Hour Resolution'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
              Hover curve to scrub
            </span>
          </div>
        )}
      </div>

      {/* Trend Summary Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center gap-1.5">
          {trendSummary?.direction === 'INCREASING' && (
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          )}
          {trendSummary?.direction === 'DECREASING' && (
            <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />
          )}
          {(!trendSummary || trendSummary.direction.startsWith('STABLE')) && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          )}
          <span className="font-medium text-slate-700">
            {displaySegments.length} Segments ({timeframeMode === '6H' ? '6-Hour Timeframe' : `${timeframeMode} Window`})
          </span>
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          {summary ? `Peak: ${summary.maxProb}%` : ''}
        </span>
      </div>
    </div>
  );
}
