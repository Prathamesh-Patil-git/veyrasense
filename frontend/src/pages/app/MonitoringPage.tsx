import React, { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { useDepartment } from '../../context/DepartmentContext';
import { type SensorTelemetryItem } from '../../mock/dashboardData';
import { SensorTelemetryTable } from '../../components/dashboard-kit/SensorTelemetryTable';
import { MetricCard } from '../../components/dashboard-kit/MetricCard';
import { api } from '../../services/api';

export const MonitoringPage: React.FC = () => {
  const { selectedDepartmentId, activeDepartment } = useDepartment();
  const [nodes, setNodes] = useState<SensorTelemetryItem[]>([]);

  useEffect(() => {
    api.getNodes()
      .then((apiNodes) => {
        const mapped: SensorTelemetryItem[] = apiNodes.map((n) => ({
          id: n.node_id,
          name: n.name,
          departmentId: `dept-${n.department_id}`,
          departmentName: n.department_name || 'Plant Fleet',
          sensorType: n.hardware_type,
          hardwareModel: n.hardware_type,
          healthStatus: (n.status === 'connected' ? 'healthy' : n.status === 'alert' ? 'alert' : 'offline') as any,
          latestMeasurement: 0,
          unit: '',
          varianceScore: '0.00',
          lastReceived: n.last_seen_at || n.registered_at,
          protocol: 'MQTT',
          firmware: n.firmware_version,
          sparkline: [0, 0, 0, 0, 0],
        }));
        setNodes(mapped);
      })
      .catch(() => {
        setNodes([]);
      });
  }, []);

  const displayedNodes =
    selectedDepartmentId === 'all'
      ? nodes
      : nodes.filter((n) => n.departmentId === selectedDepartmentId);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Radio className="w-4 h-4 text-[#5BA4F5]" />
              <span>Telemetry Surveillance Stream</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              High-Frequency Sensor Ingestion Stream
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            MQTT Pipeline Active
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Real-time telemetry surveillance stream ingesting packets via local Mosquitto MQTT broker on the Raspberry Pi 5.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MetricCard
          label="Total Stream Rate"
          value={nodes.length > 0 ? "0.0" : "0.0"}
          unit="pkts/sec"
          change="Sub-50ms Latency"
          changeType="neutral"
          timeframe="local loop"
          accent="mint"
        />
        <MetricCard
          label="Buffer Utilization"
          value="0.0"
          unit="MB / 64MB"
          change="Clean Ringbuffer"
          changeType="positive"
          timeframe="RAM footprint"
          accent="blue"
        />
        <MetricCard
          label="Deduplicated Frames"
          value="0"
          unit="frames"
          change="0 corrupted"
          changeType="neutral"
          timeframe="since edge boot"
          accent="yellow"
        />
      </div>

      <SensorTelemetryTable
        nodes={displayedNodes}
        departmentName={activeDepartment.name}
      />
    </div>
  );
};
