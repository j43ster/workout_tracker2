import React from 'react';
import { Activity, Play, Square, Pause } from 'lucide-react';

interface HeaderProps {
  activeTab: 'hud' | 'history' | 'intervals' | 'devices' | 'pi-hub';
  setActiveTab: (tab: 'hud' | 'history' | 'intervals' | 'devices' | 'pi-hub') => void;
  workoutActive: boolean;
  workoutPaused: boolean;
  onStartWorkout: () => void;
  onPauseWorkout: () => void;
  onStopWorkout: () => void;
  polarConnected: boolean;
  echoConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  workoutActive,
  workoutPaused,
  onStartWorkout,
  onPauseWorkout,
  onStopWorkout,
  polarConnected,
  echoConnected,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950/90 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => setActiveTab('hud')}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-500 shrink-0">
            <Activity className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white font-display uppercase whitespace-nowrap">
              EchoPulse <span className="text-orange-500">RPi</span>
            </span>
          </div>
        </button>
      </div>

      {/* Zone 2: 4-5 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('hud')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'hud'
              ? 'text-white font-semibold border-b-2 border-orange-500'
              : 'hover:text-slate-200'
          }`}
        >
          Live HUD
        </button>
        <button
          onClick={() => setActiveTab('intervals')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'intervals'
              ? 'text-white font-semibold border-b-2 border-orange-500'
              : 'hover:text-slate-200'
          }`}
        >
          Workouts
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'history'
              ? 'text-white font-semibold border-b-2 border-orange-500'
              : 'hover:text-slate-200'
          }`}
        >
          History & PRs
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'devices'
              ? 'text-white font-semibold border-b-2 border-orange-500'
              : 'hover:text-slate-200'
          }`}
        >
          Sensors {polarConnected && echoConnected ? '(2/2)' : polarConnected || echoConnected ? '(1/2)' : '(Offline)'}
        </button>
        <button
          onClick={() => setActiveTab('pi-hub')}
          className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'pi-hub'
              ? 'text-white font-semibold border-b-2 border-orange-500'
              : 'hover:text-slate-200'
          }`}
        >
          Pi Hub & Mobile QR
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-2 shrink-0">
        {!workoutActive ? (
          <button
            onClick={onStartWorkout}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-orange-600 rounded-lg hover:bg-orange-500 active:scale-95 transition-all shadow-lg shadow-orange-600/20 whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start Ride</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onPauseWorkout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 bg-slate-800 rounded-lg hover:bg-slate-700 active:scale-95 transition-all border border-slate-700 whitespace-nowrap shrink-0"
            >
              {workoutPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />}
              <span>{workoutPaused ? 'Resume' : 'Pause'}</span>
            </button>
            <button
              onClick={onStopWorkout}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-100 bg-red-950/80 hover:bg-red-900 border border-red-800 rounded-lg active:scale-95 transition-all whitespace-nowrap shrink-0"
            >
              <Square className="w-3 h-3 fill-current text-red-400" />
              <span>Finish</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
