/**
 * Polar H10 BLE Web Bluetooth Client
 * Handles connection, Heart Rate Measurement (0x180D/0x2A37), Contact detection, and Battery Level (0x180F/0x2A19).
 */

export interface PolarHRData {
  hr: number;
  contactDetected: boolean;
  energyExpendedKcal?: number;
  rrIntervalsMs?: number[];
}

export class PolarH10BleClient {
  private device: any = null;
  private hrCharacteristic: any = null;
  private batteryCharacteristic: any = null;
  private onDataCallback: ((data: PolarHRData) => void) | null = null;
  private onBatteryCallback: ((level: number) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;

  public isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public async connect(
    onData: (data: PolarHRData) => void,
    onBattery?: (level: number) => void,
    onDisconnect?: () => void
  ): Promise<{ name: string; battery?: number }> {
    if (!this.isAvailable()) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Bluefy.');
    }

    this.onDataCallback = onData;
    this.onBatteryCallback = onBattery || null;
    this.onDisconnectCallback = onDisconnect || null;

    // Filter for Polar H10 specifically or generic Heart Rate devices
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [
        { services: ['heart_rate'] },
        { namePrefix: 'Polar H10' },
        { namePrefix: 'Polar' },
      ],
      optionalServices: ['heart_rate', 'battery_service', 0x180d, 0x180f],
    });

    this.device = device;
    device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));

    const server = await device.gatt.connect();

    // 1. Heart Rate Service (0x180D)
    const hrService = await server.getPrimaryService('heart_rate');
    const hrChar = await hrService.getCharacteristic('heart_rate_measurement');
    this.hrCharacteristic = hrChar;

    await hrChar.startNotifications();
    hrChar.addEventListener('characteristicvaluechanged', (event: any) => {
      const dataView: DataView = event.target.value;
      const parsed = this.parseHeartRate(dataView);
      if (this.onDataCallback) {
        this.onDataCallback(parsed);
      }
    });

    // 2. Battery Service (0x180F) - optional
    let batteryLevel: number | undefined;
    try {
      const batteryService = await server.getPrimaryService('battery_service');
      const batteryChar = await batteryService.getCharacteristic('battery_level');
      this.batteryCharacteristic = batteryChar;
      const bVal = await batteryChar.readValue();
      batteryLevel = bVal.getUint8(0);
      if (this.onBatteryCallback && batteryLevel !== undefined) {
        this.onBatteryCallback(batteryLevel);
      }
    } catch {
      // Battery service might not be exposed on all firmware revisions
    }

    return {
      name: device.name || 'Polar H10',
      battery: batteryLevel,
    };
  }

  private handleDisconnection() {
    this.hrCharacteristic = null;
    this.batteryCharacteristic = null;
    if (this.onDisconnectCallback) {
      this.onDisconnectCallback();
    }
  }

  public async disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.hrCharacteristic = null;
    this.batteryCharacteristic = null;
  }

  /**
   * Parse Bluetooth GATT Heart Rate Measurement Characteristic (0x2A37)
   */
  public parseHeartRate(value: DataView): PolarHRData {
    const flags = value.getUint8(0);
    const is16Bit = (flags & 0x01) !== 0;
    const contactSensorSupported = (flags & 0x04) !== 0;
    const contactDetected = contactSensorSupported ? (flags & 0x02) !== 0 : true;
    const energyExpendedPresent = (flags & 0x08) !== 0;
    const rrIntervalsPresent = (flags & 0x10) !== 0;

    let offset = 1;
    let hr = 0;
    if (is16Bit) {
      hr = value.getUint16(offset, /* littleEndian */ true);
      offset += 2;
    } else {
      hr = value.getUint8(offset);
      offset += 1;
    }

    let energyExpendedKcal: number | undefined;
    if (energyExpendedPresent && offset + 2 <= value.byteLength) {
      energyExpendedKcal = value.getUint16(offset, true);
      offset += 2;
    }

    const rrIntervalsMs: number[] = [];
    if (rrIntervalsPresent) {
      while (offset + 2 <= value.byteLength) {
        const rrRaw = value.getUint16(offset, true);
        // Resolution is 1/1024 second (~0.976 ms)
        rrIntervalsMs.push(Math.round((rrRaw / 1024) * 1000));
        offset += 2;
      }
    }

    return {
      hr,
      contactDetected,
      energyExpendedKcal,
      rrIntervalsMs: rrIntervalsMs.length > 0 ? rrIntervalsMs : undefined,
    };
  }
}

export const polarClient = new PolarH10BleClient();
