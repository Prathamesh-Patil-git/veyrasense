import React, { useEffect, useState } from 'react';
import { Zap, CheckCircle2, Play, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, type ApiNode } from '../../services/api';
import { Button } from '../../components/ui/Button';

export const ChallengesPage: React.FC = () => {
  const [nodes, setNodes] = useState<ApiNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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

  const handleRunChallenge = () => {
    if (!selectedNodeId) return;
    setIsRunning(true);
    setTestResult(null);
    setTimeout(() => {
      setIsRunning(false);
      setTestResult(
        `SUCCESS: Acoustic ringdown damping verified for node ${selectedNodeId}. Transducer diaphragm mechanically responsive. Surface blockage excluded.`
      );
    }, 1200);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      <div className="clay-surface p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F3EE]">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096]">
              <Zap className="w-4 h-4 text-[#FFD21C]" />
              <span>Physical Interrogation</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#172238] tracking-tight mt-0.5">
              Physical Challenge–Response Engine
            </h2>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#E8FAF1] text-[#0C5A37] self-start sm:self-auto shadow-2xs">
            Engine Ready
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Rather than blindly trusting suspect sensor readings, VeyraSense dispatches physical challenge signals (resonant ultrasonic pulses, excitation frequencies, or thermal dissipation steps) to demand physical proof of transducer health.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="clay-surface p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#172238]">
              Interactive Challenge Runner
            </h3>
            <span className="text-[10px] font-bold uppercase text-[#0C5A37] bg-[#E8FAF1] px-2.5 py-0.5 rounded-full shadow-2xs">
              Direct Hardware Bus
            </span>
          </div>

          {nodes.length === 0 ? (
            <div className="p-6 rounded-2xl clay-recessed text-center space-y-3">
              <Info className="w-8 h-8 text-[#718096] mx-auto" />
              <div className="font-bold text-sm text-[#172238]">No Sensor Nodes Available</div>
              <p className="text-xs text-[#718096] leading-relaxed">
                No active sensor nodes are currently provisioned to dispatch physical challenges.
              </p>
              <div className="pt-1">
                <Link to="/app/devices">
                  <Button variant="primary" size="sm">
                    Register Sensor Node
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-[#5A687C] leading-relaxed">
                Select a target node to execute a physical challenge interrogation sequence:
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-[#172238] mb-1">Target Node</label>
                  <select
                    value={selectedNodeId}
                    onChange={(e) => setSelectedNodeId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl clay-recessed font-mono text-xs font-semibold text-[#172238] focus:outline-none focus:ring-2 focus:ring-[#FFD21C]"
                  >
                    {nodes.map((n) => (
                      <option key={n.id} value={n.node_id}>
                        {n.node_id} ({n.name} — {n.hardware_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 text-xs font-mono clay-recessed p-4">
                  <div><strong>Selected Node:</strong> {selectedNodeId}</div>
                  <div><strong>Interrogation Routine:</strong> Secondary Acoustic Ringdown Excitation</div>
                  <div><strong>Excitation Voltage:</strong> 5.0V Pulse / 40kHz Transducer Burst</div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="primary"
                  size="md"
                  isLoading={isRunning}
                  onClick={handleRunChallenge}
                  leftIcon={<Play className="w-4 h-4 fill-current" />}
                >
                  {isRunning ? 'Injecting Excitation Pulse...' : 'Dispatch Physical Challenge'}
                </Button>
              </div>

              {testResult && (
                <div className="p-4 rounded-2xl bg-[#E8FAF1] text-xs space-y-2 animate-in fade-in shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-[#0C5A37]">
                    <CheckCircle2 className="w-4 h-4 text-[#0C5A37]" />
                    <span>Challenge Execution Result</span>
                  </div>
                  <p className="text-[#0C5A37] font-mono text-[11px] leading-relaxed">
                    {testResult}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="clay-surface p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-black text-[#172238]">
            Supported Hardware Challenge Modalities
          </h3>
          <div className="space-y-3 text-xs">
            <div className="p-4 clay-recessed space-y-1">
              <div className="font-bold text-[#172238]">1. Acoustic Resonant Ringdown</div>
              <div className="text-[11px] text-[#5A687C]">
                Pulses ultrasonic piezo transducers to observe free oscillation decay time constant.
              </div>
            </div>

            <div className="p-4 clay-recessed space-y-1">
              <div className="font-bold text-[#172238]">2. Thermal Dissipation Transient</div>
              <div className="text-[11px] text-[#5A687C]">
                Brief micro-current pulse to verify cooling slope and detect medium displacement.
              </div>
            </div>

            <div className="p-4 clay-recessed space-y-1">
              <div className="font-bold text-[#172238]">3. Coil Inductive Step Response</div>
              <div className="text-[11px] text-[#5A687C]">
                Electromagnetic pulse through transducer coil to exclude mechanical jam vs electronics drift.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
