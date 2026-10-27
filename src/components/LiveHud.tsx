import React, { useState, useMemo } from 'react';
import {
  Flame,
  Gauge,
  Heart,
  Maximize2,
  Minimize2,
  Timer,
  Milestone,
  Zap,
  TrendingUp,
  Volume2,
  VolumeX,
  Activity,
} from 'lucide-react';
import { WorkoutSession, IntervalConfig, TelemetrySample } from '../types/telemetry';
import { RealtimeChart } from './RealtimeChart';

interface LiveHudProps {
  currentWatts: number;
  currentCadence: number;
  currentHr: number;
  cumulativeCalories: number;
  cumulativeDistanceMeters: number;
  elapsedSec: number;
  workoutActive: boolean;
  workoutPaused: boolean;
  activeSession: WorkoutSession | null;
  intervalConfig: IntervalConfig | null;
  maxHr: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onNextRound?: () => void;
  samples?: TelemetrySample[];
}

export const LiveHud: React.FC<LiveHudProps> = ({
  currentWatts,
  currentCadence,
  currentHr,
  cumulativeCalories,
  cumulativeDistanceMeters,
  elapsedSec,
  workoutActive,
  workoutPaused,
  activeSession,
  intervalConfig,
  maxHr,
  soundEnabled,
  onToggleSound,
  onNextRound,
  samples = [],
}) => {
  const [isKioskMode, setIsKioskMode] = useState<boolean>(false);
  const [showKioskChart, setShowKioskChart] = useState<boolean>(true);

  // Time format MM:SS
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Instantaneous Calorie Burn Rate (kcal/hr)
  const caloriesPerHour = currentWatts > 0 ? Math.round(currentWatts * 3.52) : 0;

  // Approximate 500m split pace
  const speedKmh = Math.round(currentCadence * 0.55 * 10) / 10;
  const split500mSec = speedKmh > 2 ? Math.round(500 / ((speedKmh * 1000) / 3600)) : 0;
  const formatSplit = (sec: number) => {
    if (sec === 0 || sec > 600) return '--:--';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}/500m`;
  };

  // Rolling Averages & Trends over time (5-second & 30-second windows)
  const rollingStats = useMemo(() => {
    if (samples.length === 0) {
      return {
        avgWatts5s: currentWatts,
        avgWatts30s: currentWatts,
        peakWatts: currentWatts,
        avgHr5s: currentHr,
        avgHr30s: currentHr,
        peakHr: currentHr,
        avgCadence5s: currentCadence,
        recentWatts: [currentWatts],
        recentCadence: [currentCadence],
        recentHr: [currentHr],
      };
    }

    const last5 = samples.slice(-5);
    const last30 = samples.slice(-30);
    const last45 = samples.slice(-45);

    const avgWatts5s = Math.round(last5.reduce((a, b) => a + b.watts, 0) / last5.length);
    const avgWatts30s = Math.round(last30.reduce((a, b) => a + b.watts, 0) / last30.length);
    const peakWatts = Math.max(...samples.map((s) => s.watts));

    const avgHr5s = Math.round(last5.reduce((a, b) => a + b.hr, 0) / last5.length);
    const avgHr30s = Math.round(last30.reduce((a, b) => a + b.hr, 0) / last30.length);
    const peakHr = Math.max(...samples.map((s) => s.hr));

    const avgCadence5s = Math.round((last5.reduce((a, b) => a + b.cadence, 0) / last5.length) * 10) / 10;

    return {
      avgWatts5s,
      avgWatts30s,
      peakWatts,
      avgHr5s,
      avgHr30s,
      peakHr,
      avgCadence5s,
      recentWatts: last45.map((s) => s.watts),
      recentCadence: last45.map((s) => s.cadence),
      recentHr: last45.map((s) => s.hr),
    };
  }, [samples, currentWatts, currentCadence, currentHr]);

  // HR Zone calculation
  const hrPct = maxHr > 0 ? Math.round((currentHr / maxHr) * 100) : 0;
  let hrZone = 1;
  let hrZoneColor = 'text-sky-400';
  let hrZoneBg = 'bg-sky-950/60 border-sky-800/60';
  if (hrPct >= 90) {
    hrZone = 5;
    hrZoneColor = 'text-rose-400';
    hrZoneBg = 'bg-rose-950/80 border-rose-600';
  } else if (hrPct >= 80) {
    hrZone = 4;
    hrZoneColor = 'text-orange-400';
    hrZoneBg = 'bg-orange-950/70 border-orange-600/70';
  } else if (hrPct >= 70) {
    hrZone = 3;
    hrZoneColor = 'text-yellow-400';
    hrZoneBg = 'bg-yellow-950/60 border-yellow-700/60';
  } else if (hrPct >= 60) {
    hrZone = 2;
    hrZoneColor = 'text-emerald-400';
    hrZoneBg = 'bg-emerald-950/60 border-emerald-800/60';
  }

  // Watt intensity styling
  let wattColor = 'text-slate-100';
  if (currentWatts > 700) wattColor = 'text-red-500 glow-red';
  else if (currentWatts > 500) wattColor = 'text-orange-400 glow-orange';
  else if (currentWatts > 300) wattColor = 'text-amber-300';
  else if (currentWatts > 150) wattColor = 'text-emerald-400';

  // Mini Sparkline Renderer for live values over time within cards
  const renderSparkline = (
    data: number[],
    strokeColor: string,
    fillColor?: string,
    minFloor: number = 0
  ) => {
    if (data.length < 2) {
      return (
        <div className="h-9 w-full flex items-center justify-center text-[10px] text-slate-600 font-mono">
          Accumulating 1 Hz telemetry...
        </div>
      );
    }
    const width = 240;
    const height = 36;
    const padding = 3;
    const maxVal = Math.max(minFloor, ...data) * 1.05;
    const minVal = Math.min(...data) * 0.95;
    const range = Math.max(10, maxVal - minVal);

    const pts = data.map((val, idx) => {
      const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - minVal) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const linePath = `M ${pts.join(' L ')}`;
    const areaPath = `${linePath} L ${width - padding},${height} L ${padding},${height} Z`;

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-9 overflow-hidden select-none block"
      >
        {fillColor && <path d={areaPath} fill={fillColor} opacity={0.2} />}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <div
      className={`transition-all duration-300 ${
        isKioskMode
          ? 'fixed inset-0 z-50 bg-[#05080e] p-4 sm:p-6 flex flex-col justify-between overflow-y-auto'
          : 'flex flex-col gap-4'
      }`}
    >
      {/* Top Bar / Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-semibold">
              {activeSession ? activeSession.title : 'Free Ride Track'}
            </span>
            {workoutPaused && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase animate-pulse">
                Paused
              </span>
            )}
          </div>
          {samples.length > 0 && (
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              · {samples.length}s history buffered
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isKioskMode && (
            <button
              onClick={() => setShowKioskChart(!showKioskChart)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                showKioskChart
                  ? 'bg-orange-950/80 text-orange-300 border-orange-800'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{showKioskChart ? 'Hide Waves' : 'Show Waves'}</span>
            </button>
          )}
          <button
            onClick={onToggleSound}
            aria-label="Toggle audio feedback"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            onClick={() => setIsKioskMode(!isKioskMode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            {isKioskMode ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Exit Kiosk</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">RPi Display / HUD</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Interval / Program Work-Rest Banner (if active) */}
      {intervalConfig && workoutActive && (
        <div
          className={`rounded-2xl p-4 sm:p-6 border transition-all ${
            intervalConfig.isWorkPhase
              ? 'bg-gradient-to-r from-orange-950/70 via-red-950/60 to-orange-950/70 border-orange-500 shadow-xl shadow-orange-950/40'
              : 'bg-gradient-to-r from-slate-950/80 via-blue-950/50 to-slate-950/80 border-blue-500/60'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`px-3 py-1.5 rounded-xl font-display font-black text-xl sm:text-2xl uppercase tracking-wider ${
                  intervalConfig.isWorkPhase ? 'bg-orange-500 text-slate-950' : 'bg-blue-600 text-white'
                }`}
              >
                {intervalConfig.isWorkPhase ? 'WORK ALL-OUT' : 'REST / SPIN'}
              </div>
              <div className="text-slate-300 font-mono text-sm sm:text-base font-semibold">
                Round {intervalConfig.currentRound} of {intervalConfig.totalRounds}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs uppercase font-mono text-slate-400">Phase Time</div>
                <div className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white font-mono tabular-nums">
                  00:{intervalConfig.phaseRemainingSec < 10 ? '0' : ''}
                  {intervalConfig.phaseRemainingSec}
                </div>
              </div>
              {onNextRound && (
                <button
                  onClick={onNextRound}
                  className="px-3 py-2 text-xs font-mono uppercase font-bold text-slate-200 bg-slate-800/90 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
                >
                  Skip Phase
                </button>
              )}
            </div>
          </div>

          {/* Interval Phase Progress Bar */}
          <div className="mt-3 w-full bg-slate-950/80 h-2 rounded-full overflow-hidden border border-slate-800/80">
            {(() => {
              const maxSec = intervalConfig.isWorkPhase ? intervalConfig.workSec : intervalConfig.restSec;
              const elapsed = maxSec - intervalConfig.phaseRemainingSec;
              const pct = maxSec > 0 ? (elapsed / maxSec) * 100 : 0;
              return (
                <div
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  className={`h-full transition-all duration-300 ${
                    intervalConfig.isWorkPhase ? 'bg-orange-500' : 'bg-blue-500'
                  }`}
                />
              );
            })()}
          </div>
        </div>
      )}

      {/* Target Calories Goal Tracker */}
      {activeSession?.targetGoal?.type === 'calories' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs font-mono mb-1.5">
            <span className="text-slate-400 uppercase">
              Target: {activeSession.targetGoal.targetValue} Cal Sprint
            </span>
            <span className="text-orange-400 font-bold">
              {Math.round(cumulativeCalories)} / {activeSession.targetGoal.targetValue} kcal (
              {Math.round((cumulativeCalories / activeSession.targetGoal.targetValue) * 100)}%)
            </span>
          </div>
          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
            <div
              style={{
                width: `${Math.min(100, (cumulativeCalories / activeSession.targetGoal.targetValue) * 100)}%`,
              }}
              className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-300"
            />
          </div>
        </div>
      )}

      {/* PRIMARY 3 PER-SECOND TELEMETRY GAUGES WITH INTEGRATED TIMELINES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. POWER (WATTS) + 45s POWER WAVE */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden bike-console-bezel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                Power Output
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <span>Peak:</span>
              <span className="text-orange-400 font-bold">{rollingStats.peakWatts}W</span>
            </div>
          </div>

          <div className="my-2 text-center">
            <div
              className={`font-display font-black text-6xl sm:text-7xl lg:text-8xl tracking-tight leading-none tabular-nums ${wattColor}`}
            >
              {currentWatts}
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono tracking-widest text-slate-400 uppercase mt-0.5">
              Watts · {caloriesPerHour} kcal/h
            </div>
          </div>

          {/* Real-time 45s Power Timeline Wave */}
          <div className="my-1.5 px-1 py-1 rounded bg-slate-950/60 border border-slate-850">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 mb-0.5">
              <span>Rolling Wave (Last 45s)</span>
              <span className="text-orange-400/90 font-medium">5s: {rollingStats.avgWatts5s}W · 30s: {rollingStats.avgWatts30s}W</span>
            </div>
            {renderSparkline(rollingStats.recentWatts, '#f97316', '#f97316', 300)}
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span>Rogue Echo 1 Hz</span>
            <span className="text-orange-400 font-semibold">
              {currentWatts > 0 ? `${(currentWatts / 82).toFixed(1)} W/kg` : '0.0 W/kg'}
            </span>
          </div>
        </div>

        {/* 2. CADENCE (RPM) + 45s CADENCE WAVE */}
        <div className="bg-gradient-to-b from-slate-900/95 to-slate-950 border border-slate-800 rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden bike-console-bezel">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                Pedal Cadence
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
              <span>5s Avg:</span>
              <span className="text-cyan-400 font-bold">{rollingStats.avgCadence5s} RPM</span>
            </div>
          </div>

          <div className="my-2 text-center">
            <div className="font-display font-black text-6xl sm:text-7xl lg:text-8xl tracking-tight leading-none tabular-nums text-cyan-400">
              {currentCadence}
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono tracking-widest text-slate-400 uppercase mt-0.5">
              RPM · {speedKmh} km/h
            </div>
          </div>

          {/* Real-time 45s Cadence Rhythm Wave */}
          <div className="my-1.5 px-1 py-1 rounded bg-slate-950/60 border border-slate-850">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 mb-0.5">
              <span>Cadence Stability</span>
              <span className="text-cyan-400/90 font-medium">Split: {formatSplit(split500mSec)}</span>
            </div>
            {renderSparkline(rollingStats.recentCadence, '#22d3ee', '#0891b2', 70)}
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span>Flywheel Rate</span>
            <span className="text-cyan-400 font-semibold">{formatSplit(split500mSec)}</span>
          </div>
        </div>

        {/* 3. HEART RATE (BPM) + 45s CARDIAC WAVE */}
        <div
          className={`bg-gradient-to-b from-slate-900/95 to-slate-950 border rounded-2xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden bike-console-bezel transition-all ${
            currentHr > 0 ? hrZoneBg : 'border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart
                className={`w-4 h-4 ${
                  currentHr > 0 ? 'text-rose-500 animate-pulse fill-rose-500/20' : 'text-slate-500'
                }`}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                Heart Rate
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span
                className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                  hrZone === 5
                    ? 'bg-rose-500 text-white'
                    : hrZone === 4
                    ? 'bg-orange-500 text-slate-950'
                    : hrZone === 3
                    ? 'bg-yellow-500 text-slate-950'
                    : hrZone === 2
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-sky-500 text-slate-950'
                }`}
              >
                Zone {hrZone} · Max {rollingStats.peakHr}
              </span>
            </div>
          </div>

          <div className="my-2 text-center">
            <div
              className={`font-display font-black text-6xl sm:text-7xl lg:text-8xl tracking-tight leading-none tabular-nums ${hrZoneColor}`}
            >
              {currentHr > 0 ? currentHr : '--'}
            </div>
            <div className="text-xs sm:text-sm font-bold font-mono tracking-widest text-slate-400 uppercase mt-0.5">
              BPM · {hrPct}% Max
            </div>
          </div>

          {/* Real-time 45s Cardiac Wave */}
          <div className="my-1.5 px-1 py-1 rounded bg-slate-950/60 border border-slate-850">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 px-1 mb-0.5">
              <span>Polar H10 ECG Trend</span>
              <span className="text-rose-400/90 font-medium">30s: {rollingStats.avgHr30s} BPM</span>
            </div>
            {renderSparkline(rollingStats.recentHr, '#f43f5e', '#be123c', 160)}
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-400 border-t border-slate-800/80 pt-2.5">
            <span>{hrPct}% of Max HR</span>
            <span className={`${hrZoneColor} font-semibold`}>
              {hrZone === 5
                ? 'VO2 Max / Anaerobic'
                : hrZone === 4
                ? 'Lactate Threshold'
                : hrZone === 3
                ? 'Aerobic Tempo'
                : hrZone === 2
                ? 'Fat Burning Base'
                : 'Active Recovery'}
            </span>
          </div>
        </div>
      </div>

      {/* SECONDARY CUMULATIVE STRIP: Elapsed Time, Calories, Distance, Pace */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-300 shrink-0">
            <Timer className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Workout Time</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
              {formatTime(elapsedSec)}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-950/60 border border-orange-800/40 flex items-center justify-center text-orange-400 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Total Calories</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-orange-400 tabular-nums">
              {Math.round(cumulativeCalories)} <span className="text-xs font-normal text-slate-400">kcal</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-950/60 border border-cyan-800/40 flex items-center justify-center text-cyan-400 shrink-0">
            <Milestone className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Distance</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-cyan-300 tabular-nums">
              {cumulativeDistanceMeters >= 1000
                ? `${(cumulativeDistanceMeters / 1000).toFixed(2)} km`
                : `${Math.round(cumulativeDistanceMeters)} m`}
            </div>
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/70 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/40 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase text-slate-400">Avg Power / Work</div>
            <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
              {samples.length > 0
                ? `${Math.round(samples.reduce((acc, s) => acc + s.watts, 0) / samples.length)} W`
                : `${currentWatts} W`}
            </div>
          </div>
        </div>
      </div>

      {/* FULL KIOSK EMBEDDED STREAMING CHART (when in fullscreen Kiosk Mode) */}
      {isKioskMode && showKioskChart && (
        <div className="mt-2">
          <RealtimeChart
            samples={samples}
            currentWatts={currentWatts}
            currentCadence={currentCadence}
            currentHr={currentHr}
          />
        </div>
      )}
    </div>
  );
};
