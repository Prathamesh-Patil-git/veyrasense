import React, { useEffect, useState } from 'react';
import { AlertTriangle, Activity, Zap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, type ApiNode } from '../../services/api';
import { StatusBadge } from '../../components/dashboard-kit/StatusBadge';
import { Button } from '../../components/ui/Button';

export const InvestigationsPage: React.FC = () => {
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.getNodes()
      .then((data) => {
        if (mounted) {
          setNodes(data);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setNodes([]);
          setIsLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const suspectNodes = nodes.filter(
    (n) => n.status === 'warning' || n.status === 'alert' || n.status === 'calibrating' || n.status === 'offline'
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
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            Engine Active
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          When telemetry residuals deviate from expected statistical limits, VeyraSense treats the deviation as an anomaly hypothesis to be verified through physical challenge routines before raising actionable alarms.
        </p>
      </div>

      {isLoading ? (
        <div className="clay-surface p-8 text-center text-xs text-[#718096]">
          Loading active investigations...
        </div>
      ) : suspectNodes.length === 0 ? (
        <div className="clay-surface p-10 sm:p-14 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#E8FAF1] text-[#0C5A37] flex items-center justify-center mx-auto border border-[#78E9AD] shadow-2xs">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-[#172238]">
            {nodes.length === 0 ? 'No Sensor Nodes Registered' : 'No Active Anomaly Investigations'}
          </h3>
          <p className="text-xs sm:text-sm text-[#718096] max-w-lg mx-auto leading-relaxed">
            {nodes.length === 0
              ? 'No sensor nodes are currently provisioned on this gateway. Once nodes transmit telemetry, active anomalies will appear here.'
              : 'All registered sensor nodes are operating within nominal thresholds. Anomaly hypotheses and physical challenge triggers will appear here automatically when residuals deviate.'}
          </p>
          {nodes.length === 0 && (
            <div className="pt-2">
              <Link to="/app/devices">
                <Button variant="primary" size="sm">
                  Register First Sensor Node
                </Button>
              </Link>
            </div>
          )}
        </div>
      ) : (
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
                      <span className="font-mono font-bold text-sm text-[#172238]">{node.node_id}</span>
                      <StatusBadge status={node.status as any} size="sm" />
                      {node.department_name && (
                        <span className="text-xs font-bold text-[#718096]">({node.department_name})</span>
                      )}
                    </div>
                    <div className="text-xs text-[#718096]">{node.name} — {node.hardware_type}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Link to="/app/challenges">
                    <Button variant="primary" size="sm" leftIcon={<Zap className="w-3.5 h-3.5" />}>
                      Dispatch Physical Challenge
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl clay-recessed">
                  <div className="text-[10px] uppercase font-bold text-[#718096]">Node Status</div>
                  <div className="font-bold text-base text-[#172238] font-mono mt-0.5 capitalize">
                    {node.status}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl clay-recessed">
                  <div className="text-[10px] uppercase font-bold text-[#718096]">Firmware</div>
                  <div className="font-bold text-base text-[#172238] font-mono mt-0.5">
                    {node.firmware_version}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl clay-recessed">
                  <div className="text-[10px] uppercase font-bold text-[#718096]">Model Hypothesis</div>
                  <div className="font-semibold text-xs text-[#172238] mt-0.5">
                    {node.status === 'offline' ? 'Telemetry Dropout / Connection Loss' : 'Residual Variance Threshold Exceeded'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
