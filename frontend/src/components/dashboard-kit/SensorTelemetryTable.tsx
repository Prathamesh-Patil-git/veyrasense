import React, { useState } from 'react';
import { Search, Zap, X, Radio } from 'lucide-react';
import type { SensorTelemetryItem } from '../../mock/dashboardData';
import { StatusBadge } from './StatusBadge';
import { Button } from '../ui/Button';

interface SensorTelemetryTableProps {
  nodes: SensorTelemetryItem[];
  departmentName: string;
}

export const SensorTelemetryTable: React.FC<SensorTelemetryTableProps> = ({
  nodes,
  departmentName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'healthy' | 'warning' | 'alert' | 'calibrating'>('all');
  const [selectedNodeForChallenge, setSelectedNodeForChallenge] = useState<SensorTelemetryItem | null>(null);
  const [challengeTriggered, setChallengeTriggered] = useState(false);

  const filteredNodes = nodes.filter((node) => {
    const matchesSearch =
      node.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.sensorType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      node.departmentName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || node.healthStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleExecuteChallenge = (node: SensorTelemetryItem) => {
    setSelectedNodeForChallenge(node);
    setChallengeTriggered(false);
  };

  const confirmChallengeDispatch = () => {
    setChallengeTriggered(true);
    setTimeout(() => {
      setSelectedNodeForChallenge(null);
      setChallengeTriggered(false);
    }, 1400);
  };

  return (
    <div className="clay-surface p-6 sm:p-8 space-y-6">
      {/* Table Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-black text-[#172238] tracking-tight">
              Live Sensor Telemetry Surveillance
            </h3>
          </div>
          <p className="text-xs text-[#718096] mt-0.5">
            Streaming readings across {departmentName} edge transducers with active anomaly verification.
          </p>
        </div>

        {/* Filter controls with recessed tactile well */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-[#718096] absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by node or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="clay-recessed text-xs text-[#172238] placeholder-[#718096]/70 pl-9 pr-4 py-2 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FFD21C] focus:bg-white w-48 sm:w-60 transition-all"
            />
          </div>

          <div className="flex items-center gap-1 clay-recessed p-1 rounded-full">
            {(['all', 'healthy', 'warning', 'alert'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold capitalize transition-all ${
                  statusFilter === filter
                    ? 'clay-btn-primary shadow-xs'
                    : 'text-[#718096] hover:text-[#172238]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Borderless Tactile Telemetry Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#F2F3EE] text-[11px] font-bold uppercase tracking-wider text-[#718096]">
              <th className="pb-3 px-3">Node ID</th>
              <th className="pb-3 px-3">Transducer Profile</th>
              <th className="pb-3 px-3">Department</th>
              <th className="pb-3 px-3">Telemetry</th>
              <th className="pb-3 px-3">Status</th>
              <th className="pb-3 px-3">Variance</th>
              <th className="pb-3 px-3">Last Seen</th>
              <th className="pb-3 px-3 text-right">Physical Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F7F7F0] text-xs">
            {filteredNodes.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-xs text-[#718096]">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Radio className="w-6 h-6 text-[#A0AEC0] opacity-60" />
                    <p className="font-bold text-[#172238]">No Telemetry Received Yet</p>
                    <p className="text-[11px] max-w-sm text-[#718096]">
                      {searchTerm
                        ? `No sensor nodes match the filter "${searchTerm}".`
                        : `No active sensor nodes are currently transmitting in ${departmentName}. Provision a new ESP32 node to initiate telemetry streaming.`}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredNodes.map((node) => (
                <tr
                  key={node.id}
                  className="hover:bg-[#F7F7F0] transition-colors rounded-xl group"
                >
                  <td className="py-3.5 px-3 font-mono font-bold text-[#172238]">
                    {node.id}
                  </td>
                  <td className="py-3.5 px-3 font-medium text-[#172238]">
                    {node.sensorType}
                  </td>
                  <td className="py-3.5 px-3 text-[#5A687C]">
                    {node.departmentName}
                  </td>
                  <td className="py-3.5 px-3 font-mono font-black text-[#172238] text-sm">
                    {node.latestMeasurement}{' '}
                    <span className="text-[11px] font-normal text-[#718096]">{node.unit}</span>
                  </td>
                  <td className="py-3.5 px-3">
                    <StatusBadge status={node.healthStatus} size="sm" />
                  </td>
                  <td className="py-3.5 px-3 font-mono text-[11px] text-[#5A687C]">
                    σ: {node.varianceScore}
                  </td>
                  <td className="py-3.5 px-3 text-[11px] text-[#718096]">
                    {node.lastReceived}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <Button
                      variant={node.healthStatus === 'alert' ? 'primary' : 'outline'}
                      size="sm"
                      leftIcon={<Zap className="w-3 h-3 text-[#172238]" />}
                      onClick={() => handleExecuteChallenge(node)}
                    >
                      Challenge
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Challenge Modal Trigger */}
      {selectedNodeForChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="clay-surface max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F3EE]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#FFF6C9] flex items-center justify-center text-[#172238]">
                  <Zap className="w-4 h-4 text-[#875B00]" />
                </div>
                <h4 className="text-base font-bold text-[#172238]">
                  Dispatch Physical Challenge
                </h4>
              </div>
              <button
                onClick={() => setSelectedNodeForChallenge(null)}
                className="text-[#718096] hover:text-[#172238] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5A687C] leading-relaxed">
              Inject a physical stimulus pulse (ultrasonic ring or thermal transient) to verify node <strong>{selectedNodeForChallenge.id}</strong> ({selectedNodeForChallenge.sensorType}).
            </p>

            <div className="clay-recessed p-3.5 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#718096]">Target Node:</span>
                <span className="font-mono font-bold text-[#172238]">{selectedNodeForChallenge.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">Current Telemetry:</span>
                <span className="font-mono font-bold text-[#172238]">{selectedNodeForChallenge.latestMeasurement} {selectedNodeForChallenge.unit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#718096]">Active Protocol:</span>
                <span className="font-semibold text-[#172238]">Calibrated Step Response</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedNodeForChallenge(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={challengeTriggered}
                onClick={confirmChallengeDispatch}
              >
                {challengeTriggered ? 'Pulse Executing...' : 'Execute Challenge Pulse'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
