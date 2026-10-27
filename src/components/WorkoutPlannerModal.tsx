import React, { useState } from 'react';
import {
  Flame,
  Zap,
  Timer,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { WorkoutMode, IntervalConfig } from '../types/telemetry';

interface WorkoutPlannerModalProps {
  onStartSession: (
    title: string,
    mode: WorkoutMode,
    goal?: { type: 'calories' | 'distance' | 'time'; targetValue: number },
    intervalConfig?: IntervalConfig
  ) => void;
  onClose: () => void;
}

export const WorkoutPlannerModal: React.FC<WorkoutPlannerModalProps> = ({
  onStartSession,
  onClose,
}) => {
  const [selectedMode, setSelectedMode] = useState<WorkoutMode>('tabata');
  
  // Custom Interval settings
  const [customWorkSec, setCustomWorkSec] = useState<number>(30);
  const [customRestSec, setCustomRestSec] = useState<number>(30);
  const [customRounds, setCustomRounds] = useState<number>(6);

  // Target values
  const [targetCals, setTargetCals] = useState<number>(50);
  const [targetDistMeters, setTargetDistMeters] = useState<number>(5000);
  const [targetTimeMins, setTargetTimeMins] = useState<number>(20);

  const handleLaunch = () => {
    if (selectedMode === 'tabata') {
      onStartSession('Echo Tabata Protocol (8x 20/10)', 'tabata', undefined, {
        name: 'Tabata 20/10',
        workSec: 20,
        restSec: 10,
        totalRounds: 8,
        currentRound: 1,
        isWorkPhase: true,
        phaseRemainingSec: 20,
      });
    } else if (selectedMode === 'intervals') {
      onStartSession(
        `Custom Intervals (${customWorkSec}s/${customRestSec}s x${customRounds})`,
        'intervals',
        undefined,
        {
          name: `${customWorkSec}s Work / ${customRestSec}s Rest`,
          workSec: customWorkSec,
          restSec: customRestSec,
          totalRounds: customRounds,
          currentRound: 1,
          isWorkPhase: true,
          phaseRemainingSec: customWorkSec,
        }
      );
    } else if (selectedMode === 'target_cals') {
      onStartSession(
        `${targetCals} Calorie Sprint`,
        'target_cals',
        { type: 'calories', targetValue: targetCals }
      );
    } else if (selectedMode === 'target_dist') {
      onStartSession(
        `${(targetDistMeters / 1000).toFixed(1)}km Time Trial`,
        'target_dist',
        { type: 'distance', targetValue: targetDistMeters }
      );
    } else if (selectedMode === 'target_time') {
      onStartSession(
        `${targetTimeMins} Min Steady Pacing`,
        'target_time',
        { type: 'time', targetValue: targetTimeMins * 60 }
      );
    } else {
      onStartSession('Open Ride', 'open');
    }
    onClose();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display uppercase tracking-wide text-white">
          Workout Programs & Benchmark Challenges
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Choose a structured protocol or custom work/rest interval timer
        </p>
      </div>

      {/* Program Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Tabata */}
        <button
          onClick={() => setSelectedMode('tabata')}
          className={`p-4 rounded-xl text-left border transition-all ${
            selectedMode === 'tabata'
              ? 'bg-orange-950/60 border-orange-500 ring-1 ring-orange-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono text-orange-400 font-semibold uppercase">
              Benchmark
            </span>
          </div>
          <div className="text-base font-bold font-display uppercase text-white">
            Tabata Protocol
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            8 rounds · 20s ALL-OUT / 10s REST · 4 min total
          </div>
        </button>

        {/* 50 Cal Sprint */}
        <button
          onClick={() => setSelectedMode('target_cals')}
          className={`p-4 rounded-xl text-left border transition-all ${
            selectedMode === 'target_cals'
              ? 'bg-orange-950/60 border-orange-500 ring-1 ring-orange-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono text-red-400 font-semibold uppercase">
              Sprint
            </span>
          </div>
          <div className="text-base font-bold font-display uppercase text-white">
            Calorie Sprint
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Race to burn target calories (50 cal / 100 cal)
          </div>
        </button>

        {/* Custom Intervals */}
        <button
          onClick={() => setSelectedMode('intervals')}
          className={`p-4 rounded-xl text-left border transition-all ${
            selectedMode === 'intervals'
              ? 'bg-orange-950/60 border-orange-500 ring-1 ring-orange-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Timer className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono text-blue-400 font-semibold uppercase">
              Custom
            </span>
          </div>
          <div className="text-base font-bold font-display uppercase text-white">
            Work / Rest Builder
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Configure work seconds, rest seconds, and rounds
          </div>
        </button>

        {/* 5km Time Trial */}
        <button
          onClick={() => setSelectedMode('target_dist')}
          className={`p-4 rounded-xl text-left border transition-all ${
            selectedMode === 'target_dist'
              ? 'bg-orange-950/60 border-orange-500 ring-1 ring-orange-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono text-cyan-400 font-semibold uppercase">
              Distance
            </span>
          </div>
          <div className="text-base font-bold font-display uppercase text-white">
            Distance Trial
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Target 5,000m or 10,000m distance pacing
          </div>
        </button>

        {/* Steady Pacing / Time Goal */}
        <button
          onClick={() => setSelectedMode('target_time')}
          className={`p-4 rounded-xl text-left border transition-all ${
            selectedMode === 'target_time'
              ? 'bg-orange-950/60 border-orange-500 ring-1 ring-orange-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-semibold uppercase">
              Endurance
            </span>
          </div>
          <div className="text-base font-bold font-display uppercase text-white">
            Timed Session
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            20 min / 30 min steady zone pacing
          </div>
        </button>

        {/* Open Ride */}
        <button
          onClick={() => setSelectedMode('open')}
          className={`p-4 rounded-xl text-left border transition-all ${
            selectedMode === 'open'
              ? 'bg-orange-950/60 border-orange-500 ring-1 ring-orange-500/50'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-slate-700 text-slate-300 flex items-center justify-center">
              <Play className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase">
              Free Ride
            </span>
          </div>
          <div className="text-base font-bold font-display uppercase text-white">
            Open Ride
          </div>
          <div className="text-xs text-slate-400 font-mono mt-1">
            Track metrics continuously until stopped
          </div>
        </button>
      </div>

      {/* Mode-Specific Fine Tuning */}
      {selectedMode === 'intervals' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="text-xs font-bold font-display uppercase text-slate-300">
            Customize Interval Timings
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Work Phase (sec):</label>
              <input
                type="number"
                min="5"
                max="300"
                step="5"
                value={customWorkSec}
                onChange={(e) => setCustomWorkSec(parseInt(e.target.value) || 20)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Rest Phase (sec):</label>
              <input
                type="number"
                min="5"
                max="300"
                step="5"
                value={customRestSec}
                onChange={(e) => setCustomRestSec(parseInt(e.target.value) || 10)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Total Rounds:</label>
              <input
                type="number"
                min="1"
                max="30"
                value={customRounds}
                onChange={(e) => setCustomRounds(parseInt(e.target.value) || 5)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {selectedMode === 'target_cals' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold font-display uppercase text-slate-300 mb-2">
            Target Calorie Goal
          </div>
          <div className="flex gap-2 font-mono text-xs">
            {[20, 50, 75, 100].map((cal) => (
              <button
                key={cal}
                onClick={() => setTargetCals(cal)}
                className={`flex-1 py-2 rounded-lg border font-bold transition-colors ${
                  targetCals === cal
                    ? 'bg-orange-600 text-white border-orange-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {cal} Cal
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedMode === 'target_dist' && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-bold font-display uppercase text-slate-300 mb-2">
            Target Distance (meters)
          </div>
          <div className="flex gap-2 font-mono text-xs">
            {[1000, 2000, 5000, 10000].map((dist) => (
              <button
                key={dist}
                onClick={() => setTargetDistMeters(dist)}
                className={`flex-1 py-2 rounded-lg border font-bold transition-colors ${
                  targetDistMeters === dist
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {dist >= 1000 ? `${dist / 1000}km` : `${dist}m`}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Start Action */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-mono uppercase text-slate-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleLaunch}
          className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-lg shadow-orange-600/30 transition-all font-display"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Launch Workout</span>
        </button>
      </div>
    </div>
  );
};
