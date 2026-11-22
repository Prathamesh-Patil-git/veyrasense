import React, { useState } from 'react';
import { Zap, CheckCircle2, Play } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const ChallengesPage: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleRunChallenge = () => {
    setIsRunning(true);
    setTestResult(null);
    setTimeout(() => {
      setIsRunning(false);
      setTestResult('PASS: Acoustic ringdown damping verified at 42.1kHz. Transducer diaphragm mechanically responsive. Surface blockage excluded.');
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
          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] self-start sm:self-auto shadow-2xs">
            SIMULATED • UI PROTOTYPE
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#5A687C] mt-3 leading-relaxed max-w-3xl">
          Rather than accepting questionable sensor readings, VeyraSense's proposed architecture dispatches physical challenge signals (resonant ultrasonic pulses, excitation frequencies, or thermal dissipation steps) to demand physical proof of transducer health. (Demonstration state: All challenge interactions below run in simulated UI mode).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="clay-surface p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-[#172238]">
              Interactive Challenge Runner
            </h3>
            <span className="text-[10px] font-bold uppercase text-[#875B00] bg-[#FFF9DE] px-2.5 py-0.5 rounded-full shadow-2xs">
              Status: Simulated
            </span>
          </div>
          <p className="text-xs text-[#5A687C] leading-relaxed">
            Select a target testbed node to execute a simulated physical challenge test sequence:
          </p>

          <div className="space-y-2 text-xs font-mono clay-recessed p-4">
            <div><strong>Target:</strong> NODE-UTL-01 (JSN-SR04T Ultrasonic) [Simulated]</div>
            <div><strong>Routine:</strong> Secondary Acoustic Ringdown Excitation [Planned Spec]</div>
            <div><strong>Excitation Voltage:</strong> 5.0V Pulse / 40kHz Transducer Burst [Simulated]</div>
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
