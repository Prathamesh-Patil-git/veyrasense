import React from 'react';
import { FileText, ClipboardList } from 'lucide-react';

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
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            Audit Ledger Active
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Every hypothesis investigation, physical challenge dispatch pulse, and data recovery synthesis writes an immutable audit record to the local gateway storage.
        </p>
      </div>

      <div className="clay-surface p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#FFF6C9] text-[#172238] flex items-center justify-center mx-auto shadow-2xs">
          <ClipboardList className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-[#172238]">No Audit Events Recorded Yet</h3>
        <p className="text-xs sm:text-sm text-[#718096] max-w-lg mx-auto leading-relaxed">
          Deterministic decision audit logs—including anomaly evaluations, challenge dispatches, and recovery synthesis commits—will be recorded chronologically as edge operations occur.
        </p>
      </div>
    </div>
  );
};
