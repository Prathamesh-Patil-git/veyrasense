import React from 'react';
import { GitCompare } from 'lucide-react';

export const RecoveryPage: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <GitCompare className="w-4 h-4 text-[#5BA4F5]" />
              <span>Dual-Engine Reconstruction</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Temporal & Neighbour-Based Sensor Recovery
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            SIMULATED • UI PROTOTYPE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          When physical challenges confirm an anomalous sensor reading cannot be trusted, VeyraSense's planned dual recovery architecture synthesizes surrogate values using temporal autoregression and spatial neighbour correlation. (Status: Dual-engine algorithms and performance envelopes below are Simulated Specifications for this UI prototype).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="clay-surface p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FFD21C]" />
              <h3 className="text-base font-black text-[#172238]">
                Engine 1: Temporal Prediction (ARIMA / Kalman)
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase text-[#875B00] bg-[#FFF9DE] px-2.5 py-0.5 rounded-full shadow-2xs">
              Status: Planned
            </span>
          </div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Tracks historical periodicity, rate-of-change dynamics, and diurnal baselines to project the sensor's probable trajectory with explicit variance envelopes.
          </p>
          <div className="p-4 clay-recessed text-xs space-y-1 font-mono">
            <div><strong>Algorithm:</strong> Autoregressive Kalman Filter [Planned Spec]</div>
            <div><strong>Target Latency:</strong> &lt; 14ms (ARM Cortex-A76) [Simulated Target]</div>
            <div><strong>Target Confidence:</strong> 99.1% [Simulated Benchmark]</div>
          </div>
        </div>

        <div className="clay-surface p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#78E9AD]" />
              <h3 className="text-base font-black text-[#172238]">
                Engine 2: Spatial Neighbour Correlation
              </h3>
            </div>
            <span className="text-[10px] font-bold uppercase text-[#875B00] bg-[#FFF9DE] px-2.5 py-0.5 rounded-full shadow-2xs">
              Status: Planned
            </span>
          </div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Multi-hop collaborative recovery correlating adjacent sensors in the same physical plant department to synthesize cross-verified surrogate readings.
          </p>
          <div className="p-4 clay-recessed text-xs space-y-1 font-mono">
            <div><strong>Algorithm:</strong> Graph Spatial Imputer [Planned Spec]</div>
            <div><strong>Target Latency:</strong> &lt; 28ms (ARM Cortex-A76) [Simulated Target]</div>
            <div><strong>Target Confidence:</strong> 98.4% [Simulated Benchmark]</div>
          </div>
        </div>
      </div>
    </div>
  );
};
