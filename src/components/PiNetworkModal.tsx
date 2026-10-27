import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Cpu,
  Smartphone,
  Copy,
  Check,
  Terminal,
  Activity,
  Server,
  Thermometer,
  Wifi,
  ExternalLink,
  Edit2,
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
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [isCustomEditing, setIsCustomEditing] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'connect' | 'kiosk' | 'bluetooth'>('connect');

  // Generate QR code for any given target URL
  const generateQr = async (url: string) => {
    if (!url) return;
    try {
      const qr = await QRCode.toDataURL(url, {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#ffffff',
          light: '#070b14',
        },
      });
      setQrCodeDataUrl(qr);
    } catch {
      // Ignore
    }
  };

  const fetchPiInfo = async () => {
    try {
      const res = await fetch('/api/pi/info');
      if (res.ok) {
        const data: PiInfo = await res.json();
        setPiInfo(data);

        // Determine best IP address for phone connection
        let bestUrl = '';

        // 1. If physical LAN IP exists, prefer it over localhost
        if (data.ipAddresses && data.ipAddresses.length > 0) {
          const lanIp = data.ipAddresses[0].address;
          bestUrl = `http://${lanIp}:${data.serverPort || 3000}`;
        } else if (
          typeof window !== 'undefined' &&
          window.location.hostname !== 'localhost' &&
          window.location.hostname !== '127.0.0.1'
        ) {
          // If on a public URL (e.g. cloud or tunnel)
          bestUrl = window.location.origin;
        } else {
          bestUrl = data.appUrl || 'http://192.168.1.100:3000';
        }

        // Only set default if user hasn't typed a custom URL
        if (!selectedUrl || !isCustomEditing) {
          setSelectedUrl(bestUrl);
          generateQr(bestUrl);
        }
      }
    } catch {
      // Fallback
      if (!selectedUrl && typeof window !== 'undefined') {
        const fallback =
          window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
            ? window.location.origin
            : 'http://192.168.1.100:3000';
        setSelectedUrl(fallback);
        generateQr(fallback);
      }
    }
  };

  useEffect(() => {
    fetchPiInfo();
    const interval = setInterval(fetchPiInfo, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectIp = (ipAddress: string, port: number) => {
    const url = `http://${ipAddress}:${port}`;
    setSelectedUrl(url);
    setIsCustomEditing(false);
    generateQr(url);
  };

  const handleCustomUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSelectedUrl(val);
    setIsCustomEditing(true);
    generateQr(val);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold font-display uppercase tracking-wide text-white">
            Raspberry Pi 4 Hub & Phone QR Sync
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Connect your phone to view the dashboard live on your handlebars
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'connect'
                ? 'bg-orange-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Mobile Connect & QR
          </button>
          <button
            onClick={() => setActiveTab('kiosk')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'kiosk'
                ? 'bg-orange-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            RPi Kiosk Setup
          </button>
          <button
            onClick={() => setActiveTab('bluetooth')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              activeTab === 'bluetooth'
                ? 'bg-orange-600 text-white font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pi BLE Gateway
          </button>
        </div>
      </div>

      {activeTab === 'connect' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* QR Code Container */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 text-xs font-mono uppercase text-orange-400 font-bold mb-3">
              <Smartphone className="w-4 h-4" />
              <span>Scan from Phone Camera</span>
            </div>

            {qrCodeDataUrl ? (
              <div className="p-3.5 bg-[#070b14] rounded-2xl border border-slate-800 shadow-2xl shadow-black/80">
                <img
                  src={qrCodeDataUrl}
                  alt="QR Code for mobile connection"
                  className="w-52 h-52 sm:w-60 sm:h-60 rounded-lg select-none"
                />
              </div>
            ) : (
              <div className="w-52 h-52 bg-[#070b14] rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 font-mono text-xs">
                Generating QR code...
              </div>
            )}

            {/* Prominently show what URL the QR encodes */}
            <div className="mt-4 w-full bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
              <div className="text-left font-mono text-xs truncate">
                <div className="text-[10px] text-slate-500 uppercase">QR Code Points To:</div>
                <div className="font-bold text-orange-400 truncate">{selectedUrl}</div>
              </div>
              <button
                onClick={() => handleCopy(selectedUrl)}
                className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors shrink-0"
                title="Copy URL"
              >
                {copiedUrl === selectedUrl ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            <p className="text-xs text-slate-400 font-mono mt-3 max-w-xs leading-relaxed">
              Scan with your phone's camera to connect directly over local Wi-Fi without typing!
            </p>
          </div>

          {/* Network IP Adapters & Custom IP Configuration */}
          <div className="space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-display uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-orange-400" />
                  <span>Detected Network IP Addresses</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Click to update QR</span>
              </div>

              {/* List of detected IP addresses */}
              {piInfo && piInfo.ipAddresses.length > 0 ? (
                <div className="space-y-2">
                  {piInfo.ipAddresses.map((net) => {
                    const candidateUrl = `http://${net.address}:${piInfo.serverPort}`;
                    const isSelected = selectedUrl === candidateUrl;

                    return (
                      <div
                        key={net.address}
                        onClick={() => handleSelectIp(net.address, piInfo.serverPort)}
                        className={`p-3 rounded-lg border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-950/60 border-orange-500 ring-1 ring-orange-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-mono text-xs truncate">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-semibold">{net.name}</span>
                            {isSelected && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-500 text-slate-950 uppercase">
                                Active in QR
                              </span>
                            )}
                          </div>
                          <div
                            className={`font-semibold mt-0.5 truncate ${
                              isSelected ? 'text-orange-400' : 'text-slate-200'
                            }`}
                          >
                            {candidateUrl}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(candidateUrl);
                          }}
                          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors shrink-0"
                        >
                          {copiedUrl === candidateUrl ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs font-mono text-slate-400">
                  No secondary network adapters detected. Enter your machine's IP manually below.
                </div>
              )}

              {/* Manual IP / URL Override Input */}
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1.5">
                  <Edit2 className="w-3 h-3 text-slate-400" />
                  <span>Manual IP or Port Override:</span>
                </label>
                <input
                  type="text"
                  value={selectedUrl}
                  onChange={handleCustomUrlChange}
                  placeholder="http://192.168.1.X:3000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Hardware & System Health */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-emerald-400" /> Host Hardware Status
                </span>
                <span className="text-slate-500 font-normal">
                  {piInfo ? `${piInfo.hostname} (${piInfo.platform})` : 'Server Online'}
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
            To make your Raspberry Pi 4 automatically boot into the EchoPulse HUD in fullscreen when powered on:
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
        </div>
      )}

      {activeTab === 'bluetooth' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4 font-mono text-xs leading-relaxed text-slate-300">
          <div className="flex items-center gap-2 text-white font-bold font-display uppercase tracking-wide text-sm">
            <Server className="w-4 h-4 text-blue-400" />
            Phone Relay Bridge Architecture
          </div>
          <p className="text-slate-400">
            When you scan the QR code with your phone and pair the Polar H10 or Rogue Echo, your phone acts as the high-speed telemetry relay. It receives the short-range BLE packets right on the handlebars and forwards them instantly over Wi-Fi to this screen!
          </p>
        </div>
      )}
    </div>
  );
};
