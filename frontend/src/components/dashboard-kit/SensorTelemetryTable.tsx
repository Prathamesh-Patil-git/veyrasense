import React, { useState } from 'react';
import { Search, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SensorTelemetryItem } from '../../mock/dashboardData';
import { StatusBadge } from './StatusBadge';

interface SensorTelemetryTableProps { nodes: SensorTelemetryItem[]; departmentName: string; }

export const SensorTelemetryTable: React.FC<SensorTelemetryTableProps> = ({ nodes, departmentName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'warning' | 'alert' | 'offline' | 'calibrating'>('all');
  const filteredNodes = nodes.filter((node) => {
    const query = searchTerm.toLowerCase();
    return (!query || node.id.toLowerCase().includes(query) || node.sensorType.toLowerCase().includes(query) || node.departmentName.toLowerCase().includes(query)) && (statusFilter === 'all' || node.healthStatus === statusFilter);
  });

  return <div className="clay-surface space-y-6 p-6 sm:p-8">
    <div className="flex flex-col justify-between gap-4 border-b border-[#F2F3EE] pb-4 sm:flex-row sm:items-center">
      <div><h3 className="text-xl font-black tracking-tight text-[#172238]">Latest sensor telemetry</h3><p className="mt-1 text-xs text-[#718096]">Most recently stored readings across {departmentName}. Analysis values appear only when available.</p></div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex items-center"><Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#718096]"/><input aria-label="Filter by node or type" placeholder="Filter nodes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="clay-recessed w-48 rounded-full py-2 pl-9 pr-4 text-xs text-[#172238] focus:outline-none focus:ring-2 focus:ring-[#FFD21C] sm:w-60"/></label>
        <select aria-label="Filter by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="clay-recessed rounded-full px-3 py-2 text-xs font-bold capitalize">{['all', 'healthy', 'warning', 'alert', 'offline', 'calibrating'].map((status) => <option key={status} value={status}>{status}</option>)}</select>
      </div>
    </div>
    <div className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs">
      <thead><tr className="border-b border-[#F2F3EE] text-[10px] font-bold uppercase tracking-wider text-[#718096]"><th className="px-3 pb-3">Node ID</th><th className="px-3 pb-3">Hardware / sensors</th><th className="px-3 pb-3">Department</th><th className="px-3 pb-3">Latest reading</th><th className="px-3 pb-3">Status</th><th className="px-3 pb-3">Analysis</th><th className="px-3 pb-3">Last seen</th><th className="px-3 pb-3 text-right">Diagnosis</th></tr></thead>
      <tbody className="divide-y divide-[#F7F7F0]">{filteredNodes.length === 0 ? <tr><td colSpan={8} className="py-12 text-center text-[#718096]"><Radio className="mx-auto mb-2 h-6 w-6 opacity-60"/><b className="block text-[#172238]">No stored readings</b><span>{searchTerm ? 'No nodes match the current filter.' : `No measurements are available in ${departmentName} for this environment.`}</span></td></tr> : filteredNodes.map((node) => <tr key={node.id} className="transition-colors hover:bg-[#F7F7F0]"><td className="px-3 py-3.5 font-mono font-bold text-[#172238]">{node.id}</td><td className="max-w-64 px-3 py-3.5 text-[#5A687C]">{node.sensorType}</td><td className="px-3 py-3.5 text-[#5A687C]">{node.departmentName}</td><td className="px-3 py-3.5 font-mono font-black text-[#172238]">{node.latestMeasurement} <span className="text-[11px] font-normal text-[#718096]">{node.unit}</span></td><td className="px-3 py-3.5"><StatusBadge status={node.healthStatus} size="sm"/></td><td className="px-3 py-3.5 font-mono text-[11px] text-[#5A687C]">{node.varianceScore ? `σ: ${node.varianceScore}` : 'Not assessed'}</td><td className="px-3 py-3.5 text-[11px] text-[#718096]">{node.lastReceived}</td><td className="px-3 py-3.5 text-right"><Link to="/app/investigations" className="rounded-xl border px-3 py-2 text-[11px] font-bold text-blue-800 hover:bg-blue-50">Review evidence</Link></td></tr>)}</tbody>
    </table></div>
  </div>;
};
