/**
 * Local IndexedDB Database for EchoPulse
 * Stores workout sessions, per-second timeseries telemetry, and personal records.
 * Syncs seamlessly with Raspberry Pi local disk storage (/api/workouts).
 */

import { WorkoutSession, PersonalRecords, UserAthleteSettings, TelemetrySample } from '../../types/telemetry';

const DB_NAME = 'EchoPulseDB';
const DB_VERSION = 1;

class LocalDatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db: IDBDatabase = event.target.result;

        // Workouts store
        if (!db.objectStoreNames.contains('workouts')) {
          const workoutStore = db.createObjectStore('workouts', { keyPath: 'id' });
          workoutStore.createIndex('startTime', 'startTime', { unique: false });
          workoutStore.createIndex('mode', 'mode', { unique: false });
        }

        // Key-value store for settings and PRs
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  /**
   * Save a completed or ongoing workout
   */
  public async saveWorkout(workout: WorkoutSession): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('workouts', 'readwrite');
      const store = tx.objectStore('workouts');
      store.put(workout);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // Update PRs if applicable
    await this.evaluatePersonalRecords(workout);

    // Also mirror to Raspberry Pi local disk backend if online
    try {
      fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workout),
      }).catch(() => {});
    } catch {
      // Offline on mobile/kiosk is fine
    }
  }

  /**
   * Get all workouts sorted newest first
   */
  public async getAllWorkouts(): Promise<WorkoutSession[]> {
    const db = await this.getDB();
    const workouts = await new Promise<WorkoutSession[]>((resolve, reject) => {
      const tx = db.transaction('workouts', 'readonly');
      const store = tx.objectStore('workouts');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    // If completely empty, seed with 2 realistic Rogue Echo + Polar H10 workouts
    if (workouts.length === 0) {
      const seeded = this.generateSampleWorkouts();
      for (const w of seeded) {
        await this.saveWorkout(w);
      }
      return seeded.sort((a, b) => b.startTime - a.startTime);
    }

    return workouts.sort((a, b) => b.startTime - a.startTime);
  }

  public async getWorkoutById(id: string): Promise<WorkoutSession | null> {
    const db = await this.getDB();
    return new Promise<WorkoutSession | null>((resolve, reject) => {
      const tx = db.transaction('workouts', 'readonly');
      const store = tx.objectStore('workouts');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  public async deleteWorkout(id: string): Promise<void> {
    const db = await this.getDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('workouts', 'readwrite');
      const store = tx.objectStore('workouts');
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    try {
      fetch(`/api/workouts/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch {
      // Ignore
    }
  }

  /**
   * Personal Records Management
   */
  public async getPersonalRecords(): Promise<PersonalRecords> {
    const db = await this.getDB();
    const prs = await new Promise<PersonalRecords | null>((resolve, reject) => {
      const tx = db.transaction('keyval', 'readonly');
      const store = tx.objectStore('keyval');
      const request = store.get('personal_records');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    return prs || {
      maxWatts5s: 785,
      maxWatts30s: 620,
      maxWatts60s: 480,
      maxHr: 191,
      fastest50CalSec: 88,
      highestAvgWatts20m: 235,
    };
  }

  public async savePersonalRecords(prs: PersonalRecords): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('keyval', 'readwrite');
      const store = tx.objectStore('keyval');
      store.put(prs, 'personal_records');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async evaluatePersonalRecords(workout: WorkoutSession): Promise<void> {
    const prs = await this.getPersonalRecords();
    let updated = false;

    if (workout.maxWatts > prs.maxWatts5s) {
      prs.maxWatts5s = workout.maxWatts;
      updated = true;
    }
    if (workout.maxHr > prs.maxHr) {
      prs.maxHr = workout.maxHr;
      updated = true;
    }

    // Check if 50 cal sprint
    if (workout.mode === 'target_cals' && workout.totalCalories >= 50) {
      if (!prs.fastest50CalSec || workout.durationSec < prs.fastest50CalSec) {
        prs.fastest50CalSec = workout.durationSec;
        updated = true;
      }
    }

    if (updated) {
      await this.savePersonalRecords(prs);
    }
  }

  /**
   * Athlete Profile Settings
   */
  public async getAthleteSettings(): Promise<UserAthleteSettings> {
    const db = await this.getDB();
    const settings = await new Promise<UserAthleteSettings | null>((resolve, reject) => {
      const tx = db.transaction('keyval', 'readonly');
      const store = tx.objectStore('keyval');
      const request = store.get('athlete_settings');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });

    return settings || {
      name: 'Athlete',
      age: 32,
      maxHr: 188,
      restingHr: 54,
      weightKg: 82,
      ftpWatts: 260,
      units: 'metric',
      soundEnabled: true,
      soundVolume: 0.8,
      screenWakeLock: true,
    };
  }

  public async saveAthleteSettings(settings: UserAthleteSettings): Promise<void> {
    const db = await this.getDB();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction('keyval', 'readwrite');
      const store = tx.objectStore('keyval');
      store.put(settings, 'athlete_settings');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Export workout to CSV with second-by-second telemetry
   */
  public exportWorkoutCsv(workout: WorkoutSession): string {
    const header = [
      'Second',
      'Time_ISO',
      'Power_Watts',
      'Cadence_RPM',
      'HeartRate_BPM',
      'Calories_Cumulative',
      'Distance_Meters',
      'Speed_KMH',
      'HR_Zone'
    ].join(',');

    const rows = workout.samples.map(s => [
      s.timestampSec,
      s.timeIso,
      s.watts,
      s.cadence,
      s.hr,
      s.calories,
      s.distanceMeters,
      s.speedKmh,
      s.hrZone
    ].join(','));

    return [header, ...rows].join('\n');
  }

  /**
   * Generates realistic seeded workouts for initial app boot
   */
  private generateSampleWorkouts(): WorkoutSession[] {
    const now = Date.now();

    // 1. Tabata Echo Death Session (240s = 8 rounds of 20s/10s)
    const tabataSamples: TelemetrySample[] = [];
    let cal = 0;
    let dist = 0;
    let maxW = 0;
    let maxH = 0;
    let sumW = 0;
    let sumH = 0;
    let sumC = 0;

    const zoneSecs = { z1: 15, z2: 30, z3: 45, z4: 70, z5: 80 };

    for (let s = 1; s <= 240; s++) {
      const round = Math.floor((s - 1) / 30);
      const phaseSec = (s - 1) % 30;
      const isWork = phaseSec < 20;

      let w = 0;
      let c = 0;
      let h = 125 + Math.floor(s * 0.25);

      if (isWork) {
        // High power surge decaying slightly by round
        const peak = 750 - (round * 25);
        w = Math.max(380, Math.round(peak - (phaseSec * 8) + (Math.sin(s) * 30)));
        c = Math.round(10 * Math.pow(w / 2.85, 1 / 3) * 10) / 10;
        h = Math.min(189, 145 + (round * 5) + Math.floor(phaseSec * 0.8));
      } else {
        w = 70 + Math.round(Math.sin(s) * 15);
        c = 35 + Math.round(Math.cos(s) * 4);
        h = Math.max(140, h - 3);
      }

      cal += w * 0.00098;
      const spd = Math.round(c * 0.55 * 10) / 10;
      dist += (spd * 1000) / 3600;

      maxW = Math.max(maxW, w);
      maxH = Math.max(maxH, h);
      sumW += w;
      sumH += h;
      sumC += c;

      const zone = h >= 170 ? 5 : h >= 152 ? 4 : h >= 134 ? 3 : h >= 115 ? 2 : 1;

      tabataSamples.push({
        timestampSec: s,
        timeIso: new Date(now - (240 - s) * 1000).toISOString(),
        hr: h,
        watts: w,
        cadence: c,
        calories: Math.round(cal * 10) / 10,
        distanceMeters: Math.round(dist),
        speedKmh: spd,
        hrZone: zone,
      });
    }

    const tabataWorkout: WorkoutSession = {
      id: 'workout_sample_tabata_1',
      title: 'Echo Tabata Protocol (8x 20/10)',
      mode: 'tabata',
      intervalConfig: {
        name: 'Tabata 20/10',
        workSec: 20,
        restSec: 10,
        totalRounds: 8,
        currentRound: 8,
        isWorkPhase: false,
        phaseRemainingSec: 0,
      },
      startTime: now - 3600 * 1000 * 4,
      endTime: now - 3600 * 1000 * 4 + 240 * 1000,
      durationSec: 240,
      totalCalories: Math.round(cal),
      totalDistanceMeters: Math.round(dist),
      workKj: Math.round((sumW * 240) / (240 * 1000) * 240),
      avgWatts: Math.round(sumW / 240),
      maxWatts: maxW,
      avgHr: Math.round(sumH / 240),
      maxHr: maxH,
      avgCadence: Math.round((sumC / 240) * 10) / 10,
      maxCadence: 92,
      hrZoneSeconds: zoneSecs,
      samples: tabataSamples,
      notes: 'Crushing lung-burner. Hit 750W in round 1, held 420W minimum in round 8.',
      isPr: true,
    };

    // 2. 50 Calorie Sprint Workout
    const sprintSamples: TelemetrySample[] = [];
    cal = 0;
    dist = 0;
    maxW = 0;
    maxH = 0;
    sumW = 0;
    sumH = 0;
    sumC = 0;

    for (let s = 1; s <= 92; s++) {
      let w = 820 - (s * 3.8) + (Math.sin(s) * 20);
      w = Math.max(380, Math.round(w));
      const c = Math.round(10 * Math.pow(w / 2.85, 1 / 3) * 10) / 10;
      const h = Math.min(191, 118 + Math.floor(s * 0.82));
      cal += w * 0.00098;
      const spd = Math.round(c * 0.55 * 10) / 10;
      dist += (spd * 1000) / 3600;

      maxW = Math.max(maxW, w);
      maxH = Math.max(maxH, h);
      sumW += w;
      sumH += h;
      sumC += c;

      const zone = h >= 170 ? 5 : h >= 152 ? 4 : 3;

      sprintSamples.push({
        timestampSec: s,
        timeIso: new Date(now - (92 - s) * 1000).toISOString(),
        hr: h,
        watts: w,
        cadence: c,
        calories: Math.round(cal * 10) / 10,
        distanceMeters: Math.round(dist),
        speedKmh: spd,
        hrZone: zone,
      });
    }

    const sprintWorkout: WorkoutSession = {
      id: 'workout_sample_50cal_2',
      title: '50 Calorie All-Out Benchmark',
      mode: 'target_cals',
      targetGoal: { type: 'calories', targetValue: 50 },
      startTime: now - 86400 * 1000,
      endTime: now - 86400 * 1000 + 92 * 1000,
      durationSec: 92,
      totalCalories: 50,
      totalDistanceMeters: Math.round(dist),
      workKj: 52,
      avgWatts: Math.round(sumW / 92),
      maxWatts: maxW,
      avgHr: Math.round(sumH / 92),
      maxHr: maxH,
      avgCadence: Math.round((sumC / 92) * 10) / 10,
      maxCadence: 96,
      hrZoneSeconds: { z1: 0, z2: 5, z3: 15, z4: 32, z5: 40 },
      samples: sprintSamples,
      notes: 'Completed 50 cals in 1:32! Peak power 820W.',
      isPr: true,
    };

    return [tabataWorkout, sprintWorkout];
  }
}

export const localDb = new LocalDatabaseService();
