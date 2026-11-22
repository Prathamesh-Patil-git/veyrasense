import React from 'react';
import { FileText, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const AuditPage: React.FC = () => {
  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <FileText className="w-4 h-4 text-[#FFD21C]" />
              <span>Immutable Traceability</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Deterministic Decision Audit Logs
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            SIMULATED • UI PROTOTYPE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          In the target architecture, every hypothesis investigation, challenge dispatch pulse, and data recovery synthesis writes an audit record on the local gateway storage. (Status: Immutable SQLite audit persistence is a Planned backend capability; sample entries below are Simulated for this UI prototype).
        </p>
      </div>

      <div className="clay-surface p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2F3EE]">
          <h3 className="text-base font-bold text-[#172238]">
            Chronological Decision Ledger (Simulated Sample Entries)
          </h3>
          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
            Export Audit Bundle (Simulated)
          </Button>
        </div>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-4 rounded-2xl clay-recessed space-y-1">
            <div className="flex justify-between text-[#172238] font-bold">
              <span>[2026-11-22T14:32:01.884Z] CHALLENGE_DISPATCH_SUCCESS</span>
              <span className="text-[#0C5A37]">CODE: 0x00</span>
            </div>
            <div className="text-[#5A687C] font-sans text-[11px]">
              Target: NODE-UTL-01 • Routine: PZT_ACOUSTIC_PULSE • Damping: 0.14ms • Verdict: TRANSDUCER_HEALTHY
            </div>
          </div>

          <div className="p-4 rounded-2xl clay-recessed space-y-1">
            <div className="flex justify-between text-[#172238] font-bold">
              <span>[2026-11-22T14:30:14.212Z] RECOVERY_SYNTHESIS_COMMITTED</span>
              <span className="text-[#0C5A37]">CONFIDENCE: 99.4%</span>
            </div>
            <div className="text-[#5A687C] font-sans text-[11px]">
              Engine: DUAL_KALMAN_SPATIAL • Surrogates: 18.2 cm • Model: ARIMA_P1_D0 • Neighbors: [NODE-UTL-03]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
