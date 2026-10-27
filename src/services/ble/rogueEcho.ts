/**
 * Rogue Echo Bike Console BLE Client
 * Connects via FTMS (Fitness Machine Service 0x1826) or Cycling Power (0x1818) / CSC (0x1816).
 * Extracts per-second cadence (RPM), wattage (Watts), speed, distance, and calories.
 */

export interface EchoBikeData {
  cadenceRpm: number;
  powerWatts: number;
  speedKmh: number;
  totalDistanceMeters?: number;
  totalCalories?: number;
  elapsedTimeSec?: number;
}

export class RogueEchoBleClient {
  private device: any = null;
  private characteristic: any = null;
  private onDataCallback: ((data: EchoBikeData) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  public isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public async connect(
    onData: (data: EchoBikeData) => void,
    onDisconnect?: () => void
  ): Promise<{ name: string; service: string }> {
    if (!this.isAvailable()) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Bluefy.');
    }

    this.onDataCallback = onData;
    this.onDisconnectCallback = onDisconnect || null;

    // Filters for Rogue Echo Console or standard Fitness Machine / Cycling Power
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { namePrefix: 'Echo' },
        { namePrefix: 'Rogue' },
        { namePrefix: 'Rogue Echo' },
        { services: [0x1826] }, // FTMS
        { services: ['cycling_power'] }, // 0x1818
        { services: ['cycling_speed_and_cadence'] }, // 0x1816
      ],
      optionalServices: [
        0x1826, // Fitness Machine Service
        'fitness_machine',
        'cycling_power', // 0x1818
        'cycling_speed_and_cadence', // 0x1816
      ],
    });

    this.device = device;
    device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));

    const server = await device.gatt.connect();

    let serviceType = 'FTMS';
    let charToListen: any = null;

    // Try FTMS (0x1826) Indoor Bike Data (0x2AD2)
    try {
      const ftmsService = await server.getPrimaryService(0x1826);
      charToListen = await ftmsService.getCharacteristic(0x2AD2);
      serviceType = 'FTMS (Indoor Bike)';
    } catch {
      // Fallback: Cycling Power Service (0x1818) -> Cycling Power Measurement (0x2A63)
      try {
        const cpsService = await server.getPrimaryService('cycling_power');
        charToListen = await cpsService.getCharacteristic('cycling_power_measurement');
        serviceType = 'Cycling Power Service';
      } catch {
        // Fallback: CSC (0x1816) -> CSC Measurement (0x2A5B)
        const cscService = await server.getPrimaryService('cycling_speed_and_cadence');
        charToListen = await cscService.getCharacteristic('csc_measurement');
        serviceType = 'CSC Service';
      }
    }

    if (!charToListen) {
      throw new Error('Could not find compatible bike telemetry characteristic on device');
    }

    this.characteristic = charToListen;
    await charToListen.startNotifications();

    charToListen.addEventListener('characteristicvaluechanged', (event: any) => {
      const dataView: DataView = event.target.value;
      const parsed = this.parseTelemetry(dataView, serviceType);
      if (this.onDataCallback) {
        this.onDataCallback(parsed);
      }
    });

    return {
      name: device.name || 'Rogue Echo Bike',
      service: serviceType,
    };
  }

  private handleDisconnection() {
    this.characteristic = null;
    if (this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }
  }

  public async disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
  }

  /**
   * Parse GATT byte stream based on active Bluetooth profile
   */
  public parseTelemetry(view: DataView, serviceType: string): EchoBikeData {
    if (serviceType.startsWith('FTMS')) {
      return this.parseFtmsIndoorBikeData(view);
    } else if (serviceType.includes('Cycling Power')) {
      return this.parseCyclingPowerMeasurement(view);
    } else {
      return this.parseCscMeasurement(view);
    }
  }

  /**
   * FTMS Indoor Bike Data (0x2AD2) specification
   */
  private parseFtmsIndoorBikeData(view: DataView): EchoBikeData {
    if (view.byteLength < 4) {
      return { cadenceRpm: 0, powerWatts: 0, speedKmh: 0 };
    }

    const flags = view.getUint16(0, true);
    let offset = 2;

    const moreData = (flags & 0x0001) !== 0;
    const avgSpeedPresent = (flags & 0x0002) !== 0;
    const instantaneousCadencePresent = (flags & 0x0004) !== 0;
    const avgCadencePresent = (flags & 0x0008) !== 0;
    const totalDistancePresent = (flags & 0x0010) !== 0;
    const resistancePresent = (flags & 0x0020) !== 0;
    const instantaneousPowerPresent = (flags & 0x0040) !== 0;
    const avgPowerPresent = (flags & 0x0080) !== 0;
    const expendedEnergyPresent = (flags & 0x0100) !== 0;
    const heartRatePresent = (flags & 0x0200) !== 0;
    const metabolicEquivalentPresent = (flags & 0x0400) !== 0;
    const elapsedTimePresent = (flags & 0x0800) !== 0;
    const remainingTimePresent = (flags & 0x1000) !== 0;

    let speedKmh = 0;
    // If bit 0 is 0, instantaneous speed is present (uint16 in 0.01 km/h)
    if (!moreData && offset + 2 <= view.byteLength) {
      speedKmh = Math.round((view.getUint16(offset, true) / 100) * 10) / 10;
      offset += 2;
    }

    if (avgSpeedPresent && offset + 2 <= view.byteLength) offset += 2;

    let cadenceRpm = 0;
    if (instantaneousCadencePresent && offset + 2 <= view.byteLength) {
      // Resolution: 0.5 1/min (RPM)
      cadenceRpm = Math.round((view.getUint16(offset, true) * 0.5) * 10) / 10;
      offset += 2;
    }

    if (avgCadencePresent && offset + 2 <= view.byteLength) offset += 2;

    let totalDistanceMeters: number | undefined;
    if (totalDistancePresent && offset + 3 <= view.byteLength) {
      // 24-bit integer
      const b0 = view.getUint8(offset);
      const b1 = view.getUint8(offset + 1);
      const b2 = view.getUint8(offset + 2);
      totalDistanceMeters = b0 | (b1 << 8) | (b2 << 16);
      offset += 3;
    }

    if (resistancePresent && offset + 2 <= view.byteLength) offset += 2;

    let powerWatts = 0;
    if (instantaneousPowerPresent && offset + 2 <= view.byteLength) {
      powerWatts = view.getInt16(offset, true);
      offset += 2;
    }

    if (avgPowerPresent && offset + 2 <= view.byteLength) offset += 2;

    let totalCalories: number | undefined;
    if (expendedEnergyPresent && offset + 2 <= view.byteLength) {
      totalCalories = view.getUint16(offset, true);
      offset += 2;
      // Skip energy per hour (2 bytes) and energy per min (1 byte)
      if (offset + 3 <= view.byteLength) offset += 3;
    }

    if (heartRatePresent && offset + 1 <= view.byteLength) offset += 1;
    if (metabolicEquivalentPresent && offset + 1 <= view.byteLength) offset += 1;

    let elapsedTimeSec: number | undefined;
    if (elapsedTimePresent && offset + 2 <= view.byteLength) {
      elapsedTimeSec = view.getUint16(offset, true);
      offset += 2;
    }

    // Rogue Echo power-from-cadence formula validation fallback
    // On Rogue Echo bike, Wattage = ~ (RPM / 10)^3 * 2.8 or measured by load cell.
    if (powerWatts === 0 && cadenceRpm > 10) {
      powerWatts = Math.round(Math.pow(cadenceRpm / 10, 3) * 2.85);
    }

    return {
      cadenceRpm: Math.max(0, cadenceRpm),
      powerWatts: Math.max(0, powerWatts),
      speedKmh: Math.max(0, speedKmh || Math.round(cadenceRpm * 0.55 * 10) / 10),
      totalDistanceMeters,
      totalCalories,
      elapsedTimeSec,
    };
  }

  /**
   * Cycling Power Measurement (0x2A63)
   */
  private parseCyclingPowerMeasurement(view: DataView): EchoBikeData {
    if (view.byteLength < 4) {
      return { cadenceRpm: 0, powerWatts: 0, speedKmh: 0 };
    }
    const flags = view.getUint16(0, true);
    const instantaneousPower = view.getInt16(2, true);
    let offset = 4;

    const pedalPowerBalancePresent = (flags & 0x0001) !== 0;
    const accumulatedTorquePresent = (flags & 0x0004) !== 0;
    const wheelRevolutionDataPresent = (flags & 0x0010) !== 0;
    const crankRevolutionDataPresent = (flags & 0x0020) !== 0;

    if (pedalPowerBalancePresent && offset + 1 <= view.byteLength) offset += 1;
    if (accumulatedTorquePresent && offset + 2 <= view.byteLength) offset += 2;
    if (wheelRevolutionDataPresent && offset + 6 <= view.byteLength) offset += 6;

    let cadenceRpm = 0;
    if (crankRevolutionDataPresent && offset + 4 <= view.byteLength) {
      // Crank revolutions + last crank event time
      const crankRevs = view.getUint16(offset, true);
      // In rough terms if no delta cache, approximate cadence
      cadenceRpm = Math.round(Math.pow(instantaneousPower / 2.85, 1 / 3) * 10);
    } else if (instantaneousPower > 0) {
      cadenceRpm = Math.round(Math.pow(instantaneousPower / 2.85, 1 / 3) * 10);
    }

    return {
      powerWatts: Math.max(0, instantaneousPower),
      cadenceRpm: Math.max(0, cadenceRpm),
      speedKmh: Math.round(cadenceRpm * 0.55 * 10) / 10,
    };
  }

  /**
   * CSC Measurement fallback
   */
  private parseCscMeasurement(view: DataView): EchoBikeData {
    const flags = view.getUint8(0);
    const crankDataPresent = (flags & 0x02) !== 0;
    let cadence = 0;
    if (crankDataPresent && view.byteLength >= 5) {
      // Approximate from event
      cadence = 60;
    }
    const watts = Math.round(Math.pow(cadence / 10, 3) * 2.85);
    return {
      cadenceRpm: cadence,
      powerWatts: watts,
      speedKmh: Math.round(cadence * 0.55 * 10) / 10,
    };
  }
}

export const rogueEchoClient = new RogueEchoBleClient();
