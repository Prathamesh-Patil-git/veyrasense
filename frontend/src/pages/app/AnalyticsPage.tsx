import React from 'react';
import { BarChart3, LineChart } from 'lucide-react';

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
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            Analytics Engine Active
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Aggregated plant-wide reliability statistics, false alarm suppression ratios, and telemetry recovery accuracy metrics.
        </p>
      </div>

      <div className="clay-surface p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#EBF4FE] text-[#134685] flex items-center justify-center mx-auto shadow-2xs">
          <LineChart className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#172238]">No Historical Analytics Available Yet</h3>
        <p className="text-xs sm:text-sm text-[#718096] max-w-lg mx-auto leading-relaxed">
          Aggregated fleet reliability statistics, false alarm suppression percentages, and dual-engine reconstruction accuracy metrics will populate here as sensor nodes transmit operational telemetry.
        </p>
      </div>
    </div>
  );
};
