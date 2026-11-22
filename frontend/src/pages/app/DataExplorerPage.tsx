import React, { useEffect, useState } from 'react';
import { Database, Filter, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, type ApiNode } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { useEnvironment } from '../../context/EnvironmentContext';

export const DataExplorerPage: React.FC = () => {
  const { environment } = useEnvironment();
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [measurements, setMeasurements] = useState<Awaited<ReturnType<typeof api.getMeasurements>>['items']>([]);
  const [selectedType, setSelectedType] = useState('');

  useEffect(() => {
    api.getNodes(undefined, environment)
      .then((data) => {
        setNodes(data);
        if (data.length > 0) {
          setSelectedNodeId(data[0].node_id);
        }
      })
      .catch(() => {
        setNodes([]);
      });
  }, [environment]);

  useEffect(() => {
    const selectedNode = nodes.find((node) => node.node_id === selectedNodeId);
    if (!selectedNode) { setMeasurements([]); return; }
    api.getMeasurements(environment, selectedNode.id).then((data) => {
      setMeasurements(data.items);
      setSelectedType((current) => current && data.items.some((item) => item.measurement_type === current) ? current : data.items[0]?.measurement_type || '');
    }).catch(() => setMeasurements([]));
  }, [nodes, selectedNodeId, environment]);

  const selectedMeasurements = [...measurements].filter((item) => !selectedType || item.measurement_type === selectedType).reverse();
  const values = selectedMeasurements.map((item) => item.value);
  const minValue = Math.min(...values, 0);
  const maxValue = Math.max(...values, 1);
  const chartPoints = values.map((value, index) => `${values.length > 1 ? (index / (values.length - 1)) * 980 + 10 : 500},${220 - ((value - minValue) / Math.max(maxValue - minValue, 1)) * 200}`).join(' ');

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Database className="w-4 h-4 text-[#5BA4F5]" />
              <span>Timeseries Analytics</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Historical Telemetry & Residual Data Explorer
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            Query Engine Ready
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Query high-resolution raw sensor data, statistical moving averages, and residual deviations persisted on the local gateway storage.
        </p>
      </div>

      {nodes.length === 0 ? (
        <div className="clay-surface p-10 sm:p-14 text-center space-y-4">
          <Info className="w-12 h-12 text-[#718096] mx-auto" />
          <h3 className="text-xl font-bold text-[#172238]">No Telemetry Data Available</h3>
          <p className="text-xs sm:text-sm text-[#718096] max-w-lg mx-auto leading-relaxed">
            No sensor nodes are currently provisioned. Register a sensor node to begin capturing and exploring high-resolution timeseries telemetry.
          </p>
          <div className="pt-2">
            <Link to="/app/devices">
              <Button variant="primary" size="sm">
                Register Sensor Node
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Query Bar */}
          <div className="p-4 sm:p-6 clay-surface flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <label className="font-bold text-[#172238]">Target Node:</label>
              <select
                value={selectedNodeId}
                onChange={(e) => setSelectedNodeId(e.target.value)}
                className="px-3 py-1.5 rounded-xl clay-recessed font-mono text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFD21C]"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.node_id}>
                    {n.node_id} — {n.name}
                  </option>
                ))}
              </select>

              <span className="text-[#718096]">Window: Latest 100 records</span>
              <select aria-label="Measurement type" value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="rounded-xl border px-3 py-1.5 text-xs"><option value="">All types</option>{[...new Set(measurements.map((item) => item.measurement_type))].map((type) => <option key={type} value={type}>{type}</option>)}</select>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" leftIcon={<Filter className="w-3.5 h-3.5" />}>
                Execute Query
              </Button>
            </div>
          </div>

          <div className="clay-surface p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-[#172238] text-base">
                Telemetry Residual Signal — Node: {selectedNodeId}
              </h3>
              <span className="text-[10px] text-[#718096] font-mono">SQLite Ingestion Store</span>
            </div>

            {selectedMeasurements.length === 0 ? <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">No measurements stored for this node and type in the selected environment.</div> : <><div className="rounded-xl bg-slate-50 p-4"><p className="mb-2 text-[10px] font-bold uppercase text-slate-500">Stored {selectedType} values · {selectedMeasurements[0].unit}</p><svg role="img" aria-label={`${selectedType} measurement history`} viewBox="0 0 1000 240" className="h-48 w-full"><line x1="10" y1="220" x2="990" y2="220" stroke="#cbd5e1"/><polyline points={chartPoints} fill="none" stroke="#1686a5" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round"/>{values.map((value, index) => <circle key={selectedMeasurements[index].id} cx={values.length > 1 ? (index / (values.length - 1)) * 980 + 10 : 500} cy={220 - ((value - minValue) / Math.max(maxValue - minValue, 1)) * 200} r="4" fill="#1686a5"/>)}</svg><div className="flex justify-between text-[10px] text-slate-500"><span>{new Date(selectedMeasurements[0].measured_at).toLocaleString()}</span><span>{new Date(selectedMeasurements[selectedMeasurements.length - 1].measured_at).toLocaleString()}</span></div></div><div className="max-h-96 overflow-auto rounded-xl bg-slate-50"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr><th className="p-3">Measured at</th><th className="p-3">Type</th><th className="p-3">Value</th><th className="p-3">Quality</th></tr></thead><tbody>{selectedMeasurements.slice().reverse().map((item) => <tr key={item.id} className="border-t border-slate-200"><td className="p-3">{new Date(item.measured_at).toLocaleString()}</td><td className="p-3">{item.measurement_type}</td><td className="p-3 font-mono">{item.value} {item.unit}</td><td className="p-3">{item.quality}</td></tr>)}</tbody></table></div></>}
          </div>
        </>
      )}
    </div>
  );
};
