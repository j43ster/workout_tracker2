import React, { useState } from 'react';
import {
  Bluetooth,
  Battery,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Cpu,
  Radio,
  Sliders,
  HelpCircle,
} from 'lucide-react';
import { DeviceState } from '../types/telemetry';
import { SimulationPreset } from '../services/simulator';

interface DeviceManagerModalProps {
  polarState: DeviceState;
  echoState: DeviceState;
  isSimulating: boolean;
  activePreset: SimulationPreset;
  onConnectPolar: () => void;
  onDisconnectPolar: () => void;
  onConnectEcho: () => void;
  onDisconnectEcho: () => void;
  onToggleSimulator: (enabled: boolean) => void;
  onChangePreset: (preset: SimulationPreset) => void;
  onSetManualWatts?: (watts: number) => void;
}

export const DeviceManagerModal: React.FC<DeviceManagerModalProps> = ({
  polarState,
  echoState,
  isSimulating,
  activePreset,
  onConnectPolar,
  onDisconnectPolar,
  onConnectEcho,
  onDisconnectEcho,
  onToggleSimulator,
  onChangePreset,
  onSetManualWatts,
}) => {
  const [showBleGuide, setShowBleGuide] = useState<boolean>(false);
  const [manualWattsInput, setManualWattsInput] = useState<number>(350);

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-display uppercase tracking-wide text-white">
            Sensor Connectivity & RPi Bluetooth
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Polar H10 (Heart Rate 0x180D) and Rogue Echo Bike (FTMS 0x1826 / Cycling Power)
          </p>
        </div>

        {/* Quick Simulator Switch */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          <span className="text-xs font-mono text-slate-400 px-2">Telemetry Source:</span>
          <button
            onClick={() => onToggleSimulator(false)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              !isSimulating
                ? 'bg-orange-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Live BLE
          </button>
          <button
            onClick={() => onToggleSimulator(true)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              isSimulating
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Test Simulator
          </button>
        </div>
      </div>

      {/* Primary Hardware Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Polar H10 Heart Rate Strap */}
        <div
          className={`rounded-xl p-5 border transition-all ${
            polarState.connected
              ? 'bg-slate-900/90 border-emerald-500/50'
              : 'bg-slate-900/40 border-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  polarState.connected
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Polar H10 Chest Strap</h3>
                <div className="text-xs text-slate-400 font-mono">Service: 0x180D (Heart Rate)</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {polarState.connected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500">
                  <XCircle className="w-4 h-4" /> Disconnected
                </span>
              )}
            </div>
          </div>

          {/* Details & Battery */}
          <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Device Name:</span>
              <span className="font-semibold">{polarState.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Battery Level:</span>
              <span className="flex items-center gap-1.5 text-slate-200">
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
                {polarState.batteryLevel !== undefined ? `${polarState.batteryLevel}%` : 'Unknown'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Electrode Contact:</span>
              <span className={polarState.sensorContact ? 'text-emerald-400' : 'text-slate-400'}>
                {polarState.sensorContact ? 'Active Contact' : 'Standby'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!polarState.connected ? (
              <button
                onClick={onConnectPolar}
                disabled={polarState.connecting}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold uppercase tracking-wider text-white border border-slate-700 transition-colors"
              >
                {polarState.connecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching Polar H10...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
                    <span>Pair Polar H10</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onDisconnectPolar}
                className="w-full py-2 px-4 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-xs font-mono text-red-200 border border-red-800/60 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* 2. Rogue Echo Bike Console */}
        <div
          className={`rounded-xl p-5 border transition-all ${
            echoState.connected
              ? 'bg-slate-900/90 border-emerald-500/50'
              : 'bg-slate-900/40 border-slate-800'
          }`}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  echoState.connected
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Rogue Echo Bike Console</h3>
                <div className="text-xs text-slate-400 font-mono">Service: FTMS (0x1826) / CPS</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {echoState.connected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-emerald-400 font-medium">
                  <CheckCircle2 className="w-4 h-4" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500">
                  <XCircle className="w-4 h-4" /> Disconnected
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs font-mono text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Console Model:</span>
              <span className="font-semibold">{echoState.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Profile:</span>
              <span>{echoState.serviceType || 'Indoor Bike Data (0x2AD2)'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Per-Second Feed:</span>
              <span className="text-emerald-400">Cadence (RPM) + Power (Watts)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!echoState.connected ? (
              <button
                onClick={onConnectEcho}
                disabled={echoState.connecting}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold uppercase tracking-wider text-white border border-slate-700 transition-colors"
              >
                {echoState.connecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching Rogue Echo...</span>
                  </>
                ) : (
                  <>
                    <Bluetooth className="w-3.5 h-3.5 text-blue-400" />
                    <span>Pair Echo Console</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={onDisconnectEcho}
                className="w-full py-2 px-4 rounded-lg bg-red-950/50 hover:bg-red-900/60 text-xs font-mono text-red-200 border border-red-800/60 transition-colors"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Simulator Control Section */}
      {isSimulating && (
        <div className="bg-slate-900/80 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div className="flex items-center gap-2 text-blue-400 font-semibold text-sm">
              <Sliders className="w-4 h-4" />
              <span>Biometric & Air-Resistance Simulator Active</span>
            </div>
            <span className="text-xs font-mono text-slate-400">1 Hz Synthetic Feed</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <button
              onClick={() => onChangePreset('tabata')}
              className={`p-2.5 rounded-lg text-left border transition-all ${
                activePreset === 'tabata'
                  ? 'bg-blue-950/80 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-bold font-display uppercase">Tabata 20/10</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">Spikes to 750W</div>
            </button>

            <button
              onClick={() => onChangePreset('sprint50')}
              className={`p-2.5 rounded-lg text-left border transition-all ${
                activePreset === 'sprint50'
                  ? 'bg-blue-950/80 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-bold font-display uppercase">50 Cal Sprint</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">900W decay</div>
            </button>

            <button
              onClick={() => onChangePreset('aerobic_zone2')}
              className={`p-2.5 rounded-lg text-left border transition-all ${
                activePreset === 'aerobic_zone2'
                  ? 'bg-blue-950/80 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-bold font-display uppercase">Zone 2 Aerobic</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">Steady ~200W</div>
            </button>

            <button
              onClick={() => onChangePreset('ramp_test')}
              className={`p-2.5 rounded-lg text-left border transition-all ${
                activePreset === 'ramp_test'
                  ? 'bg-blue-950/80 border-blue-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="text-xs font-bold font-display uppercase">Ramp Test</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">+30W every 60s</div>
            </button>
          </div>

          {/* Manual watt dial */}
          <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-800">
            <span className="text-xs text-slate-400 font-mono shrink-0">Manual Watt Target:</span>
            <input
              type="range"
              min="0"
              max="1000"
              step="25"
              value={manualWattsInput}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setManualWattsInput(val);
                if (onSetManualWatts) onSetManualWatts(val);
              }}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <span className="text-sm font-bold font-mono text-blue-400 w-16 text-right shrink-0">
              {manualWattsInput} W
            </span>
          </div>
        </div>
      )}

      {/* Troubleshooting and Hardware Setup Guide */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
        <button
          onClick={() => setShowBleGuide(!showBleGuide)}
          className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider"
        >
          <span className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-orange-400" />
            Hardware Pairing Tips & RPi BLE Bridge
          </span>
          <span className="text-slate-500">{showBleGuide ? 'Hide' : 'Show Details'}</span>
        </button>

        {showBleGuide && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3 text-xs text-slate-400 leading-relaxed font-mono">
            <div>
              <strong className="text-white">Polar H10:</strong> Moisten the ribbed electrode pads on the strap with water or conductive gel before wrapping around your chest below the pectoral muscles. Click the H10 pod into the snaps.
            </div>
            <div>
              <strong className="text-white">Rogue Echo Console:</strong> Power on the console by pushing the pedals or pressing any button. Press the Bluetooth button on the console until the LED blinks.
            </div>
            <div>
              <strong className="text-white">Raspberry Pi 4 Headless BLE Gateway:</strong> You can also run a background Python script (`bleak`) on the Pi 4 that connects to the Polar H10 and Echo bike and sends telemetry directly to the local server via:
              <pre className="bg-slate-950 p-2.5 rounded mt-1.5 text-[11px] text-slate-300 overflow-x-auto border border-slate-800">
curl -X POST http://localhost:3000/api/telemetry/live -H "Content-Type: application/json" -d '{"{"}watts": 380, "cadence": 62, "hr": 164{"}"}'
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
