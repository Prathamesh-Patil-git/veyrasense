import React from 'react';
import { Radio } from 'lucide-react';
import { useDepartment } from '../../context/DepartmentContext';
import { MOCK_SENSOR_NODES } from '../../mock/dashboardData';
import { SensorTelemetryTable } from '../../components/dashboard-kit/SensorTelemetryTable';
import { MetricCard } from '../../components/dashboard-kit/MetricCard';

export const MonitoringPage: React.FC = () => {
  const { selectedDepartmentId, activeDepartment } = useDepartment();

  const displayedNodes =
    selectedDepartmentId === 'all'
      ? MOCK_SENSOR_NODES
      : MOCK_SENSOR_NODES.filter((n) => n.departmentId === selectedDepartmentId);

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
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            SIMULATED • UI PROTOTYPE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Telemetry surveillance stream interface. (Status: Streaming telemetry, packet throughput metrics, and ringbuffer stats below are Simulated for this UI prototype; Mosquitto MQTT ingestion pipeline is a Planned backend capability).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <MetricCard
          label="Total Stream Rate"
          value="48.2"
          unit="pkts/sec"
          change="Sub-50ms Latency"
          changeType="positive"
          timeframe="local loop"
          accent="mint"
          isDemo
        />
        <MetricCard
          label="Buffer Utilization"
          value="1.8"
          unit="MB / 64MB"
          change="Clean Ringbuffer"
          changeType="positive"
          timeframe="RAM footprint"
          accent="blue"
          isDemo
        />
        <MetricCard
          label="Deduplicated Frames"
          value="1,492"
          unit="frames"
          change="0 corrupted"
          changeType="positive"
          timeframe="since edge boot"
          accent="yellow"
          isDemo
        />
      </div>

      <SensorTelemetryTable
        nodes={displayedNodes}
        departmentName={activeDepartment.name}
      />
    </div>
  );
};
