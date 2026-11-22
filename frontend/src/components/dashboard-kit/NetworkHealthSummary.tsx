import React from 'react';
import { Radio, Gauge, AlertTriangle, Clock, Cpu } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import type { DepartmentMetrics } from '../../mock/dashboardData';

interface NetworkHealthSummaryProps {
  metrics: DepartmentMetrics;
  departmentName: string;
}

export const NetworkHealthSummary: React.FC<NetworkHealthSummaryProps> = ({
  metrics,
  departmentName,
}) => {
  return (
    <div className="clay-surface p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
            <Radio className="w-4 h-4 text-[#5BA4F5]" />
            <span>Operational Integrity Overview</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#172238] tracking-tight mt-0.5">
            Sensor Network Health & Quality Verification
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="communicating" label="MQTT Mosquitto: Simulated" />
          <StatusBadge status="healthy" label={`${departmentName} Filtered`} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Communication Health */}
        <div className="p-4 rounded-2xl clay-recessed space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
              Communication
            </span>
            <Radio className="w-3.5 h-3.5 text-[#5BA4F5]" />
          </div>
          <div className="text-2xl font-black text-[#172238]">
            {metrics.communicationHealthPercent}%
          </div>
          <div className="text-[11px] text-[#0C5A37] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#78E9AD]" />
            <span>Zero Packet Dropping</span>
          </div>
        </div>

        {/* 2. Measurement Quality */}
        <div className="p-4 rounded-2xl clay-recessed space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
              Measurement Quality
            </span>
            <Gauge className="w-3.5 h-3.5 text-[#78E9AD]" />
          </div>
          <div className="text-2xl font-black text-[#172238]">
            {metrics.measurementQualityPercent}%
          </div>
          <div className="text-[11px] text-[#0C5A37] font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#78E9AD]" />
            <span>High Confidence Index</span>
          </div>
        </div>

        {/* 3. Sensor Fault Count */}
        <div className="p-4 rounded-2xl clay-recessed space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
              Sensor Faults
            </span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#EF6461]" />
          </div>
          <div className="text-2xl font-black text-[#172238]">
            {metrics.sensorFaultCount}
          </div>
          <div className="text-[11px] text-[#718096] font-semibold">
            {metrics.sensorFaultCount === 0 ? 'Optimal Line Integrity' : 'Requires Physical Audit'}
          </div>
        </div>

        {/* 4. Active Investigations */}
        <div className="p-4 rounded-2xl clay-recessed space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
              Investigations
            </span>
            <Clock className="w-3.5 h-3.5 text-[#FFD21C]" />
          </div>
          <div className="text-2xl font-black text-[#172238]">
            {metrics.activeInvestigations}
          </div>
          <div className="text-[11px] text-[#875B00] font-semibold">
            {metrics.activeInvestigations === 0 ? 'No Active Flags' : '2 Pending Isolation'}
          </div>
        </div>

        {/* 5. Validated Recoveries */}
        <div className="p-4 rounded-2xl clay-recessed space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#718096]">
              Recovered Readings
            </span>
            <Cpu className="w-3.5 h-3.5 text-[#78E9AD]" />
          </div>
          <div className="text-2xl font-black text-[#172238]">
            {metrics.validatedRecoveries}
          </div>
          <div className="text-[11px] text-[#0C5A37] font-semibold">
            Spatial Reconstruction Active
          </div>
        </div>
      </div>
    </div>
  );
};
