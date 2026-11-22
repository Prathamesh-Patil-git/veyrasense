import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  Activity,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Radio,
  PlusCircle,
} from 'lucide-react';
import { useDepartment } from '../../context/DepartmentContext';
import type { SensorTelemetryItem, ActivityEvent } from '../../mock/dashboardData';
import { api } from '../../services/api';
import type { ApiDashboardOverview } from '../../services/api';
import { DashboardBanner } from '../../components/dashboard-kit/DashboardBanner';
import { MetricCard } from '../../components/dashboard-kit/MetricCard';
import { NetworkHealthSummary } from '../../components/dashboard-kit/NetworkHealthSummary';
import { SensorTelemetryTable } from '../../components/dashboard-kit/SensorTelemetryTable';
import { RecentActivityFeed } from '../../components/dashboard-kit/RecentActivityFeed';
import { GatewayHub3D } from '../../components/3d/GatewayHub3D';
import { Button } from '../../components/ui/Button';

export const OverviewPage: React.FC = () => {
  const { selectedDepartmentId, activeDepartment } = useDepartment();

  const [loading, setLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<ApiDashboardOverview | null>(null);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setBackendError(null);
    try {
      const data = await api.getDashboardOverview(
        selectedDepartmentId === 'all' ? undefined : selectedDepartmentId
      );
      setLiveData(data);
    } catch (err: any) {
      setBackendError(err.message || 'Unable to connect to FastAPI backend');
      setLiveData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedDepartmentId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 1. Backend Disconnected Error State
  if (backendError) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
        <DashboardBanner
          title="VeyraSense Operations Console"
          subtitle="Real-time monitoring and reliability dashboard."
          actionLabel="Retry Backend Connection"
          nodeCount={0}
          healthPercent={0}
          departmentName={activeDepartment.name}
          onActionClick={loadDashboardData}
        />

        <div className="clay-surface p-8 sm:p-12 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3.5 rounded-2xl bg-[#FDF0F0] text-[#B42318] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)]">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl sm:text-2xl font-black text-[#172238]">
                  Backend Gateway Offline / Disconnected
                </h2>
                <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[#FDF0F0] text-[#B42318] shadow-2xs">
                  Connection Error
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#718096] leading-relaxed max-w-2xl">
                The frontend is attempting to query the live FastAPI backend at{' '}
                <code className="px-2 py-0.5 rounded-lg bg-[#EEEFEA] font-mono text-xs text-[#172238]">
                  /api/v1/dashboard/overview
                </code>
                . Please ensure the backend service is running.
              </p>
              <div className="p-3.5 clay-recessed text-xs font-mono text-[#B42318]">
                Error: {backendError}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F2F3EE] flex flex-wrap items-center justify-between gap-4">
            <Button
              variant="primary"
              size="md"
              onClick={loadDashboardData}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              isLoading={loading}
            >
              Retry Connection
            </Button>
            <div className="text-xs text-[#718096]">
              Target: <span className="font-mono text-[#172238] font-bold">FastAPI / Uvicorn (Port 8000)</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (loading && !liveData) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
        <div className="h-44 rounded-3xl clay-yellow-banner animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 rounded-3xl clay-surface animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const registeredCount = liveData?.registered_nodes ?? 0;
  const onlineCount = liveData?.online_nodes ?? 0;
  const investigationsCount = liveData?.active_investigations ?? 0;
  const recoveriesCount = liveData?.validated_recoveries ?? 0;
  const networkHealth = liveData?.network_health_percent ?? 100;

  const telemetryRows: SensorTelemetryItem[] = (liveData?.recent_telemetry || []).map((t) => ({
    id: t.id,
    sensorType: t.sensor_type,
    departmentId: String(t.department_id),
    departmentName: t.department_name,
    latestMeasurement: t.latest_measurement,
    unit: t.unit,
    healthStatus: t.health_status,
    lastReceived: t.last_received,
    varianceScore: `${t.variance_score}σ`,
    protocol: 'Mosquitto MQTT',
    firmware: 'ESP32 Firmware',
    sparkline: [t.variance_score, t.variance_score],
    hardwareModel: t.sensor_type,
  }));

  const activityEvents: ActivityEvent[] = (liveData?.recent_activity || []).map((e) => ({
    id: e.id,
    type: (e.event_type.toLowerCase().includes('recovery')
      ? 'recovery'
      : e.event_type.toLowerCase().includes('investigation')
      ? 'investigation'
      : e.event_type.toLowerCase().includes('registration')
      ? 'registration'
      : 'telemetry') as ActivityEvent['type'],
    title: e.event_type,
    description: e.message,
    timestamp: e.timestamp,
    nodeId: e.node_id,
    departmentId: String(e.department_id),
    departmentName: activeDepartment.name,
    severity: (e.severity === 'success' || e.severity === 'info'
      ? 'healthy'
      : e.severity === 'alert'
      ? 'alert'
      : 'warning') as ActivityEvent['severity'],
  }));

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* 1. Welcome Banner + 3D Gateway Focal Point */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardBanner
            title="VeyraSense Operations Console"
            subtitle="Real-time telemetry and anomaly verification dashboard."
            actionLabel="Refresh Telemetry"
            nodeCount={registeredCount}
            healthPercent={networkHealth}
            departmentName={activeDepartment.name}
            onActionClick={loadDashboardData}
          />
        </div>

        {/* 3D Gateway Visual Hub */}
        <div className="clay-surface p-5 flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-between text-xs pb-2 border-b border-[#F2F3EE]">
            <span className="font-bold text-[#172238] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#5BA4F5]" />
              <span>Edge Gateway Hub</span>
            </span>
            <span className="text-[10px] font-mono text-[#0C5A37] bg-[#E8FAF1] px-2 py-0.5 rounded-full font-bold">
              3D View
            </span>
          </div>
          <div className="w-full flex-1 min-h-[140px] flex items-center justify-center">
            <GatewayHub3D />
          </div>
          <div className="text-[11px] text-[#718096] font-medium pt-1">
            Edge Gateway Coordinator • Telemetry Ingestion Hub
          </div>
        </div>
      </div>

      {/* Zero Nodes Guidance Callout */}
      {registeredCount === 0 && (
        <div className="clay-surface p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-l-4 border-[#FFD21C]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FFD21C]" />
              <h3 className="font-bold text-sm text-[#172238]">No Sensor Nodes Registered</h3>
            </div>
            <p className="text-xs text-[#718096] max-w-2xl leading-relaxed">
              The sensor fleet is currently empty. To start receiving telemetry, register an ESP32 hardware node under Devices and configure its credentials.
            </p>
          </div>
          <Link to="/app/devices" className="shrink-0">
            <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Register First Node
            </Button>
          </Link>
        </div>
      )}

      {/* 2. Primary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          label="Registered Sensor Nodes"
          value={registeredCount}
          unit="nodes"
          change={registeredCount > 0 ? 'Full Edge Fleet' : 'Awaiting nodes'}
          changeType="neutral"
          timeframe="locally registered"
          icon={<Cpu className="w-4 h-4 text-[#172238]" />}
          accent="slate"
          sparkline={registeredCount > 0 ? [registeredCount, registeredCount] : [0, 0]}
        />

        <MetricCard
          label="Online Nodes"
          value={onlineCount}
          unit="active"
          change={registeredCount > 0 ? `${networkHealth}% operational` : 'No active links'}
          changeType={onlineCount > 0 ? 'positive' : 'neutral'}
          timeframe="healthy heartbeat"
          icon={<Activity className="w-4 h-4 text-[#0C5A37]" />}
          accent="mint"
          sparkline={onlineCount > 0 ? [onlineCount, onlineCount] : [0, 0]}
        />

        <MetricCard
          label="Active Investigations"
          value={investigationsCount}
          unit="anomalies"
          change={investigationsCount > 0 ? 'Under Review' : 'Nominal'}
          changeType={investigationsCount > 0 ? 'negative' : 'positive'}
          timeframe="residual trip"
          icon={<AlertTriangle className="w-4 h-4 text-[#875B00]" />}
          accent="yellow"
          sparkline={investigationsCount > 0 ? [investigationsCount, investigationsCount] : [0, 0]}
        />

        <MetricCard
          label="Validated Recoveries"
          value={recoveriesCount}
          unit="data points"
          change={recoveriesCount > 0 ? 'Reconstructed' : 'None required'}
          changeType="positive"
          timeframe="provenance verified"
          icon={<ShieldCheck className="w-4 h-4 text-[#134685]" />}
          accent="blue"
          sparkline={recoveriesCount > 0 ? [recoveriesCount, recoveriesCount] : [0, 0]}
        />
      </div>

      {/* 3. Sensor Network Health & Integrity Summary */}
      <NetworkHealthSummary
        metrics={{
          registeredNodes: registeredCount,
          onlineNodes: onlineCount,
          activeInvestigations: investigationsCount,
          sensorFaultCount: liveData?.sensor_fault_count ?? 0,
          validatedRecoveries: recoveriesCount,
          networkHealthPercent: networkHealth,
          communicationHealthPercent: liveData?.communication_health_percent ?? (registeredCount > 0 ? 100 : 0),
          measurementQualityPercent: liveData?.measurement_quality_percent ?? (registeredCount > 0 ? 100 : 0),
          lastReceiptTime: registeredCount > 0 ? 'Active' : 'No data received',
        }}
        departmentName={activeDepartment.name}
      />

      {/* 4. Sensor Telemetry Table */}
      <SensorTelemetryTable
        nodes={telemetryRows}
        departmentName={activeDepartment.name}
      />

      {/* 5. Chronological Recent Activity Feed */}
      <RecentActivityFeed events={activityEvents} />
    </div>
  );
};
