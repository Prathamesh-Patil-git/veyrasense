import React, { useState } from 'react';
import { Database, Filter, Download } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { MOCK_SENSOR_NODES } from '../../mock/dashboardData';

export const DataExplorerPage: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState(MOCK_SENSOR_NODES[0].id);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Database className="w-4 h-4 text-[#5BA4F5]" />
              <span>Timeseries Analytics</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Historical Telemetry & Residual Data Explorer
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            SIMULATED • UI PROTOTYPE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Query high-resolution raw sensor data, statistical moving averages, and residual deviations. (Status: Local SQLite timeseries storage and CSV export below are Planned backend integrations; timeseries stream shown is Simulated for this UI prototype).
        </p>
      </div>

      {/* Query Bar */}
      <div className="p-4 sm:p-6 clay-surface flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="font-bold text-[#172238]">Target Node:</label>
          <select
            value={selectedNode}
            onChange={(e) => setSelectedNode(e.target.value)}
            className="px-3 py-1.5 rounded-xl clay-recessed font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFD21C]"
          >
            {MOCK_SENSOR_NODES.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id} — {n.sensorType}
              </option>
            ))}
          </select>

          <span className="text-[#718096]">Window: Last 24 Hours</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
            Export CSV (Demo)
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Filter className="w-3.5 h-3.5" />}>
            Execute Query
          </Button>
        </div>
      </div>

      {/* Simulated Time Series Chart Card */}
      <div className="clay-surface p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-[#172238] text-base">
            Telemetry Residual Drift Signal — Node: {selectedNode}
          </h3>
          <span className="text-[10px] text-[#718096] font-mono">Sampling: 100Hz Local Ringbuffer</span>
        </div>

        <div className="h-64 w-full clay-recessed p-4 flex items-center justify-center">
          <svg viewBox="0 0 800 200" className="w-full h-full overflow-visible">
            {/* Grid Lines */}
            <line x1="0" y1="50" x2="800" y2="50" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth="0.8" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="#94A3B8" strokeWidth="1" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth="0.8" />

            {/* Confidence Band */}
            <path
              d="M0,80 Q200,60 400,90 T800,75 L800,125 Q600,140 400,110 T0,120 Z"
              fill="#FFD21C"
              fillOpacity="0.15"
            />

            {/* Primary Signal Trace */}
            <path
              d="M0,100 Q100,70 200,110 T400,85 T600,120 T800,95"
              fill="none"
              stroke="#172238"
              strokeWidth="2.5"
            />

            {/* Residual Alarm Trigger */}
            <circle cx="560" cy="116" r="5" fill="#EF6461" />
            <text x="570" y="112" fill="#EF6461" fontSize="10" fontFamily="monospace" fontWeight="bold">
              3.88σ Residual Deviation
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};
