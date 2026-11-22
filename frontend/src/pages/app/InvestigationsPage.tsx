import React, { useEffect, useState } from 'react';
import { AlertTriangle, Activity, Zap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, type ApiNode, type ApiResearchRecord } from '../../services/api';
import { StatusBadge } from '../../components/dashboard-kit/StatusBadge';
import { Button } from '../../components/ui/Button';
import { useEnvironment } from '../../context/EnvironmentContext';

export const InvestigationsPage: React.FC = () => {
  const { environment } = useEnvironment();
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [research, setResearch] = useState<ApiResearchRecord[]>([]);

  useEffect(() => {
    let mounted = true;
    api.getNodes(undefined, environment)
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
  }, [environment]);

  useEffect(() => {
    Promise.all([
      api.getResearchRecords(environment, 'anomaly'),
      api.getResearchRecords(environment, 'hypothesis_analysis'),
      api.getResearchRecords(environment, 'investigation'),
      api.getResearchRecords(environment, 'response_fingerprint'),
    ]).then((groups) => setResearch(groups.flat())).catch(() => setResearch([]));
  }, [environment]);

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

      <section className="clay-surface space-y-4 p-6">
        <div className="flex items-center justify-between"><h3 className="font-black">Persisted anomaly evidence and competing hypotheses</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase">{environment}</span></div>
        {research.filter((r) => r.record_type === 'anomaly').length === 0 ? <p className="text-sm text-slate-500">No anomaly records have been detected in this environment.</p> : research.filter((r) => r.record_type === 'anomaly').map((record) => {
          const analysis = research.find((r) => r.record_type === 'hypothesis_analysis' && r.related_record_id === record.id);
          const investigation = research.find((r) => r.record_type === 'investigation' && r.related_record_id === record.id);
          const fingerprint = research.find((r) => r.record_type === 'response_fingerprint' && r.related_record_id === record.id);
          return <article key={record.id} className="rounded-xl bg-slate-50 p-4"><div className="flex flex-wrap justify-between gap-2"><b>{record.node_id} · {(record.payload.anomaly_types || []).join(', ')}</b><span className="text-xs">{record.payload.severity} · {Math.round(record.payload.confidence * 100)}% confidence</span></div><div className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><span>Evidence: {Object.keys(record.payload.evidence || {}).join(', ')}</span><span>Selected: {analysis?.payload.selected || 'pending'}</span></div>{analysis && <div className="mt-2 grid gap-1 sm:grid-cols-2">{analysis.payload.hypotheses.map((h: any) => <div key={h.type} className="rounded bg-white p-2 text-xs"><b>{h.type.replaceAll('_', ' ')}</b> · {Math.round(h.confidence * 100)}%<div className="text-slate-500">Supports: {(h.supporting || []).join(', ') || 'none'} · Contradicts: {(h.contradicting || []).join(', ') || 'none'}</div></div>)}</div>}{investigation && <p className="mt-2 text-xs text-amber-800">Investigation: {investigation.payload.reason}. Suggested observations: {(investigation.payload.diagnostic_observations || []).join('; ')}</p>}{fingerprint && <p className="mt-2 text-xs text-blue-800">Response fingerprint: {fingerprint.payload.direction} · change {fingerprint.payload.absolute_change ?? 'n/a'} · corroborating channels {fingerprint.payload.cross_sensor_corroboration_count}</p>}</article>;
        })}
      </section>

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
                  <Link to="/app/demonstration">
                    <Button variant="primary" size="sm" leftIcon={<Zap className="w-3.5 h-3.5" />}>
                      Review diagnostic observations
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
