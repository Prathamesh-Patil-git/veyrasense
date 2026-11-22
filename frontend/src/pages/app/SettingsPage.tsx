import React from 'react';
import { Settings, Server, ShieldAlert } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Settings className="w-4 h-4 text-[#FFD21C]" />
              <span>Edge Gateway Configuration</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Raspberry Pi 5 System & Gateway Settings
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            TARGET ARCHITECTURE • UI PROTOTYPE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Hardware deployment parameters for the autonomous edge host. (Status: The gateway parameters and security policies below specify the Target Raspberry Pi 5 Architecture; UI operates in prototype demonstration mode).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="clay-surface p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-[#172238]" />
            <h3 className="text-base font-bold text-[#172238]">
              Production Deployment Target
            </h3>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">Hardware Host:</span>
              <span className="font-bold text-[#172238]">Raspberry Pi 5 Model B</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">CPU Architecture:</span>
              <span className="font-mono text-[#172238]">Broadcom BCM2712 Quad-Core ARM Cortex-A76 @ 2.4GHz</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">System RAM:</span>
              <span className="font-bold text-[#172238]">4 GB LPDDR4X</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">Storage Medium:</span>
              <span className="font-bold text-[#172238]">64 GB High-Endurance NVMe / MicroSD</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">Database Engine:</span>
              <span className="font-mono text-[#0C5A37] font-bold">Local SQLite Timeseries (WAL Mode)</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl clay-recessed">
              <span className="text-[#718096]">MQTT Broker:</span>
              <span className="font-mono text-[#134685] font-bold">Eclipse Mosquitto (Port 1883)</span>
            </div>
          </div>
        </div>

        <div className="clay-surface p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#EF6461]" />
            <h3 className="text-base font-bold text-[#172238]">
              Physical Security & Fallback Policies
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 clay-recessed space-y-1">
              <div className="font-bold text-[#172238]">Autonomous Edge Operation</div>
              <p className="text-[11px] text-[#5A687C] leading-relaxed">
                Gateway operates fully offline during external network interruption. Anomaly detection, challenge actuation, and surrogate imputation continue locally without cloud roundtrips.
              </p>
            </div>

            <div className="p-4 clay-recessed space-y-1">
              <div className="font-bold text-[#172238]">SQLite Ringbuffer Auto-Pruning</div>
              <p className="text-[11px] text-[#5A687C] leading-relaxed">
                Raw high-frequency telemetry is automatically aggregated into 5-minute statistical summaries after 7 days to preserve edge flash storage integrity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
