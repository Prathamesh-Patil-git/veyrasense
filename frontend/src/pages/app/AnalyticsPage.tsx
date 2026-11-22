import React from 'react';
import { BarChart3 } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <BarChart3 className="w-4 h-4 text-[#5BA4F5]" />
              <span>Plant Telemetry Insights</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Reliability Analytics & Performance Reports
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            SIMULATED • UI PROTOTYPE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Aggregated plant-wide reliability statistics and maintenance metrics. (Status: Suppression metrics and latency targets below are Simulated Benchmarks for this UI prototype; automated report compilation is Planned).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 clay-surface-interactive space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
            Target Suppression Rate [Simulated]
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#0C5A37]">94.2%</div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Target false maintenance dispatches prevented via physical challenge verification.
          </p>
        </div>

        <div className="p-6 clay-surface-interactive space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
            Target Ingestion Latency [Simulated]
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#172238]">22.4 ms</div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Design objective for local MQTT processing on Raspberry Pi 5.
          </p>
        </div>

        <div className="p-6 clay-surface-interactive space-y-2">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
            Target Recovery Accuracy [Simulated]
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#134685]">99.4%</div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Dual-engine temporal & neighbour synthesis benchmark objective.
          </p>
        </div>
      </div>
    </div>
  );
};
