import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { VeyraLogo } from '../common/VeyraLogo';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  return (
    <div className="min-h-screen bg-[#F7F7F0] flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Back to Home pill */}
      <div className="max-w-6xl mx-auto w-full mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-bold text-[#718096] hover:text-[#172238] transition-colors clay-surface-interactive px-4 py-2 rounded-full"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 clay-surface overflow-hidden shadow-2xl">
        {/* =========================================================
            BRAND / VISUAL SIDE (Warm Ivory / Pale Yellow clay treatment)
            ========================================================= */}
        <div className="lg:col-span-5 bg-[#FFF6C9] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative glow shapes */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#FFEFA8]/70 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#FFFAD9] rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            <VeyraLogo size="lg" showTagline />

            <div className="pt-6 space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/95 text-xs font-bold uppercase tracking-wider text-[#172238] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#78E9AD] animate-pulse" />
                Edge Gateway Operator
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight leading-tight">
                Trust every measurement. Understand every anomaly. Recover with evidence.
              </h2>
              <p className="text-xs sm:text-sm text-[#172238]/80 leading-relaxed font-normal">
                Deterministic sensor verification, acoustic echo challenge testing, and spatial telemetry recovery running directly on local edge hardware.
              </p>
            </div>
          </div>

          {/* Sensor Telemetry Visualization Well */}
          <div className="relative z-10 my-8 p-4 rounded-2xl bg-white/95 backdrop-blur-xs space-y-3 shadow-sm">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#718096]">
              <span className="flex items-center gap-1.5 font-bold">
                <span className="w-2 h-2 rounded-full bg-[#78E9AD]" />
                Sensor Node VS-01 Stream
              </span>
              <span className="text-[#0C5A37] font-bold">Residual: 0.02σ</span>
            </div>

            {/* SVG Waveform */}
            <div className="h-12 w-full">
              <svg viewBox="0 0 300 48" className="w-full h-full overflow-visible">
                <path
                  d="M0 24 Q 25 10, 50 24 T 100 24 T 150 14 T 200 34 T 250 24 T 300 24"
                  fill="none"
                  stroke="#172238"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <circle cx="150" cy="14" r="4" fill="#78E9AD" />
              </svg>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#718096] font-mono pt-1 border-t border-[#F2F3EE]">
              <span>RPi 5 (4GB / 64GB)</span>
              <span>FastAPI • Mosquitto</span>
            </div>
          </div>

          <div className="relative z-10 text-[11px] text-[#718096] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0C5A37]" />
            <span>Industrial Edge Reliability Architecture</span>
          </div>
        </div>

        {/* =========================================================
            FORM SIDE (White Clay Surface with Tactile Inputs)
            ========================================================= */}
        <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-[#718096] leading-relaxed">
                {subtitle}
              </p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
