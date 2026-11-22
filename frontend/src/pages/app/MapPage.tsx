import React, { useState } from 'react';
import { Network, Radio, ShieldCheck, Cpu } from 'lucide-react';
import { NetworkTopology3D } from '../../components/3d/NetworkTopology3D';
import { MOCK_SENSOR_NODES, type SensorTelemetryItem } from '../../mock/dashboardData';
import { useDepartment } from '../../context/DepartmentContext';

export const MapPage: React.FC = () => {
  const { selectedDepartmentId, activeDepartment } = useDepartment();
  const [selectedNode, setSelectedNode] = useState<SensorTelemetryItem | null>(null);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Page Title & Status Header */}
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Network className="w-4 h-4 text-[#5BA4F5]" />
              <span>Interactive Spatial Topology</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              3D Sensor Network Mesh & Gateway Topology
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            WebGL 3D Engine Active • Simulated Topology
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Real-time three-dimensional spatial visualization of industrial edge sensor nodes, signal communication links, and central Raspberry Pi 5 Gateway coordinator. Orbit, rotate, and zoom to inspect field transducer nodes.
        </p>
      </div>

      {/* Main 3D Topology Visualization Scene */}
      <NetworkTopology3D
        nodes={MOCK_SENSOR_NODES}
        selectedDepartmentId={selectedDepartmentId}
        onSelectNode={(node) => setSelectedNode(node)}
      />

      {/* Selected Node Details Bar */}
      {selectedNode && (
        <div className="clay-surface p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[#172238]">
          <span className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#5BA4F5]" />
            Inspecting Node: <span className="font-mono font-bold text-[#134685]">{selectedNode.id}</span> ({selectedNode.sensorType})
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#EBF4FE] text-[#134685]">
              Measurement: {selectedNode.latestMeasurement} {selectedNode.unit}
            </span>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-[#E8FAF1] text-[#0C5A37]">
              {selectedNode.healthStatus}
            </span>
          </div>
        </div>
      )}

      {/* Topology Metrics & Physical Gateway Status Wells */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="clay-surface p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#718096] uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-[#FFD21C]" />
            <span>Gateway Host Coordinator</span>
          </div>
          <div className="text-xl font-black text-[#172238]">Raspberry Pi 5 (4GB / 64GB)</div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Local edge broker hosting Mosquitto MQTT & embedded SQLite with Write-Ahead Logging.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono font-bold text-[#0C5A37]">
            <span>Coordinator State: Optimal</span>
            <span className="bg-[#E8FAF1] px-2 py-0.5 rounded-full">0.42ms RTT</span>
          </div>
        </div>

        <div className="clay-surface p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#718096] uppercase tracking-wider">
            <Radio className="w-4 h-4 text-[#5BA4F5]" />
            <span>Communication Link Mesh</span>
          </div>
          <div className="text-xl font-black text-[#172238]">16 Nodes Synchronized</div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Dual-band LoRa / MQTT local wireless link with automatic packet deduplication.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono font-bold text-[#134685]">
            <span>Packet Integrity: 100%</span>
            <span className="bg-[#EBF4FE] px-2 py-0.5 rounded-full">-68 dBm Avg</span>
          </div>
        </div>

        <div className="clay-surface p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#718096] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#78E9AD]" />
            <span>Spatial Anomaly Verification</span>
          </div>
          <div className="text-xl font-black text-[#172238]">Neighbour Correlation Active</div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Multi-transducer spatial cross-checking detects localized physical vs sensor drift.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono font-bold text-[#875B00]">
            <span>Active Department: {activeDepartment.name}</span>
            <span className="bg-[#FFF9DE] px-2 py-0.5 rounded-full">Simulated</span>
          </div>
        </div>
      </div>
    </div>
  );
};
