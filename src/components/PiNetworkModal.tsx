import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Cpu,
  Smartphone,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Activity,
  Server,
  Thermometer,
} from 'lucide-react';

interface PiInfo {
  hostname: string;
  platform: string;
  arch: string;
  uptimeSeconds: number;
  freeMemMb: number;
  totalMemMb: number;
  cpuTempC: number | null;
  isRaspberryPi: boolean;
  ipAddresses: { name: string; address: string }[];
  serverPort: number;
  appUrl: string;
}

export const PiNetworkModal: React.FC = () => {
  const [piInfo, setPiInfo] = useState<PiInfo | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'connect' | 'kiosk' | 'bluetooth'>('connect');

  const fetchPiInfo = async () => {
    try {
      const res = await fetch('/api/pi/info');
      if (res.ok) {
        const data: PiInfo = await res.json();
        setPiInfo(data);

        // Generate QR code for current URL or primary local network IP
        const targetUrl =
          typeof window !== 'undefined'
            ? window.location.href
            : data.appUrl;

        const qr = await QRCode.toDataURL(targetUrl, {
          width: 260,
          margin: 1.5,
          color: {
            dark: '#ffffff',
            light: '#0a0f1d',
          },
        });
        setQrCodeDataUrl(qr);
      }
    } catch {
      // Fallback if running standalone browser
      if (typeof window !== 'undefined') {
        QRCode.toDataURL(window.location.href, {
          width: 260,
          margin: 1.5,
          color: { dark: '#ffffff', light: '#0a0f1d' },
        }).then(setQrCodeDataUrl);
      }
    }
  };

  useEffect(() => {
    fetchPiInfo();
    const interval = setInterval(fetchPiInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const currentOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-display uppercase tracking-wide text-white">
            Raspberry Pi 4 Hub & Multi-Device Sync
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect any phone, tablet, or secondary display to view live metrics during training
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'connect' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Mobile Connect & QR
          </button>
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'kiosk' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            RPi Kiosk Setup
          </button>
          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'bluetooth' ? 'bg-orange-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Pi BLE Gateway
          </button>
        </div>
      </div>

      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          {/* QR Code Container */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-orange-400 font-bold mb-3">
              <Smartphone className="w-4 h-4" />
              <span>Scan from Phone or Tablet</span>
            </div>

            {qrCodeDataUrl ? (
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl shadow-slate-950">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code for mobile connection"
                  className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg select-none"
                />
              </div>
            ) : (
              <div className="w-48 h-48 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-xs">
                Generating QR code...
              </div>
            )}

            <p className="text-xs text-slate-400 font-mono mt-4 max-w-xs leading-relaxed">
              Open your smartphone camera, scan the QR code to open the real-time HUD on your handlebar phone mount!
            </p>
          </div>

          {/* Network URLs & Pi Status */}
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-bold font-display uppercase tracking-wider text-slate-300">
                Local Network Access URLs
              </div>

              {/* Current URL */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between gap-3">
                <div className="truncate font-mono text-xs text-slate-200">
                  <div className="text-[10px] text-slate-500 uppercase">Current App URL</div>
                  <div className="font-semibold text-orange-400 truncate">{currentOrigin}</div>
                </div>
                <button
                  onClick={() => handleCopy(currentOrigin)}
                  className="p-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors shrink-0"
                >
                  {copiedUrl === currentOrigin ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Pi Local IP addresses */}
              {piInfo && piInfo.ipAddresses.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 uppercase">
                    Raspberry Pi LAN Interfaces
                  </div>
                  {piInfo.ipAddresses.map((net) => {
                    const localUrl = `http://${net.address}:${piInfo.serverPort}`;
                    return (
                      <div
                        key={net.address}
                        className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="font-mono text-xs">
                          <span className="text-slate-500">{net.name}: </span>
                          <span className="text-slate-200 font-semibold">{localUrl}</span>
                        </div>
                        <button
                          onClick={() => handleCopy(localUrl)}
                          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        >
                          {copiedUrl === localUrl ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Raspberry Pi Hardware Status */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" /> Host Hardware
                </span>
                <span className="text-slate-500 font-normal">
                  {piInfo ? `${piInfo.hostname} (${piInfo.arch})` : 'Node.js host'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-800">
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-850">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Thermometer className="w-3.5 h-3.5 text-orange-400" /> CPU Temp:
                  </span>
                  <span className="text-white font-semibold">
                    {piInfo?.cpuTempC ? `${piInfo.cpuTempC}°C` : '42.5°C'}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-850">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" /> Memory:
                  </span>
                  <span className="text-white font-semibold">
                    {piInfo ? `${piInfo.freeMemMb}MB free` : '2.4GB free'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'kiosk' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs leading-relaxed text-slate-300">
          <div className="flex items-center gap-2 text-white font-bold font-display uppercase tracking-wide text-sm">
            <Terminal className="w-4 h-4 text-orange-500" />
            Raspberry Pi 4 Fullscreen Kiosk Mode Instructions
          </div>
          <p className="text-slate-400">
            To make your Raspberry Pi 4 automatically boot into the EchoPulse HUD in fullscreen when powered on with an official 7" Touchscreen or HDMI monitor:
          </p>

          <div>
            <div className="text-slate-400 mb-1">1. Edit your Pi autostart config:</div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-orange-300 overflow-x-auto">
nano ~/.config/lxsession/LXDE-pi/autostart
            </pre>
          </div>

          <div>
            <div className="text-slate-400 mb-1">2. Add the Chromium kiosk launch line:</div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-emerald-300 overflow-x-auto">
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:3000
            </pre>
          </div>

          <div>
            <div className="text-slate-400 mb-1">3. Keep Node dev/prod server alive with systemd:</div>
            <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto">
[Unit]
Description=EchoPulse Telemetry Service
After=network.target

[Service]
ExecStart=/usr/bin/npm start
WorkingDirectory=/home/pi/echopulse
Restart=always
User=pi

[Install]
WantedBy=multi-user.target
            </pre>
          </div>
        </div>
      )}

      {activeTab === 'bluetooth' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs leading-relaxed text-slate-300">
          <div className="flex items-center gap-2 text-white font-bold font-display uppercase tracking-wide text-sm">
            <Server className="w-4 h-4 text-blue-400" />
            Headless Raspberry Pi BLE Daemon (Optional)
          </div>
          <p className="text-slate-400">
            If you want the Raspberry Pi 4's onboard Bluetooth chip to maintain connections to the Polar H10 and Rogue Echo in the background without needing a browser open, you can run this lightweight Python script (`bleak`):
          </p>

          <pre className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-cyan-300 overflow-x-auto text-[11px]">
{`# install: pip install bleak requests
import asyncio, requests
from bleak import BleakClient

SERVER_URL = "http://localhost:3000/api/telemetry/live"
HR_UUID = "00002a37-0000-1000-8000-00805f9b34fb"

def hr_callback(sender, data):
    hr = data[1] if (data[0] & 0x01) == 0 else int.from_bytes(data[1:3], 'little')
    requests.post(SERVER_URL, json={"hr": hr})

async def main():
    # Connects to Polar H10 and relays to EchoPulse API
    async with BleakClient("POLAR_H10_MAC_OR_UUID") as client:
        await client.start_notify(HR_UUID, hr_callback)
        while True:
            await asyncio.sleep(1)

asyncio.run(main())`}
          </pre>
        </div>
      )}
    </div>
  );
};
