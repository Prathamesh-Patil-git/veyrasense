import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu,
  Activity,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Database,
  ToggleLeft,
  ToggleRight,
  Radio,
} from 'lucide-react';
import { useDepartment } from '../../context/DepartmentContext';
import {
  MOCK_SENSOR_NODES,
  MOCK_ACTIVITY_LOGS,
  getDepartmentMetrics,
} from '../../mock/dashboardData';
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

  const [explicitDemoMode, setExplicitDemoMode] = useState<boolean>(() => {
    return localStorage.getItem('veyrasense_demo_override') === 'true';
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<ApiDashboardOverview | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (explicitDemoMode) {
      setLoading(false);
      setBackendError(null);
      return;
    }

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
  }, [selectedDepartmentId, explicitDemoMode]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleToggleDemoMode = () => {
    const nextVal = !explicitDemoMode;
    setExplicitDemoMode(nextVal);
    localStorage.setItem('veyrasense_demo_override', String(nextVal));
  };

  // 1. Backend Disconnected Error State
  if (!explicitDemoMode && backendError) {
    return (
      <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
        <DashboardBanner
          title="VeyraSense Operations Console"
          subtitle="Real-time monitoring and reliability dashboard."
          actionLabel="Retry Backend Connection"
          nodeCount={0}
          healthPercent={0}
          departmentName={activeDepartment.name}
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
                  HTTP Connection Refused
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#718096] leading-relaxed max-w-2xl">
                The frontend is attempting to query the live FastAPI backend at{' '}
                <code className="px-2 py-0.5 rounded-lg bg-[#EEEFEA] font-mono text-xs text-[#172238]">
                  http://localhost:8000/api/v1/dashboard/overview
                </code>
                , but the server is not reachable.
              </p>
              <div className="p-3.5 clay-recessed text-xs font-mono text-[#B42318]">
                Error: {backendError}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#F2F3EE] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={loadDashboardData}
                leftIcon={<RefreshCw className="w-4 h-4" />}
                isLoading={loading}
              >
                Retry Connection
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={handleToggleDemoMode}
                leftIcon={<Database className="w-4 h-4" />}
              >
                Switch to Explicit Demo Mode
              </Button>
            </div>
            <div className="text-xs text-[#718096]">
              Tip: Start the backend with{' '}
              <span className="font-mono text-[#172238] font-bold">.\run.ps1</span> or{' '}
              <span className="font-mono text-[#172238] font-bold">python -m uvicorn app.main:app --port 8000</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (!explicitDemoMode && loading && !liveData) {
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

  // 3. Render Dashboard with Live FastAPI Data or Explicit Demo Mode
  const isLive = !explicitDemoMode && liveData !== null;

  const registeredCount = isLive ? liveData.registered_nodes : getDepartmentMetrics(selectedDepartmentId).registeredNodes;
  const onlineCount = isLive ? liveData.online_nodes : getDepartmentMetrics(selectedDepartmentId).onlineNodes;
  const investigationsCount = isLive ? liveData.active_investigations : getDepartmentMetrics(selectedDepartmentId).activeInvestigations;
  const recoveriesCount = isLive ? liveData.validated_recoveries : getDepartmentMetrics(selectedDepartmentId).validatedRecoveries;
  const networkHealth = isLive ? liveData.network_health_percent : getDepartmentMetrics(selectedDepartmentId).networkHealthPercent;

  const telemetryRows: SensorTelemetryItem[] = isLive
    ? liveData.recent_telemetry.map((t) => ({
        id: t.id,
        sensorType: t.sensor_type,
        departmentId: String(t.department_id),
        departmentName: t.department_name,
        latestMeasurement: t.latest_measurement,
        unit: t.unit,
        healthStatus: t.health_status,
        lastReceived: t.last_received,
        varianceScore: `${t.variance_score}σ (Live)`,
        protocol: 'Mosquitto MQTT',
        firmware: 'ESP32 / BCM2712',
        sparkline: [40, 41, 42, 42.5, 42.8],
        hardwareModel: t.sensor_type,
      }))
    : (selectedDepartmentId === 'all'
        ? MOCK_SENSOR_NODES
        : MOCK_SENSOR_NODES.filter((n) => n.departmentId === selectedDepartmentId));

  const activityEvents: ActivityEvent[] = isLive
    ? liveData.recent_activity.map((e) => ({
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
      }))
    : (selectedDepartmentId === 'all'
        ? MOCK_ACTIVITY_LOGS
        : MOCK_ACTIVITY_LOGS.filter(
            (e) => e.departmentId === selectedDepartmentId || e.departmentId === 'all'
          ));

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Mode Status Pill and Explicit Switcher */}
      <div className="clay-surface p-3.5 px-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isLive ? 'bg-[#78E9AD] animate-pulse' : 'bg-[#FFD21C]'
            }`}
          />
          <span className="font-bold text-[#172238]">
            {isLive ? 'LIVE FASTAPI BACKEND ACTIVE' : 'EXPLICIT DEMO DATA ACTIVE'}
          </span>
          <span className="text-[#718096] hidden sm:inline">
            • {isLive ? 'Connected to local SQLite database' : 'Development demonstration mode'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleToggleDemoMode}
          className="inline-flex items-center gap-1.5 font-bold text-[#172238] hover:text-[#EFC000] transition-colors"
        >
          {explicitDemoMode ? (
            <>
              <ToggleRight className="w-5 h-5 text-[#FFD21C]" />
              <span>Disable Demo Mode (Connect to Backend)</span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-5 h-5 text-[#718096]" />
              <span>Enable Demo Mode Override</span>
            </>
          )}
        </button>
      </div>

      {/* 1. Welcome Banner + 3D Gateway Focal Point */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardBanner
            title="VeyraSense Operations Console"
            subtitle={
              isLive
                ? 'Connected live to Raspberry Pi 5 Gateway API. Telemetry synchronized from SQLite.'
                : 'Monitor sensor reliability, investigate suspicious measurements and maintain trusted industrial data.'
            }
            actionLabel="Refresh Telemetry"
            nodeCount={registeredCount}
            healthPercent={networkHealth}
            departmentName={activeDepartment.name}
          />
        </div>

        {/* 3D Tactile Sensor Node Visual Hub */}
        <div className="clay-surface p-5 flex flex-col justify-between items-center text-center">
          <div className="w-full flex items-center justify-between text-xs pb-2 border-b border-[#F2F3EE]">
            <span className="font-bold text-[#172238] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#5BA4F5]" />
              <span>Transducer Hub</span>
            </span>
            <span className="text-[10px] font-mono text-[#0C5A37] bg-[#E8FAF1] px-2 py-0.5 rounded-full font-bold">
              3D Interactive
            </span>
          </div>
          <div className="w-full flex-1 min-h-[140px] flex items-center justify-center">
            <GatewayHub3D />
          </div>
          <div className="text-[11px] text-[#718096] font-medium pt-1">
            Raspberry Pi 5 Edge Coordinator + Industrial Transducer Mesh
          </div>
        </div>
      </div>

      {/* 2. Primary Metric Cards (Claymorphic Tactile Surfaces) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          label="Registered Sensor Nodes"
          value={registeredCount}
          unit="nodes"
          change="Full Edge Fleet"
          changeType="neutral"
          timeframe="locally registered"
          icon={<Cpu className="w-4 h-4 text-[#172238]" />}
          accent="slate"
          sparkline={[12, 13, 14, 15, 15, 16, registeredCount]}
          isDemo={!isLive}
        />

        <MetricCard
          label="Online Nodes"
          value={onlineCount}
          unit="active"
          change={`${networkHealth}% operational`}
          changeType="positive"
          timeframe="healthy heartbeat"
          icon={<Activity className="w-4 h-4 text-[#0C5A37]" />}
          accent="mint"
          sparkline={[14, 14, 15, 15, 16, 15, onlineCount]}
          isDemo={!isLive}
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
          sparkline={[1, 2, 1, 3, 2, 2, investigationsCount]}
          isDemo={!isLive}
        />

        <MetricCard
          label="Validated Recoveries"
          value={recoveriesCount}
          unit="data points"
          change="+100% Validated"
          changeType="positive"
          timeframe="provenance verified"
          icon={<ShieldCheck className="w-4 h-4 text-[#134685]" />}
          accent="blue"
          sparkline={[18, 20, 22, 25, 26, 28, recoveriesCount]}
          isDemo={!isLive}
        />
      </div>

      {/* 3. Sensor Network Health & Integrity Summary */}
      <NetworkHealthSummary
        metrics={{
          registeredNodes: registeredCount,
          onlineNodes: onlineCount,
          activeInvestigations: investigationsCount,
          sensorFaultCount: MOCK_SENSOR_NODES.filter((n) => n.healthStatus === 'alert').length,
          validatedRecoveries: recoveriesCount,
          networkHealthPercent: networkHealth,
          communicationHealthPercent: isLive ? liveData.communication_health_percent : 98.6,
          measurementQualityPercent: isLive ? liveData.measurement_quality_percent : 99.1,
          lastReceiptTime: 'Just now',
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
