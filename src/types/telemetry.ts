/**
 * Telemetry types and structures for Rogue Echo Bike & Polar H10 Hub
 */

export interface TelemetrySample {
  timestampSec: number;        // Elapsed seconds in workout
  timeIso: string;             // ISO timestamp
  hr: number;                  // Heart rate in BPM (per-second from Polar H10)
  watts: number;               // Instantaneous wattage (per-second from Rogue Echo)
  cadence: number;             // Instantaneous cadence in RPM (per-second from Rogue Echo)
  calories: number;            // Cumulative calories burned
  distanceMeters: number;      // Cumulative distance in meters
  speedKmh: number;            // Calculated / reported speed in km/h
  hrZone: number;              // 1 to 5
}

export type WorkoutMode = 
  | 'open'
  | 'tabata'        // 20s work / 10s rest (8 rounds standard)
  | 'intervals'     // Custom work/rest intervals
  | 'target_cals'   // e.g. 50 Cal sprint
  | 'target_dist'   // e.g. 5000m
  | 'target_time';   // e.g. 20 min FTP test

export interface IntervalConfig {
  name: string;
  workSec: number;
  restSec: number;
  totalRounds: number;
  currentRound: number;
  isWorkPhase: boolean;
  phaseRemainingSec: number;
}

export interface WorkoutSession {
  id: string;
  title: string;
  mode: WorkoutMode;
  targetGoal?: {
    type: 'calories' | 'distance' | 'time';
    targetValue: number;
  };
  intervalConfig?: IntervalConfig;
  startTime: number;
  endTime?: number;
  durationSec: number;
  
  // Aggregate Metrics (once per workout / final)
  totalCalories: number;
  totalDistanceMeters: number;
  workKj: number;
  avgWatts: number;
  maxWatts: number;
  avgHr: number;
  maxHr: number;
  avgCadence: number;
  maxCadence: number;
  
  // HR Zone time in seconds
  hrZoneSeconds: {
    z1: number; // Recovery (<60% max HR)
    z2: number; // Aerobic Base (60-70%)
    z3: number; // Tempo (70-80%)
    z4: number; // Lactate Threshold (80-90%)
    z5: number; // VO2 Max / Anaerobic (90-100%)
  };

  // Full timeseries
  samples: TelemetrySample[];
  notes?: string;
  isPr?: boolean;
}

export interface DeviceState {
  connected: boolean;
  connecting: boolean;
  name: string;
  batteryLevel?: number;
  lastPacketTime?: number;
  error?: string | null;
  sensorContact?: boolean;
  serviceType?: string;
}

export interface UserAthleteSettings {
  name: string;
  age: number;
  maxHr: number;
  restingHr: number;
  weightKg: number;
  ftpWatts: number;
  units: 'metric' | 'imperial';
  soundEnabled: boolean;
  soundVolume: number;
  screenWakeLock: boolean;
}

export interface PersonalRecords {
  maxWatts5s: number;
  maxWatts30s: number;
  maxWatts60s: number;
  maxHr: number;
  fastest50CalSec: number | null;
  highestAvgWatts20m: number;
}
