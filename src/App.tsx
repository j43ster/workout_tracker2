import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { LiveHud } from './components/LiveHud';
import { RealtimeChart } from './components/RealtimeChart';
import { HrZoneBar } from './components/HrZoneBar';
import { DeviceManagerModal } from './components/DeviceManagerModal';
import { WorkoutPlannerModal } from './components/WorkoutPlannerModal';
import { WorkoutSummaryModal } from './components/WorkoutSummaryModal';
import { HistoryView } from './components/HistoryView';
import { PiNetworkModal } from './components/PiNetworkModal';
import { SettingsModal } from './components/SettingsModal';
import {
  WorkoutSession,
  TelemetrySample,
  DeviceState,
  UserAthleteSettings,
  IntervalConfig,
  WorkoutMode,
} from './types/telemetry';
import { localDb } from './services/db/localDatabase';
import { soundEffects } from './services/audio/beeps';
import { polarClient, PolarHRData } from './services/ble/polarH10';
import { rogueEchoClient, EchoBikeData } from './services/ble/rogueEcho';
import { telemetrySimulator, SimulationPreset } from './services/simulator';
import { Settings as SettingsIcon, AlertCircle } from 'lucide-react';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'hud' | 'history' | 'intervals' | 'devices' | 'pi-hub'>('hud');

  // Modals
  const [showPlannerModal, setShowPlannerModal] = useState<boolean>(false);
  const [showSummaryModal, setShowSummaryModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [completedWorkout, setCompletedWorkout] = useState<WorkoutSession | null>(null);

  // Athlete Settings
  const [settings, setSettings] = useState<UserAthleteSettings>({
    name: 'Athlete',
    age: 30,
    maxHr: 188,
    restingHr: 54,
    weightKg: 82,
    ftpWatts: 260,
    units: 'metric',
    soundEnabled: true,
    soundVolume: 0.8,
    screenWakeLock: true,
  });

  // Device Connections
  const [polarState, setPolarState] = useState<DeviceState>({
    connected: false,
    connecting: false,
    name: 'Polar H10',
    batteryLevel: 92,
  });

  const [echoState, setEchoState] = useState<DeviceState>({
    connected: false,
    connecting: false,
    name: 'Rogue Echo Console',
    serviceType: 'FTMS / CPS',
  });

  // Simulator state (enabled by default so athlete can explore immediately)
  const [isSimulating, setIsSimulating] = useState<boolean>(true);
  const [activePreset, setActivePreset] = useState<SimulationPreset>('tabata');

  // Real-time Instantaneous Telemetry (per-second monitored metrics)
  const [currentWatts, setCurrentWatts] = useState<number>(0);
  const [currentCadence, setCurrentCadence] = useState<number>(0);
  const [currentHr, setCurrentHr] = useState<number>(0);

  // Cumulative workout metrics (once per workout / continuous tracking)
  const [cumulativeCalories, setCumulativeCalories] = useState<number>(0);
  const [cumulativeDistanceMeters, setCumulativeDistanceMeters] = useState<number>(0);
  const [elapsedSec, setElapsedSec] = useState<number>(0);

  // Workout Session State
  const [workoutActive, setWorkoutActive] = useState<boolean>(false);
  const [workoutPaused, setWorkoutPaused] = useState<boolean>(false);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [intervalConfig, setIntervalConfig] = useState<IntervalConfig | null>(null);

  // Timeseries sample buffer for live chart & local database
  const [samples, setSamples] = useState<TelemetrySample[]>([]);
  const [hrZoneSeconds, setHrZoneSeconds] = useState({
    z1: 0,
    z2: 0,
    z3: 0,
    z4: 0,
    z5: 0,
  });

  // WakeLock Sentinel
  const wakeLockRef = useRef<any>(null);

  // Load athlete settings from local database on boot
  useEffect(() => {
    localDb.getAthleteSettings().then((saved) => {
      if (saved) {
        setSettings(saved);
        soundEffects.setEnabled(saved.soundEnabled);
        soundEffects.setVolume(saved.soundVolume);
      }
    });
  }, []);

  // Request WakeLock to keep screen on while training
  useEffect(() => {
    const requestWakeLock = async () => {
      if (settings.screenWakeLock && 'wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch {
          // Wake lock rejected or not supported
        }
      }
    };
    if (workoutActive && !workoutPaused) {
      requestWakeLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  }, [workoutActive, workoutPaused, settings.screenWakeLock]);

  // Connect to SSE stream from Raspberry Pi server if available
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/telemetry/stream');
      eventSource.onmessage = (event) => {
        try {
          const remoteData = JSON.parse(event.data);
          // If remote Pi is transmitting real hardware BLE telemetry
          if (remoteData && !isSimulating && !polarState.connected && !echoState.connected) {
            if (remoteData.hr) setCurrentHr(remoteData.hr);
            if (remoteData.watts) setCurrentWatts(remoteData.watts);
            if (remoteData.cadence) setCurrentCadence(remoteData.cadence);
            if (remoteData.calories) setCumulativeCalories(remoteData.calories);
            if (remoteData.distanceMeters) setCumulativeDistanceMeters(remoteData.distanceMeters);
          }
        } catch {
          // Ignore
        }
      };
    } catch {
      // Ignore
    }
    return () => {
      if (eventSource) eventSource.close();
    };
  }, [isSimulating, polarState.connected, echoState.connected]);

  // Handle Polar H10 BLE connection
  const handleConnectPolar = async () => {
    setPolarState((prev) => ({ ...prev, connecting: true, error: null }));
    try {
      const dev = await polarClient.connect(
        (data: PolarHRData) => {
          setCurrentHr(data.hr);
          setPolarState((prev) => ({
            ...prev,
            sensorContact: data.contactDetected,
            lastPacketTime: Date.now(),
          }));
        },
        (level: number) => {
          setPolarState((prev) => ({ ...prev, batteryLevel: level }));
        },
        () => {
          setPolarState((prev) => ({ ...prev, connected: false }));
        }
      );

      setPolarState((prev) => ({
        ...prev,
        connected: true,
        connecting: false,
        name: dev.name,
        batteryLevel: dev.battery !== undefined ? dev.battery : prev.batteryLevel,
      }));
      setIsSimulating(false);
    } catch (err: any) {
      setPolarState((prev) => ({
        ...prev,
        connecting: false,
        error: err.message || 'Bluetooth connection failed',
      }));
    }
  };

  const handleDisconnectPolar = async () => {
    await polarClient.disconnect();
    setPolarState((prev) => ({ ...prev, connected: false }));
  };

  // Handle Rogue Echo BLE connection
  const handleConnectEcho = async () => {
    setEchoState((prev) => ({ ...prev, connecting: true, error: null }));
    try {
      const dev = await rogueEchoClient.connect(
        (data: EchoBikeData) => {
          setCurrentCadence(data.cadenceRpm);
          setCurrentWatts(data.powerWatts);
          if (data.totalCalories !== undefined) setCumulativeCalories(data.totalCalories);
          if (data.totalDistanceMeters !== undefined) setCumulativeDistanceMeters(data.totalDistanceMeters);
          setEchoState((prev) => ({ ...prev, lastPacketTime: Date.now() }));
        },
        () => {
          setEchoState((prev) => ({ ...prev, connected: false }));
        }
      );

      setEchoState((prev) => ({
        ...prev,
        connected: true,
        connecting: false,
        name: dev.name,
        serviceType: dev.service,
      }));
      setIsSimulating(false);
    } catch (err: any) {
      setEchoState((prev) => ({
        ...prev,
        connecting: false,
        error: err.message || 'Bluetooth connection failed',
      }));
    }
  };

  const handleDisconnectEcho = async () => {
    await rogueEchoClient.disconnect();
    setEchoState((prev) => ({ ...prev, connected: false }));
  };

  // Telemetry Simulator loop
  useEffect(() => {
    if (isSimulating) {
      telemetrySimulator.setPreset(activePreset);
      telemetrySimulator.start((sample) => {
        // Feed real-time variables
        if (!polarState.connected) {
          setCurrentHr(sample.hr);
        }
        if (!echoState.connected) {
          setCurrentWatts(sample.watts);
          setCurrentCadence(sample.cadence);
          // Only increment cumulative if workout is active
          if (workoutActive && !workoutPaused) {
            setCumulativeCalories((prev) => Math.round((prev + sample.watts * 0.00098) * 10) / 10);
            const distDelta = (sample.speedKmh * 1000) / 3600;
            setCumulativeDistanceMeters((prev) => Math.round(prev + distDelta));
          }
        }
      });
    } else {
      telemetrySimulator.stop();
    }
    return () => {
      telemetrySimulator.stop();
    };
  }, [isSimulating, activePreset, polarState.connected, echoState.connected, workoutActive, workoutPaused]);

  // Master Workout Timer & 1 Hz Telemetry Logger
  useEffect(() => {
    if (!workoutActive || workoutPaused) return;

    const timer = setInterval(() => {
      setElapsedSec((prev) => {
        const nextSec = prev + 1;

        // Determine current HR Zone
        const hrPct = settings.maxHr > 0 ? (currentHr / settings.maxHr) * 100 : 0;
        let zone = 1;
        if (hrPct >= 90) zone = 5;
        else if (hrPct >= 80) zone = 4;
        else if (hrPct >= 70) zone = 3;
        else if (hrPct >= 60) zone = 2;
        else zone = 1;

        // Update HR Zone accumulated time
        setHrZoneSeconds((z) => {
          if (zone === 5) return { ...z, z5: z.z5 + 1 };
          if (zone === 4) return { ...z, z4: z.z4 + 1 };
          if (zone === 3) return { ...z, z3: z.z3 + 1 };
          if (zone === 2) return { ...z, z2: z.z2 + 1 };
          return { ...z, z1: z.z1 + 1 };
        });

        // Record 1 Hz sample for local database & chart
        const speedKmh = Math.round(currentCadence * 0.55 * 10) / 10;
        const newSample: TelemetrySample = {
          timestampSec: nextSec,
          timeIso: new Date().toISOString(),
          hr: currentHr,
          watts: currentWatts,
          cadence: currentCadence,
          calories: cumulativeCalories,
          distanceMeters: cumulativeDistanceMeters,
          speedKmh,
          hrZone: zone,
        };

        setSamples((prevSamples) => [...prevSamples, newSample]);

        // Broadcast to Pi server for other screens (SSE relay)
        if (nextSec % 2 === 0) {
          fetch('/api/telemetry/live', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              hr: currentHr,
              watts: currentWatts,
              cadence: currentCadence,
              calories: cumulativeCalories,
              distanceMeters: cumulativeDistanceMeters,
              speedKmh,
              workoutActive: true,
              workoutElapsedSec: nextSec,
            }),
          }).catch(() => {});
        }

        // Interval Program Progression (Tabata / Custom Work-Rest)
        if (intervalConfig) {
          setIntervalConfig((prevCfg) => {
            if (!prevCfg) return null;
            const remaining = prevCfg.phaseRemainingSec - 1;

            // Audio cues at 3, 2, 1 seconds
            if (remaining > 0 && remaining <= 3) {
              soundEffects.playCountdownTick();
            }

            if (remaining <= 0) {
              // Switch phase
              const nextIsWork = !prevCfg.isWorkPhase;
              let nextRound = prevCfg.currentRound;

              if (nextIsWork) {
                nextRound += 1;
                // If exceeded total rounds, workout ends!
                if (nextRound > prevCfg.totalRounds) {
                  soundEffects.playVictoryFanfare();
                  setTimeout(() => handleFinishWorkout(), 300);
                  return prevCfg;
                }
                soundEffects.playIntervalGo();
              } else {
                soundEffects.playRestChime();
              }

              return {
                ...prevCfg,
                currentRound: nextRound,
                isWorkPhase: nextIsWork,
                phaseRemainingSec: nextIsWork ? prevCfg.workSec : prevCfg.restSec,
              };
            }

            return { ...prevCfg, phaseRemainingSec: remaining };
          });
        }

        // Check Target Goals (e.g. 50 Cal sprint or Distance trial)
        if (activeSession?.targetGoal) {
          if (
            activeSession.targetGoal.type === 'calories' &&
            cumulativeCalories >= activeSession.targetGoal.targetValue
          ) {
            soundEffects.playVictoryFanfare();
            setTimeout(() => handleFinishWorkout(), 300);
          } else if (
            activeSession.targetGoal.type === 'distance' &&
            cumulativeDistanceMeters >= activeSession.targetGoal.targetValue
          ) {
            soundEffects.playVictoryFanfare();
            setTimeout(() => handleFinishWorkout(), 300);
          } else if (
            activeSession.targetGoal.type === 'time' &&
            nextSec >= activeSession.targetGoal.targetValue
          ) {
            soundEffects.playVictoryFanfare();
            setTimeout(() => handleFinishWorkout(), 300);
          }
        }

        return nextSec;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    workoutActive,
    workoutPaused,
    currentHr,
    currentWatts,
    currentCadence,
    cumulativeCalories,
    cumulativeDistanceMeters,
    intervalConfig,
    activeSession,
    settings.maxHr,
  ]);

  // Start new workout session
  const handleStartSession = (
    title: string,
    mode: WorkoutMode,
    goal?: { type: 'calories' | 'distance' | 'time'; targetValue: number },
    interval?: IntervalConfig
  ) => {
    const id = `session_${Date.now()}`;
    const newSession: WorkoutSession = {
      id,
      title,
      mode,
      targetGoal: goal,
      intervalConfig: interval,
      startTime: Date.now(),
      durationSec: 0,
      totalCalories: 0,
      totalDistanceMeters: 0,
      workKj: 0,
      avgWatts: 0,
      maxWatts: 0,
      avgHr: 0,
      maxHr: 0,
      avgCadence: 0,
      maxCadence: 0,
      hrZoneSeconds: { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 },
      samples: [],
    };

    setActiveSession(newSession);
    setIntervalConfig(interval || null);
    setElapsedSec(0);
    setCumulativeCalories(0);
    setCumulativeDistanceMeters(0);
    setSamples([]);
    setHrZoneSeconds({ z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 });
    setWorkoutActive(true);
    setWorkoutPaused(false);
    setActiveTab('hud');

    // Interval starter sound
    soundEffects.playIntervalGo();
  };

  const handlePauseWorkout = () => {
    setWorkoutPaused(!workoutPaused);
  };

  // Complete workout and save to Local Database
  const handleFinishWorkout = useCallback(async () => {
    if (!workoutActive && !activeSession) return;

    soundEffects.playVictoryFanfare();

    const sumWatts = samples.reduce((acc, s) => acc + s.watts, 0);
    const maxW = samples.length > 0 ? Math.max(...samples.map((s) => s.watts)) : currentWatts;
    const sumHr = samples.reduce((acc, s) => acc + s.hr, 0);
    const maxH = samples.length > 0 ? Math.max(...samples.map((s) => s.hr)) : currentHr;
    const sumCad = samples.reduce((acc, s) => acc + s.cadence, 0);
    const maxC = samples.length > 0 ? Math.max(...samples.map((s) => s.cadence)) : currentCadence;

    const n = Math.max(1, samples.length);
    const finalSession: WorkoutSession = {
      id: activeSession ? activeSession.id : `workout_${Date.now()}`,
      title: activeSession ? activeSession.title : 'Free Ride Session',
      mode: activeSession ? activeSession.mode : 'open',
      targetGoal: activeSession?.targetGoal,
      startTime: activeSession ? activeSession.startTime : Date.now() - elapsedSec * 1000,
      endTime: Date.now(),
      durationSec: elapsedSec,
      totalCalories: Math.round(cumulativeCalories),
      totalDistanceMeters: Math.round(cumulativeDistanceMeters),
      workKj: Math.round((sumWatts * elapsedSec) / (n * 1000) * elapsedSec) || Math.round(cumulativeCalories * 4.184 * 0.24),
      avgWatts: Math.round(sumWatts / n),
      maxWatts: maxW,
      avgHr: Math.round(sumHr / n),
      maxHr: maxH,
      avgCadence: Math.round((sumCad / n) * 10) / 10,
      maxCadence: maxC,
      hrZoneSeconds: { ...hrZoneSeconds },
      samples: [...samples],
    };

    // Save to IndexedDB
    await localDb.saveWorkout(finalSession);

    setCompletedWorkout(finalSession);
    setShowSummaryModal(true);
    setWorkoutActive(false);
    setWorkoutPaused(false);
    setActiveSession(null);
    setIntervalConfig(null);
  }, [
    workoutActive,
    activeSession,
    samples,
    elapsedSec,
    cumulativeCalories,
    cumulativeDistanceMeters,
    currentWatts,
    currentHr,
    currentCadence,
    hrZoneSeconds,
  ]);

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans selection:bg-orange-500/30 selection:text-white">
      {/* Universal Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        workoutActive={workoutActive}
        workoutPaused={workoutPaused}
        onStartWorkout={() => setShowPlannerModal(true)}
        onPauseWorkout={handlePauseWorkout}
        onStopWorkout={handleFinishWorkout}
        polarConnected={polarState.connected}
        echoConnected={echoState.connected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        {/* TAB 1: LIVE HUD */}
        {activeTab === 'hud' && (
          <div className="space-y-5">
            {/* Live Big Numbers HUD */}
            <LiveHud
              currentWatts={currentWatts}
              currentCadence={currentCadence}
              currentHr={currentHr}
              cumulativeCalories={cumulativeCalories}
              cumulativeDistanceMeters={cumulativeDistanceMeters}
              elapsedSec={elapsedSec}
              workoutActive={workoutActive}
              workoutPaused={workoutPaused}
              activeSession={activeSession}
              intervalConfig={intervalConfig}
              maxHr={settings.maxHr}
              soundEnabled={settings.soundEnabled}
              onToggleSound={() => {
                const toggled = !settings.soundEnabled;
                setSettings({ ...settings, soundEnabled: toggled });
                soundEffects.setEnabled(toggled);
              }}
              onNextRound={() => {
                if (intervalConfig) {
                  const nextIsWork = !intervalConfig.isWorkPhase;
                  const nextRound = nextIsWork ? intervalConfig.currentRound + 1 : intervalConfig.currentRound;
                  if (nextRound > intervalConfig.totalRounds) {
                    handleFinishWorkout();
                    return;
                  }
                  setIntervalConfig({
                    ...intervalConfig,
                    currentRound: nextRound,
                    isWorkPhase: nextIsWork,
                    phaseRemainingSec: nextIsWork ? intervalConfig.workSec : intervalConfig.restSec,
                  });
                  if (nextIsWork) soundEffects.playIntervalGo();
                  else soundEffects.playRestChime();
                }
              }}
            />

            {/* Real-time Hardware Telemetry Graph */}
            <RealtimeChart
              samples={samples}
              currentWatts={currentWatts}
              currentCadence={currentCadence}
              currentHr={currentHr}
            />

            {/* Polar H10 Heart Rate Zone Distribution */}
            <HrZoneBar
              currentHr={currentHr}
              maxHr={settings.maxHr}
              zoneSeconds={hrZoneSeconds}
            />

            {/* Quick Helper Banner if devices offline */}
            {!polarState.connected && !echoState.connected && isSimulating && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-400">
                  <AlertCircle className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>
                    Test Simulator Active (spiking watts & HR). Ready to connect your actual Polar H10 & Rogue Echo?
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('devices')}
                  className="px-3 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/40 font-semibold transition-colors shrink-0"
                >
                  Pair BLE Sensors
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: INTERVALS & WORKOUT PLANNER */}
        {activeTab === 'intervals' && (
          <WorkoutPlannerModal
            onStartSession={handleStartSession}
            onClose={() => setActiveTab('hud')}
          />
        )}

        {/* TAB 3: HISTORY & PRS */}
        {activeTab === 'history' && <HistoryView maxHr={settings.maxHr} />}

        {/* TAB 4: SENSORS & BLE */}
        {activeTab === 'devices' && (
          <DeviceManagerModal
            polarState={polarState}
            echoState={echoState}
            isSimulating={isSimulating}
            activePreset={activePreset}
            onConnectPolar={handleConnectPolar}
            onDisconnectPolar={handleDisconnectPolar}
            onConnectEcho={handleConnectEcho}
            onDisconnectEcho={handleDisconnectEcho}
            onToggleSimulator={(enabled) => setIsSimulating(enabled)}
            onChangePreset={(preset) => {
              setActivePreset(preset);
              telemetrySimulator.setPreset(preset);
            }}
            onSetManualWatts={(watts) => {
              telemetrySimulator.setManualTarget(watts);
            }}
          />
        )}

        {/* TAB 5: RPI HUB & MOBILE QR */}
        {activeTab === 'pi-hub' && <PiNetworkModal />}
      </main>

      {/* Floating Settings Button */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={() => setShowSettingsModal(true)}
          aria-label="Open Athlete Profile and Settings"
          className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 shadow-lg shadow-black/50 transition-all active:scale-95"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Modals */}
      {showPlannerModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <WorkoutPlannerModal
              onStartSession={handleStartSession}
              onClose={() => setShowPlannerModal(false)}
            />
          </div>
        </div>
      )}

      {showSummaryModal && completedWorkout && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6">
            <WorkoutSummaryModal
              workout={completedWorkout}
              maxHr={settings.maxHr}
              onClose={() => setShowSummaryModal(false)}
            />
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6">
            <SettingsModal
              settings={settings}
              onUpdateSettings={(newSettings) => setSettings(newSettings)}
              onClose={() => setShowSettingsModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
