import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Calendar,
  Flame,
  Zap,
  Heart,
  Gauge,
  Timer,
  Download,
  Trash2,
  FileSpreadsheet,
  Eye,
  Search,
} from 'lucide-react';
import { WorkoutSession, PersonalRecords } from '../types/telemetry';
import { localDb } from '../services/db/localDatabase';
import { HrZoneBar } from './HrZoneBar';
import { RealtimeChart } from './RealtimeChart';

interface HistoryViewProps {
  maxHr: number;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ maxHr }) => {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([]);
  const [prs, setPrs] = useState<PersonalRecords | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [inspectWorkout, setInspectWorkout] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const all = await localDb.getAllWorkouts();
      const records = await localDb.getPersonalRecords();
      setWorkouts(all);
      setPrs(records);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this workout from local database?')) {
      await localDb.deleteWorkout(id);
      if (inspectWorkout?.id === id) {
        setInspectWorkout(null);
      }
      loadData();
    }
  };

  const handleExportCsv = (workout: WorkoutSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const csv = localDb.exportWorkoutCsv(workout);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workout.title.replace(/\s+/g, '_')}_${workout.id}.csv`;
    a.click();
  };

  const handleExportAllJson = () => {
    const blob = new Blob([JSON.stringify(workouts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EchoPulse_Workouts_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const filteredWorkouts = workouts.filter((w) => {
    const matchesSearch =
      w.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.notes && w.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    if (!matchesSearch) return false;
    if (selectedFilter === 'all') return true;
    return w.mode === selectedFilter;
  });

  return (
    <div className="space-y-6">
      {/* PR Leaderboard Strip */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-white font-display">
                All-Time Personal Records
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Assault Bike Power Milestones
              </p>
            </div>
          </div>

          <button
            onClick={handleExportAllJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Backup All JSON</span>
          </button>
        </div>

        {prs && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono">
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-[10px] uppercase text-slate-500">5-Sec Peak Power</div>
              <div className="text-xl font-bold text-orange-400 mt-1 tabular-nums">
                {prs.maxWatts5s} <span className="text-xs text-slate-400">W</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-[10px] uppercase text-slate-500">30-Sec Peak Power</div>
              <div className="text-xl font-bold text-orange-400 mt-1 tabular-nums">
                {prs.maxWatts30s} <span className="text-xs text-slate-400">W</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-[10px] uppercase text-slate-500">Fastest 50 Cal Sprint</div>
              <div className="text-xl font-bold text-red-400 mt-1 tabular-nums">
                {prs.fastest50CalSec ? `${prs.fastest50CalSec}s` : '--'}
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-[10px] uppercase text-slate-500">Peak Heart Rate</div>
              <div className="text-xl font-bold text-rose-400 mt-1 tabular-nums">
                {prs.maxHr} <span className="text-xs text-slate-400">BPM</span>
              </div>
            </div>
            <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-[10px] uppercase text-slate-500">20-Min FTP Avg</div>
              <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
                {prs.highestAvgWatts20m} <span className="text-xs text-slate-400">W</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search workouts by title or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
          />
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedFilter === 'all'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({workouts.length})
          </button>
          <button
            onClick={() => setSelectedFilter('tabata')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedFilter === 'tabata'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tabata
          </button>
          <button
            onClick={() => setSelectedFilter('target_cals')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedFilter === 'target_cals'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sprints
          </button>
          <button
            onClick={() => setSelectedFilter('open')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              selectedFilter === 'open'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Open
          </button>
        </div>
      </div>

      {/* Workout Logs List */}
      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-slate-500">
          Loading workout history...
        </div>
      ) : filteredWorkouts.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-8 text-center space-y-2">
          <div className="text-slate-400 font-medium text-sm">No workout sessions recorded yet.</div>
          <p className="text-xs text-slate-500 font-mono max-w-md mx-auto">
            Mount your phone on the Rogue Echo bike, strap on your Polar H10, and launch a workout from the Live HUD!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredWorkouts.map((workout) => (
            <div
              key={workout.id}
              onClick={() => setInspectWorkout(workout)}
              className="bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all cursor-pointer"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm sm:text-base font-display uppercase tracking-wide">
                      {workout.title}
                    </span>
                    {workout.isPr && (
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        PR
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(workout.startTime).toLocaleDateString()}</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(workout.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span aria-hidden="true">·</span>
                    <Timer className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatTime(workout.durationSec)}</span>
                  </div>
                </div>

                {/* Key stats badges */}
                <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-orange-400">
                    <Flame className="w-4 h-4" />
                    <span className="font-bold">{workout.totalCalories} kcal</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Zap className="w-4 h-4 text-orange-500" />
                    <span>Avg {workout.avgWatts}W / Peak {workout.maxWatts}W</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-rose-400">
                    <Heart className="w-4 h-4" />
                    <span>Avg {workout.avgHr} / Max {workout.maxHr} BPM</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-400 hidden sm:flex">
                    <Gauge className="w-4 h-4" />
                    <span>{workout.avgCadence} RPM</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
                    <button
                      onClick={(e) => handleExportCsv(workout, e)}
                      title="Download CSV"
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(workout.id, e)}
                      title="Delete workout"
                      className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Notes excerpt if any */}
              {workout.notes && (
                <div className="mt-2.5 text-xs text-slate-400 border-t border-slate-800/60 pt-2 font-mono italic">
                  "{workout.notes}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Inspect Workout Deep-Dive Modal */}
      {inspectWorkout && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-bold font-display uppercase tracking-wide text-white">
                  {inspectWorkout.title}
                </h3>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Logged {new Date(inspectWorkout.startTime).toLocaleString()} · {inspectWorkout.samples.length} points
                </div>
              </div>
              <button
                onClick={() => setInspectWorkout(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition-colors"
              >
                Close
              </button>
            </div>

            {/* Time series telemetry chart */}
            <RealtimeChart
              samples={inspectWorkout.samples}
              currentWatts={inspectWorkout.avgWatts}
              currentCadence={inspectWorkout.avgCadence}
              currentHr={inspectWorkout.avgHr}
            />

            {/* HR Zone distribution */}
            <HrZoneBar
              currentHr={inspectWorkout.avgHr}
              maxHr={maxHr}
              zoneSeconds={inspectWorkout.hrZoneSeconds}
            />

            {/* Metric Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Total Duration:</span>
                <div className="text-lg font-bold text-white mt-1">
                  {formatTime(inspectWorkout.durationSec)}
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Total Calories:</span>
                <div className="text-lg font-bold text-orange-400 mt-1">
                  {inspectWorkout.totalCalories} kcal
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Total Work:</span>
                <div className="text-lg font-bold text-cyan-400 mt-1">
                  {inspectWorkout.workKj} kJ
                </div>
              </div>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400">Total Distance:</span>
                <div className="text-lg font-bold text-emerald-400 mt-1">
                  {(inspectWorkout.totalDistanceMeters / 1000).toFixed(2)} km
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-800">
              <button
                onClick={(e) => handleExportCsv(inspectWorkout, e)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export Per-Second CSV</span>
              </button>
              <button
                onClick={() => setInspectWorkout(null)}
                className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-xs font-semibold uppercase tracking-wider text-white font-display"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
