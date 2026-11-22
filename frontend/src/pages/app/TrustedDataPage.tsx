import React from 'react';
import { ShieldCheck, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const TrustedDataPage: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <ShieldCheck className="w-4 h-4 text-[#0C5A37]" />
              <span>Verifiable Telemetry Ledger</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Cryptographically Verified Trusted Data
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            SIMULATED • UI PROTOTYPE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Recovered and raw sensor telemetry are designed to be mathematically tagged with provenance certificates. (Status: Cryptographic signing engine is Planned; records and HMAC hashes below are Simulated for this UI prototype).
        </p>
      </div>

      <div className="clay-surface p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2F3EE]">
          <h3 className="text-base font-bold text-[#172238]">
            Certified Telemetry Records (Simulated Sample)
          </h3>
          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
            Export Provenance Ledger (Simulated)
          </Button>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-4 rounded-2xl clay-recessed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-[#172238]">REC-2026-09142</span> • Node NODE-UTL-01
              <div className="text-[11px] text-[#718096] font-sans">
                Value: 18.2 cm (Synthetic Recovery) • Confidence: 99.4%
              </div>
            </div>
            <div className="text-[10px] text-[#0C5A37] bg-[#E8FAF1] px-3 py-1 rounded-full font-bold truncate max-w-xs shadow-2xs">
              HMAC: 8f9b2c...a491
            </div>
          </div>

          <div className="p-4 rounded-2xl clay-recessed flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-bold text-[#172238]">REC-2026-09141</span> • Node NODE-PRD-01
              <div className="text-[11px] text-[#718096] font-sans">
                Value: 42.8 L/min (Raw Telemetry) • Confidence: 99.8%
              </div>
            </div>
            <div className="text-[10px] text-[#0C5A37] bg-[#E8FAF1] px-3 py-1 rounded-full font-bold truncate max-w-xs shadow-2xs">
              HMAC: 4e7d1a...f882
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
