import React from 'react';
import { Sparkles } from 'lucide-react';

export const MLModelPage: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Sparkles className="w-4 h-4 text-[#FFD21C]" />
              <span>Edge AI Runtime</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Machine Learning Model Management
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            Baseline Filter Active
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Edge neural anomaly models and baseline statistical filters execute directly on the Raspberry Pi 5 without external cloud dependency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="clay-surface-interactive p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#718096]">Classifier Engine</span>
            <span className="text-xs font-bold text-[#0C5A37] bg-[#E8FAF1] px-2.5 py-0.5 rounded-full shadow-2xs">
              Configured
            </span>
          </div>
          <h3 className="font-bold text-sm text-[#172238]">
            Ultrasonic Drift & Echo Autoencoder
          </h3>
          <p className="text-xs text-[#5A687C]">
            Detects acoustic ringdown attenuation and boundary surface interference on transducer channels.
          </p>
          <div className="text-[11px] font-mono text-[#718096] clay-recessed p-2.5">
            Architecture: Int8 Quantized Autoencoder
          </div>
        </div>

        <div className="clay-surface-interactive p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#718096]">Imputer Engine</span>
            <span className="text-xs font-bold text-[#0C5A37] bg-[#E8FAF1] px-2.5 py-0.5 rounded-full shadow-2xs">
              Configured
            </span>
          </div>
          <h3 className="font-bold text-sm text-[#172238]">
            Spatial Graph Residual Solver
          </h3>
          <p className="text-xs text-[#5A687C]">
            Multi-hop collaborative recovery correlating adjacent industrial sensors within physical bounds.
          </p>
          <div className="text-[11px] font-mono text-[#718096] clay-recessed p-2.5">
            Architecture: Graph Spatial Correlation Imputer
          </div>
        </div>

        <div className="clay-surface-interactive p-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#718096]">Predictor Engine</span>
            <span className="text-xs font-bold text-[#0C5A37] bg-[#E8FAF1] px-2.5 py-0.5 rounded-full shadow-2xs">
              Configured
            </span>
          </div>
          <h3 className="font-bold text-sm text-[#172238]">
            Diurnal Baseline Forecaster
          </h3>
          <p className="text-xs text-[#5A687C]">
            Shift-pattern and diurnal drift forecasting for continuous industrial sensors.
          </p>
          <div className="text-[11px] font-mono text-[#718096] clay-recessed p-2.5">
            Architecture: Autoregressive Kalman & ARIMA
          </div>
        </div>
      </div>
    </div>
  );
};
