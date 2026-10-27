import React, { useState } from 'react';
import {
  User,
  Heart,
  Weight,
  Zap,
  Volume2,
  CheckCircle2,
} from 'lucide-react';
import { UserAthleteSettings } from '../types/telemetry';
import { localDb } from '../services/db/localDatabase';
import { soundEffects } from '../services/audio/beeps';

interface SettingsModalProps {
  settings: UserAthleteSettings;
  onUpdateSettings: (newSettings: UserAthleteSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onClose,
}) => {
  const [formData, setFormData] = useState<UserAthleteSettings>({ ...settings });
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await localDb.saveAthleteSettings(formData);
    soundEffects.setEnabled(formData.soundEnabled);
    soundEffects.setVolume(formData.soundVolume);
    onUpdateSettings(formData);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const calculateDefaultMaxHr = () => {
    if (formData.age > 0) {
      // Tanaka formula: 208 - (0.7 * age)
      const calculated = Math.round(208 - 0.7 * formData.age);
      setFormData((prev) => ({ ...prev, maxHr: calculated }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-display uppercase tracking-wide text-white">
            Athlete Profile & Training Zones
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Calibrate Polar H10 heart rate zones and Rogue Echo power-to-weight metrics
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Biometrics */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="text-xs font-bold font-display uppercase text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4 text-orange-400" />
            <span>Biometric Parameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Athlete Name:</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Age (Years):</label>
              <input
                type="number"
                min="14"
                max="100"
                value={formData.age}
                onChange={(e) => {
                  const age = parseInt(e.target.value, 10) || 30;
                  setFormData({ ...formData, age });
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Body Weight (kg):</label>
              <div className="relative">
                <input
                  type="number"
                  min="40"
                  max="200"
                  value={formData.weightKg}
                  onChange={(e) =>
                    setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 75 })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-white font-semibold focus:outline-none focus:border-orange-500"
                />
                <span className="absolute right-3 top-2 text-slate-500 text-xs">kg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Heart Rate Calibration */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold font-display uppercase text-slate-300 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span>Polar H10 Heart Rate Targets</span>
            </div>
            <button
              type="button"
              onClick={calculateDefaultMaxHr}
              className="text-[11px] font-mono text-orange-400 hover:text-orange-300 underline"
            >
              Recalculate Max HR from Age
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Max Heart Rate (BPM):</label>
              <input
                type="number"
                min="130"
                max="225"
                value={formData.maxHr}
                onChange={(e) =>
                  setFormData({ ...formData, maxHr: parseInt(e.target.value, 10) || 185 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Resting Heart Rate (BPM):</label>
              <input
                type="number"
                min="35"
                max="100"
                value={formData.restingHr}
                onChange={(e) =>
                  setFormData({ ...formData, restingHr: parseInt(e.target.value, 10) || 55 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Echo Bike FTP (Watts):</label>
              <input
                type="number"
                min="100"
                max="600"
                value={formData.ftpWatts}
                onChange={(e) =>
                  setFormData({ ...formData, ftpWatts: parseInt(e.target.value, 10) || 250 })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-semibold focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Audio & Display Preferences */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
          <div className="text-xs font-bold font-display uppercase text-slate-300 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>Audio Cues & Wake Lock</span>
          </div>

          <div className="space-y-3 pt-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">Web Audio Synth Beeps (Interval Cues & Countdown):</span>
              <input
                type="checkbox"
                checked={formData.soundEnabled}
                onChange={(e) => setFormData({ ...formData, soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-300">Prevent Screen Sleep (Screen WakeLock):</span>
              <input
                type="checkbox"
                checked={formData.screenWakeLock}
                onChange={(e) => setFormData({ ...formData, screenWakeLock: e.target.checked })}
                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono uppercase text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-lg shadow-orange-600/20 font-display transition-all"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
