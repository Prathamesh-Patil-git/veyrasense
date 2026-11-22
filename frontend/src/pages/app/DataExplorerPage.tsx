import React, { useEffect, useState } from 'react';
import { Database, Filter, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, type ApiNode } from '../../services/api';
import { Button } from '../../components/ui/Button';

export const DataExplorerPage: React.FC = () => {
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  useEffect(() => {
    api.getNodes()
      .then((data) => {
        setNodes(data);
        if (data.length > 0) {
          setSelectedNodeId(data[0].node_id);
        }
      })
      .catch(() => {
        setNodes([]);
      });
  }, []);

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

              <span className="text-[#718096]">Window: Last 24 Hours</span>
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

            <div className="h-64 w-full clay-recessed p-8 flex flex-col items-center justify-center text-center space-y-2">
              <Database className="w-8 h-8 text-[#718096]" />
              <div className="font-bold text-sm text-[#172238]">No Telemetry Captured in Selected Window</div>
              <p className="text-xs text-[#718096] max-w-sm">
                Timeseries samples will render here as the node transmits telemetry via MQTT.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
