import React from 'react';

interface HrZoneBarProps {
  currentHr: number;
  maxHr: number;
  zoneSeconds: {
    z1: number;
    z2: number;
    z3: number;
    z4: number;
    z5: number;
  };
}

export const HrZoneBar: React.FC<HrZoneBarProps> = ({ currentHr, maxHr, zoneSeconds }) => {
  // Determine current active zone
  const hrPct = maxHr > 0 ? (currentHr / maxHr) * 100 : 0;
  let activeZone = 1;
  if (hrPct >= 90) activeZone = 5;
  else if (hrPct >= 80) activeZone = 4;
  else if (hrPct >= 70) activeZone = 3;
  else if (hrPct >= 60) activeZone = 2;
  else activeZone = 1;

  const totalSecs =
    zoneSeconds.z1 + zoneSeconds.z2 + zoneSeconds.z3 + zoneSeconds.z4 + zoneSeconds.z5;

  const formatSecs = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const zones = [
    {
      num: 1,
      name: 'Recovery',
      range: `<${Math.round(maxHr * 0.6)}`,
      color: 'bg-sky-500',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-500/40',
      secs: zoneSeconds.z1,
    },
    {
      num: 2,
      name: 'Aerobic Base',
      range: `${Math.round(maxHr * 0.6)}–${Math.round(maxHr * 0.7)}`,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      secs: zoneSeconds.z2,
    },
    {
      num: 3,
      name: 'Tempo',
      range: `${Math.round(maxHr * 0.7)}–${Math.round(maxHr * 0.8)}`,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-400',
      borderColor: 'border-yellow-500/40',
      secs: zoneSeconds.z3,
    },
    {
      num: 4,
      name: 'Threshold',
      range: `${Math.round(maxHr * 0.8)}–${Math.round(maxHr * 0.9)}`,
      color: 'bg-orange-500',
      textColor: 'text-orange-400',
      borderColor: 'border-orange-500/40',
      secs: zoneSeconds.z4,
    },
    {
      num: 5,
      name: 'VO2 Max',
      range: `>${Math.round(maxHr * 0.9)}`,
      color: 'bg-rose-500',
      textColor: 'text-rose-400',
      borderColor: 'border-rose-500/40',
      secs: zoneSeconds.z5,
    },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-display">
            Polar H10 Heart Rate Zones
          </span>
          <span className="text-xs text-slate-500 font-mono">Max {maxHr} BPM</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">Current:</span>
          <span
            className={`font-bold px-2 py-0.5 rounded text-xs ${
              activeZone === 5
                ? 'bg-rose-950 text-rose-300 border border-rose-800'
                : activeZone === 4
                ? 'bg-orange-950 text-orange-300 border border-orange-800'
                : activeZone === 3
                ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                : activeZone === 2
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : 'bg-sky-950 text-sky-300 border border-sky-800'
            }`}
          >
            Zone {activeZone} · {Math.round(hrPct)}%
          </span>
        </div>
      </div>

      {/* Zone Distribution Bar */}
      <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex p-0.5 border border-slate-800 gap-0.5 mb-3">
        {zones.map((z) => {
          const widthPct = totalSecs > 0 ? (z.secs / totalSecs) * 100 : 20;
          return (
            <div
              key={z.num}
              style={{ width: `${Math.max(2, widthPct)}%` }}
              className={`h-full rounded-sm transition-all duration-300 ${z.color} ${
                activeZone === z.num ? 'opacity-100 ring-1 ring-white/60' : 'opacity-75'
              }`}
            />
          );
        })}
      </div>

      {/* Zone breakdown metrics */}
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {zones.map((z) => {
          const isCurrent = activeZone === z.num;
          return (
            <div
              key={z.num}
              className={`p-1.5 rounded-lg border transition-all ${
                isCurrent
                  ? `bg-slate-800/90 ${z.borderColor} shadow-sm shadow-slate-900`
                  : 'bg-slate-950/40 border-slate-800/50'
              }`}
            >
              <div className="flex items-center justify-center gap-1">
                <span className={`text-[10px] font-bold uppercase ${z.textColor}`}>
                  Z{z.num}
                </span>
                <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                  {z.name}
                </span>
              </div>
              <div className="text-xs sm:text-sm font-mono font-semibold text-slate-200 mt-0.5">
                {formatSecs(z.secs)}
              </div>
              <div className="text-[10px] font-mono text-slate-500">{z.range}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
