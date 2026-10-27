import React, { useState, useMemo } from 'react';
import { TelemetrySample } from '../types/telemetry';

interface RealtimeChartProps {
  samples: TelemetrySample[];
  currentWatts: number;
  currentCadence: number;
  currentHr: number;
}

export const RealtimeChart: React.FC<RealtimeChartProps> = ({
  samples,
  currentWatts,
  currentCadence,
  currentHr,
}) => {
  const [timeRange, setTimeRange] = useState<'60s' | '180s' | 'all'>('60s');
  const [activeMetric, setActiveMetric] = useState<'all' | 'watts' | 'hr' | 'cadence'>('all');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Filter samples based on time range
  const displaySamples = useMemo(() => {
    if (samples.length === 0) return [];
    if (timeRange === 'all') return samples;
    const windowSec = timeRange === '60s' ? 60 : 180;
    return samples.slice(-windowSec);
  }, [samples, timeRange]);

  // Scalers & bounds
  const stats = useMemo(() => {
    if (displaySamples.length === 0) {
      return { maxWatts: 500, maxHr: 190, maxCadence: 100 };
    }
    const maxW = Math.max(400, ...displaySamples.map((s) => s.watts));
    const maxH = Math.max(160, ...displaySamples.map((s) => s.hr));
    const maxC = Math.max(90, ...displaySamples.map((s) => s.cadence));
    return { maxWatts: maxW * 1.1, maxHr: maxH * 1.05, maxCadence: maxC * 1.15 };
  }, [displaySamples]);

  // SVG coordinate calculations
  const width = 800;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const points = useMemo(() => {
    if (displaySamples.length < 2) return null;
    const n = displaySamples.length;

    const wattsPts: [number, number][] = [];
    const hrPts: [number, number][] = [];
    const cadencePts: [number, number][] = [];

    displaySamples.forEach((s, idx) => {
      const x = padding.left + (idx / (n - 1)) * plotWidth;
      // Watts scaled to plotHeight
      const yWatts = padding.top + plotHeight - (s.watts / stats.maxWatts) * plotHeight;
      // HR scaled to 40..maxHr
      const hrNorm = Math.max(0, (s.hr - 50) / (stats.maxHr - 50));
      const yHr = padding.top + plotHeight - hrNorm * plotHeight;
      // Cadence scaled to 0..maxCadence
      const yCadence = padding.top + plotHeight - (s.cadence / stats.maxCadence) * plotHeight;

      wattsPts.push([x, yWatts]);
      hrPts.push([x, yHr]);
      cadencePts.push([x, yCadence]);
    });

    const createPath = (pts: [number, number][]) =>
      pts.reduce((acc, [x, y], i) => (i === 0 ? `M ${x},${y}` : `${acc} L ${x},${y}`), '');

    const createArea = (pts: [number, number][]) => {
      if (pts.length === 0) return '';
      const line = createPath(pts);
      const lastX = pts[pts.length - 1][0];
      const firstX = pts[0][0];
      const bottomY = padding.top + plotHeight;
      return `${line} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
    };

    return {
      wattsPath: createPath(wattsPts),
      wattsArea: createArea(wattsPts),
      hrPath: createPath(hrPts),
      cadencePath: createPath(cadencePts),
    };
  }, [displaySamples, stats, plotWidth, plotHeight]);

  const hoveredSample = hoverIndex !== null && displaySamples[hoverIndex] ? displaySamples[hoverIndex] : null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col">
      {/* Chart Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold uppercase tracking-wider text-slate-300 font-display">
            Live Telemetry Stream
          </span>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>{displaySamples.length} sec buffer</span>
            <span aria-hidden="true">·</span>
            <span>1 Hz capture</span>
          </div>
        </div>

        {/* Metric filter buttons and range toggles */}
        <div className="flex items-center gap-2">
          {/* Series selector */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveMetric('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                activeMetric === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveMetric('watts')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                activeMetric === 'watts' ? 'bg-orange-950 text-orange-400 border border-orange-800/50' : 'text-slate-400 hover:text-orange-300'
              }`}
            >
              Power
            </button>
            <button
              onClick={() => setActiveMetric('hr')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                activeMetric === 'hr' ? 'bg-red-950 text-red-400 border border-red-800/50' : 'text-slate-400 hover:text-red-300'
              }`}
            >
              HR
            </button>
            <button
              onClick={() => setActiveMetric('cadence')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                activeMetric === 'cadence' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/50' : 'text-slate-400 hover:text-cyan-300'
              }`}
            >
              RPM
            </button>
          </div>

          {/* Time range selector */}
          <div className="flex items-center p-0.5 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setTimeRange('60s')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                timeRange === '60s' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              60s
            </button>
            <button
              onClick={() => setTimeRange('180s')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                timeRange === '180s' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3m
            </button>
            <button
              onClick={() => setTimeRange('all')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                timeRange === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full
            </button>
          </div>
        </div>
      </div>

      {/* Metric legend bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-mono mb-2 px-1">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-orange-400">
            <div className="w-2.5 h-2.5 rounded-sm bg-orange-500 shadow-sm shadow-orange-500/50" />
            <span className="font-semibold">{hoveredSample ? hoveredSample.watts : currentWatts} W</span>
            <span className="text-slate-500 text-[11px]">Power</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-400">
            <div className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span className="font-semibold">{hoveredSample ? hoveredSample.hr : currentHr} BPM</span>
            <span className="text-slate-500 text-[11px]">Heart Rate</span>
          </div>
          <div className="flex items-center gap-1.5 text-cyan-400">
            <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shadow-sm shadow-cyan-400/50" />
            <span className="font-semibold">{hoveredSample ? hoveredSample.cadence : currentCadence} RPM</span>
            <span className="text-slate-500 text-[11px]">Cadence</span>
          </div>
        </div>

        {hoveredSample && (
          <div className="text-slate-400">
            T+{hoveredSample.timestampSec}s · {hoveredSample.speedKmh} km/h · {hoveredSample.calories} kcal
          </div>
        )}
      </div>

      {/* SVG Plot Viewport */}
      <div className="relative w-full overflow-hidden bg-slate-950/60 rounded-lg border border-slate-800/60 p-1">
        {displaySamples.length < 2 ? (
          <div className="h-44 flex flex-col items-center justify-center text-slate-500 text-xs font-mono gap-1">
            <span>Awaiting telemetry samples...</span>
            <span className="text-slate-600">Start pedaling or enable simulator to stream 1 Hz metrics</span>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-44 sm:h-52 select-none"
            onMouseLeave={() => setHoverIndex(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * width;
              const plotX = relX - padding.left;
              if (plotX >= 0 && plotX <= plotWidth) {
                const idx = Math.round((plotX / plotWidth) * (displaySamples.length - 1));
                setHoverIndex(Math.max(0, Math.min(displaySamples.length - 1, idx)));
              }
            }}
          >
            <defs>
              <linearGradient id="wattsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
              const y = padding.top + plotHeight * pct;
              const wattVal = Math.round(stats.maxWatts * (1 - pct));
              return (
                <g key={i}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray={pct === 1 ? 'none' : '3 3'}
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {wattVal}w
                  </text>
                </g>
              );
            })}

            {/* Series Paths */}
            {points && (
              <>
                {/* Power Watts Area & Line */}
                {(activeMetric === 'all' || activeMetric === 'watts') && (
                  <>
                    <path d={points.wattsArea} fill="url(#wattsGradient)" />
                    <path
                      d={points.wattsPath}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    />
                  </>
                )}

                {/* Cadence Line */}
                {(activeMetric === 'all' || activeMetric === 'cadence') && (
                  <path
                    d={points.cadencePath}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="1.8"
                    strokeDasharray="4 2"
                    strokeLinecap="round"
                  />
                )}

                {/* Heart Rate Line */}
                {(activeMetric === 'all' || activeMetric === 'hr') && (
                  <path
                    d={points.hrPath}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                )}
              </>
            )}

            {/* Hover Cursor Line */}
            {hoverIndex !== null && (
              <line
                x1={padding.left + (hoverIndex / (displaySamples.length - 1)) * plotWidth}
                y1={padding.top}
                x2={padding.left + (hoverIndex / (displaySamples.length - 1)) * plotWidth}
                y2={padding.top + plotHeight}
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            )}
          </svg>
        )}
      </div>
    </div>
  );
};
