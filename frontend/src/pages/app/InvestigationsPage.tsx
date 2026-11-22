import React from 'react';
import { AlertTriangle, Activity, Zap } from 'lucide-react';
import { MOCK_SENSOR_NODES } from '../../mock/dashboardData';
import { StatusBadge } from '../../components/dashboard-kit/StatusBadge';
import { Button } from '../../components/ui/Button';

export const InvestigationsPage: React.FC = () => {
  const suspectNodes = MOCK_SENSOR_NODES.filter(
    (n) => n.healthStatus === 'warning' || n.healthStatus === 'alert' || n.healthStatus === 'calibrating'
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <AlertTriangle className="w-4 h-4 text-[#EF6461]" />
              <span>Fault Classification Engine</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Alerts & Active Anomaly Investigations
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            SIMULATED • UI PROTOTYPE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          When telemetry residuals deviate from expected limits, VeyraSense treats the alert as a hypothesis. (Status: Automated anomaly investigation workflow and fault classification below are Planned diagnostic engines operating on Simulated sensor records in this UI prototype).
        </p>
      </div>

      <div className="space-y-4">
        {suspectNodes.map((node) => (
          <div
            key={node.id}
            className="clay-surface p-6 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2F3EE]">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#FFF6C9] text-[#172238] shadow-2xs">
                  <Activity className="w-5 h-5 text-[#172238]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-[#172238]">{node.id}</span>
                    <StatusBadge status={node.healthStatus} size="sm" />
                    <span className="text-xs font-bold text-[#718096]">({node.departmentName})</span>
                  </div>
                  <div className="text-xs text-[#718096]">{node.sensorType} — {node.hardwareModel}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button variant="primary" size="sm" leftIcon={<Zap className="w-3.5 h-3.5" />}>
                  Dispatch Physical Challenge
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl clay-recessed">
                <div className="text-[10px] uppercase font-bold text-[#718096]">Latest Value</div>
                <div className="font-bold text-base text-[#172238] font-mono mt-0.5">
                  {node.latestMeasurement} {node.unit}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl clay-recessed">
                <div className="text-[10px] uppercase font-bold text-[#718096]">Statistical Variance</div>
                <div className="font-bold text-base text-[#EF6461] font-mono mt-0.5">
                  {node.varianceScore}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl clay-recessed">
                <div className="text-[10px] uppercase font-bold text-[#718096]">Model Hypothesis</div>
                <div className="font-semibold text-xs text-[#172238] mt-0.5">
                  {node.healthStatus === 'alert' ? 'Fouling / Surface Drift' : 'Sensor Noise Trip'}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
