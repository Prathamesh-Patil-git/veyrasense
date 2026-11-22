import React from 'react';
import { ShieldCheck, FileCheck } from 'lucide-react';

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
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            Ledger Active
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Recovered and raw sensor telemetry are mathematically tagged with HMAC-SHA256 provenance certificates to guarantee immutability before dispatching to downstream SCADA and historians.
        </p>
      </div>

      <div className="clay-surface p-6 sm:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2F3EE]">
          <h3 className="text-base font-bold text-[#172238]">
            Certified Telemetry Records
          </h3>
        </div>

        <div className="p-10 rounded-2xl clay-recessed text-center space-y-3">
          <FileCheck className="w-10 h-10 text-[#718096] mx-auto" />
          <h4 className="font-bold text-sm text-[#172238]">No Certified Records Yet</h4>
          <p className="text-xs text-[#718096] max-w-md mx-auto leading-relaxed">
            Verified telemetry records with cryptographic HMAC signatures will appear here once registered sensor nodes begin streaming data.
          </p>
        </div>
      </div>
    </div>
  );
};
