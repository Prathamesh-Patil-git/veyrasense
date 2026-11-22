import React, { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { useDepartment } from '../../context/DepartmentContext';
import { type SensorTelemetryItem } from '../../mock/dashboardData';
import { SensorTelemetryTable } from '../../components/dashboard-kit/SensorTelemetryTable';
import { MetricCard } from '../../components/dashboard-kit/MetricCard';
import { api } from '../../services/api';
import { useEnvironment } from '../../context/EnvironmentContext';

export const MonitoringPage: React.FC = () => {
  const { selectedDepartmentId, activeDepartment } = useDepartment();
  const { environment } = useEnvironment();
  const [nodes, setNodes] = useState<SensorTelemetryItem[]>([]);
  const [measurementTotal, setMeasurementTotal] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () => Promise.all([api.getNodes(undefined, environment), api.getMeasurements(environment)])
      .then(([apiNodes, measurements]) => {
        if (!active) return;
        setMeasurementTotal(measurements.total);
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
      })
      .catch(() => { if (active) setNodes([]); });
    void refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => { active = false; window.clearInterval(interval); };
  }, [environment]);

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
              Latest Stored Sensor Telemetry
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            {environment === 'real' ? 'Real MQTT ingestion' : 'Shared demo ingestion'}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Monitoring refreshes every five seconds from the environment-scoped telemetry store. Packet-rate and broker-buffer counters are not exposed by the backend.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MetricCard
          label="Stored Measurements"
          value={measurementTotal}
          unit="points"
          change={environment === 'demo' ? 'Simulated records' : 'Persisted sensor records'}
          changeType="neutral"
          timeframe="selected environment"
          sparkline={[]}
          accent="mint"
        />
        <MetricCard
          label="Registered Nodes"
          value={nodes.length}
          unit="nodes"
          change="Environment scoped"
          changeType="neutral"
          timeframe="current fleet"
          sparkline={[]}
          accent="blue"
        />
        <MetricCard
          label="Online Nodes"
          value={nodes.filter((node) => node.healthStatus === 'healthy').length}
          unit="nodes"
          change="From stored node status"
          changeType="neutral"
          timeframe="current status"
          sparkline={[]}
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
