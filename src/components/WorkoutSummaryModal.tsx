import React, { useState } from 'react';
import {
  Trophy,
  Download,
  Flame,
  Zap,
  Heart,
  Gauge,
  Timer,
  Milestone,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { WorkoutSession } from '../types/telemetry';
import { localDb } from '../services/db/localDatabase';
import { HrZoneBar } from './HrZoneBar';

interface WorkoutSummaryModalProps {
  workout: WorkoutSession;
  maxHr: number;
  onClose: () => void;
  onSaved?: () => void;
}

export const WorkoutSummaryModal: React.FC<WorkoutSummaryModalProps> = ({
  workout,
  maxHr,
  onClose,
  onSaved,
}) => {
  const [notes, setNotes] = useState<string>(workout.notes || '');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSaveNotes = async () => {
    workout.notes = notes;
    await localDb.saveWorkout(workout);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
    if (onSaved) onSaved();
  };

  const downloadCsv = () => {
    const csvContent = localDb.exportWorkoutCsv(workout);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${workout.title.replace(/\s+/g, '_')}_${workout.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(workout, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${workout.title.replace(/\s+/g, '_')}_${workout.id}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-950/80 via-slate-900 to-slate-950 border border-orange-500/40 rounded-2xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/40 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs uppercase font-mono text-orange-400 font-bold">
                Workout Complete
              </div>
              <h2 className="text-2xl font-bold font-display uppercase tracking-wide text-white">
                {workout.title}
              </h2>
              <div className="text-xs text-slate-400 font-mono mt-0.5">
                {new Date(workout.startTime).toLocaleString()} · {workout.samples.length} telemetry samples logged
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadCsv}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-mono text-slate-200 border border-slate-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={downloadJson}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-mono text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Aggregate Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono mb-1">
            <Timer className="w-4 h-4" /> Total Duration
          </div>
          <div className="text-2xl font-mono font-bold text-white tabular-nums">
            {formatTime(workout.durationSec)}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            {workout.durationSec} seconds
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-mono mb-1">
            <Flame className="w-4 h-4" /> Calorie Burn
          </div>
          <div className="text-2xl font-mono font-bold text-orange-400 tabular-nums">
            {workout.totalCalories} <span className="text-sm font-normal text-slate-400">kcal</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            Work: {workout.workKj} kJ
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-400 text-xs font-mono mb-1">
            <Zap className="w-4 h-4" /> Average / Peak Watts
          </div>
          <div className="text-2xl font-mono font-bold text-white tabular-nums">
            {workout.avgWatts} <span className="text-sm font-normal text-slate-400">/ {workout.maxWatts} W</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            Rogue Echo load
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-mono mb-1">
            <Heart className="w-4 h-4" /> Average / Peak HR
          </div>
          <div className="text-2xl font-mono font-bold text-rose-400 tabular-nums">
            {workout.avgHr} <span className="text-sm font-normal text-slate-400">/ {workout.maxHr} BPM</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            Polar H10 ECG
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-1">
            <Gauge className="w-4 h-4" /> Average / Peak Cadence
          </div>
          <div className="text-2xl font-mono font-bold text-cyan-400 tabular-nums">
            {workout.avgCadence} <span className="text-sm font-normal text-slate-400">/ {workout.maxCadence} RPM</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            Flywheel speed
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono mb-1">
            <Milestone className="w-4 h-4" /> Total Distance
          </div>
          <div className="text-2xl font-mono font-bold text-white tabular-nums">
            {(workout.totalDistanceMeters / 1000).toFixed(2)}{' '}
            <span className="text-sm font-normal text-slate-400">km</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-0.5">
            {workout.totalDistanceMeters} meters
          </div>
        </div>
      </div>

      {/* HR Zone Breakdown */}
      <HrZoneBar
        currentHr={workout.avgHr}
        maxHr={maxHr}
        zoneSeconds={workout.hrZoneSeconds}
      />

      {/* Athlete Notes Editor */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-display mb-2">
          Workout Notes & Debrief
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Rounds felt explosive, heart rate peaked at round 6, pushed cadence through final 30 seconds..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-orange-500"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-500 font-mono">
            Saved to local IndexedDB database on device
          </span>
          <button
            onClick={handleSaveNotes}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white transition-colors"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Saved</span>
              </>
            ) : (
              <span>Save Notes</span>
            )}
          </button>
        </div>
      </div>

      {/* Bottom Action */}
      <div className="flex justify-end pt-2">
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold uppercase tracking-wider text-white shadow-lg shadow-orange-600/20 font-display"
        >
          Return to Live HUD
        </button>
      </div>
    </div>
  );
};
