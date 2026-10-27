/**
 * Realistic Telemetry Simulator for Rogue Echo Bike & Polar H10
 * Simulates real human physiology and air-resistance power curves.
 */

export type SimulationPreset = 'tabata' | 'sprint50' | 'aerobic_zone2' | 'ramp_test' | 'manual';

export interface SimulatedState {
  targetWatts: number;
  currentWatts: number;
  cadenceRpm: number;
  hrBpm: number;
  cumulativeCalories: number;
  cumulativeDistanceMeters: number;
  speedKmh: number;
}

export class TelemetrySimulator {
  private active: boolean = false;
  private intervalTimer: any = null;
  private preset: SimulationPreset = 'tabata';
  private tickCount: number = 0;
  
  // Current values
  private currentWatts: number = 0;
  private targetWatts: number = 300;
  private currentCadence: number = 0;
  private currentHr: number = 110;
  private targetHr: number = 145;
  private cumulativeCalories: number = 0;
  private cumulativeDistanceMeters: number = 0;

  private onTickCallback: ((sample: {
    hr: number;
    watts: number;
    cadence: number;
    calories: number;
    distanceMeters: number;
    speedKmh: number;
  }) => void) | null = null;

  public isRunning(): boolean {
    return this.active;
  }

  public setPreset(preset: SimulationPreset) {
    this.preset = preset;
  }

  public setManualTarget(watts: number) {
    this.preset = 'manual';
    this.targetWatts = Math.max(0, watts);
    this.targetHr = Math.min(195, 90 + (this.targetWatts / 4.5));
  }

  public start(callback: (sample: any) => void) {
    if (this.active) return;
    this.active = true;
    this.onTickCallback = callback;
    this.tickCount = 0;

    this.intervalTimer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  public stop() {
    this.active = false;
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
  }

  public resetMetrics() {
    this.cumulativeCalories = 0;
    this.cumulativeDistanceMeters = 0;
    this.tickCount = 0;
    this.currentWatts = 0;
    this.currentCadence = 0;
    this.currentHr = 115;
  }

  private tick() {
    this.tickCount++;

    // Compute target values based on workout preset
    if (this.preset === 'tabata') {
      const cycle = this.tickCount % 30; // 20s work, 10s rest
      if (cycle < 20) {
        // Work phase: 550W - 850W explosive power
        const fatigue = Math.floor(this.tickCount / 30) * 15; // gradual fatigue
        this.targetWatts = Math.max(400, 720 - fatigue + (Math.sin(this.tickCount) * 40));
        this.targetHr = Math.min(192, 140 + Math.floor(this.tickCount * 0.45));
      } else {
        // Rest phase: soft spin
        this.targetWatts = 60 + Math.sin(this.tickCount) * 20;
        this.targetHr = Math.max(130, this.currentHr - 2);
      }
    } else if (this.preset === 'sprint50') {
      // 50 Cal sprint: starts at 900W, drops to 550W
      if (this.tickCount < 6) {
        this.targetWatts = 880 + Math.random() * 50;
      } else if (this.tickCount < 30) {
        this.targetWatts = 650 - (this.tickCount * 5);
      } else {
        this.targetWatts = 420;
      }
      this.targetHr = Math.min(194, 120 + this.tickCount * 1.8);
    } else if (this.preset === 'aerobic_zone2') {
      // Steady Zone 2 aerobic base: ~180-220W steady
      this.targetWatts = 195 + (Math.sin(this.tickCount / 12) * 15);
      this.targetHr = 138 + (Math.sin(this.tickCount / 20) * 4);
    } else if (this.preset === 'ramp_test') {
      // Steps up 25W every 60s
      const step = Math.floor(this.tickCount / 60);
      this.targetWatts = 150 + (step * 30);
      this.targetHr = Math.min(196, 120 + (step * 9));
    }

    // Physiological smoothing (HR reacts with cardiac inertia, Watts react with flywheel inertia)
    const wattNoise = (Math.random() - 0.5) * 12;
    this.currentWatts = Math.round(this.currentWatts + (this.targetWatts - this.currentWatts) * 0.45 + wattNoise);
    this.currentWatts = Math.max(0, this.currentWatts);

    // Calculate Cadence from Rogue Echo physics: Watts = (RPM / 10)^3 * 2.85
    // RPM = 10 * (Watts / 2.85)^(1/3)
    if (this.currentWatts > 10) {
      const calcRpm = 10 * Math.pow(this.currentWatts / 2.85, 1 / 3);
      const rpmNoise = (Math.random() - 0.5) * 1.5;
      this.currentCadence = Math.round((calcRpm + rpmNoise) * 10) / 10;
    } else {
      this.currentCadence = 0;
    }

    // Cardiac lag: HR drifts toward target gradually
    const hrNoise = (Math.random() - 0.5) * 1.2;
    this.currentHr = Math.round(this.currentHr + (this.targetHr - this.currentHr) * 0.08 + hrNoise);
    this.currentHr = Math.max(60, Math.min(210, this.currentHr));

    // Distance: Speed based on cadence/watts (1 rev ~ 6.5m equivalent on Echo bike gearing)
    // Speed km/h approx: cadence * 0.55
    const speedKmh = Math.round(this.currentCadence * 0.55 * 10) / 10;
    const distanceDeltaMeters = (speedKmh * 1000) / 3600;
    this.cumulativeDistanceMeters += distanceDeltaMeters;

    // Calorie burn: 1 Watt = 1 Joule/sec. Human efficiency is ~22-25% (~4.184 kJ / kcal with 24% eff -> ~1W * 1s ~ 0.00096 kcal)
    const calDelta = (this.currentWatts * 0.00098);
    this.cumulativeCalories += calDelta;

    if (this.onTickCallback) {
      this.onTickCallback({
        hr: Math.round(this.currentHr),
        watts: Math.round(this.currentWatts),
        cadence: Math.round(this.currentCadence),
        calories: Math.round(this.cumulativeCalories * 10) / 10,
        distanceMeters: Math.round(this.cumulativeDistanceMeters),
        speedKmh,
      });
    }
  }
}

export const telemetrySimulator = new TelemetrySimulator();
