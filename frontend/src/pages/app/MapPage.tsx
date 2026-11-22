import React, { useEffect, useState } from 'react';
import { Network, Radio, ShieldCheck, Cpu } from 'lucide-react';
import { NetworkTopology3D } from '../../components/3d/NetworkTopology3D';
import { type SensorTelemetryItem } from '../../mock/dashboardData';
import { useDepartment } from '../../context/DepartmentContext';
import { api } from '../../services/api';
import { useEnvironment } from '../../context/EnvironmentContext';

export const MapPage: React.FC = () => {
  const { selectedDepartmentId, activeDepartment } = useDepartment();
  const { environment } = useEnvironment();
  const [nodes, setNodes] = useState<SensorTelemetryItem[]>([]);
  const [selectedNode, setSelectedNode] = useState<SensorTelemetryItem | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = () => Promise.all([api.getNodes(undefined, environment), api.getMeasurements(environment)])
      .then(([apiNodes, measurements]) => {
        if (!active) return;
        const mapped: SensorTelemetryItem[] = apiNodes.map((n) => ({
          id: n.node_id,
          name: n.name,
          departmentId: `dept-${n.department_id}`,
          departmentName: n.department_name || 'Plant Fleet',
          hardwareModel: n.hardware_type,
          sensorChannels: n.sensor_types || [],
          sensorType: `${n.hardware_type}${n.sensor_types?.length ? ` · ${n.sensor_types.join(', ')}` : ''}`,
          healthStatus: (['online', 'healthy', 'connected'].includes(n.status) ? 'healthy' : ['warning', 'calibrating'].includes(n.status) ? n.status : n.status === 'alert' ? 'alert' : 'offline') as any,
          latestMeasurement: measurements.items.find((m) => m.node_id === n.id)?.value ?? '—',
          unit: measurements.items.find((m) => m.node_id === n.id)?.unit ?? '',
          varianceScore: '',
          lastReceived: n.last_seen_at || 'Never seen',
          protocol: 'MQTT',
          firmware: n.firmware_version,
          sparkline: [],
        }));
        setNodes(mapped);
        setSelectedNode((current) => current ? mapped.find((node) => node.id === current.id) || null : null);
      })
      .catch(() => { if (active) setNodes([]); });
    void refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(interval); };
  }, [environment]);

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
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            WebGL 3D Engine Active
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Real-time three-dimensional spatial visualization of industrial edge sensor nodes, signal communication links, and central Raspberry Pi 5 Gateway coordinator. Orbit, rotate, and zoom to inspect field transducer nodes.
        </p>
      </div>

      {/* Main 3D Topology Visualization Scene */}
      <NetworkTopology3D
        nodes={nodes}
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

      {/* Topology metrics derived from the selected environment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="clay-surface p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#718096] uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-[#FFD21C]" />
            <span>Gateway Host</span>
          </div>
          <div className="text-xl font-black text-[#172238]">Raspberry Pi 5</div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Local edge broker hosting Mosquitto MQTT & embedded SQLite with Write-Ahead Logging.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono font-bold text-[#134685]">
            <span>Broker/store health is not queried here</span>
            <span className="bg-[#EBF4FE] px-2 py-0.5 rounded-full">Configured</span>
          </div>
        </div>

        <div className="clay-surface p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#718096] uppercase tracking-wider">
            <Radio className="w-4 h-4 text-[#5BA4F5]" />
            <span>Communication Link Mesh</span>
          </div>
          <div className="text-xl font-black text-[#172238]">{nodes.length} Registered Nodes</div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Node status is read from the selected environment. Offline nodes have no active broker link.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono font-bold text-[#134685]">
            <span>Online: {nodes.filter((node) => node.healthStatus === 'healthy').length}</span>
            <span className="bg-[#EBF4FE] px-2 py-0.5 rounded-full">{nodes.length} nodes total</span>
          </div>
        </div>

        <div className="clay-surface p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#718096] uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#78E9AD]" />
            <span>Spatial Anomaly Verification</span>
          </div>
          <div className="text-xl font-black text-[#172238]">Channel evidence pipeline</div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Analysis compares same-node temperature, humidity, and gas channels. Cross-node recovery requires matching configured sensor location, type, and unit.
          </p>
          <div className="pt-2 flex items-center justify-between text-xs font-mono font-bold text-[#0C5A37]">
            <span>Active Department: {activeDepartment.name}</span>
            <span className="bg-[#E8FAF1] px-2 py-0.5 rounded-full">{environment === 'demo' ? 'Simulated' : 'Stored data'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
