import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  ArrowRight,
  CheckCircle2,
  Clock,
  FlaskConical,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/dashboard-kit/StatusBadge';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-16 sm:space-y-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF6C9] text-[#172238] border border-[#F2E7A7] text-xs font-bold uppercase tracking-wider">
          Platform Architecture & Research
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#172238] tracking-tight">
          Engineering Sensor Reliability Without Cloud Reliance
        </h1>
        <p className="text-sm sm:text-base text-[#718096] leading-relaxed">
          VeyraSense was conceived to solve the critical vulnerability at the foundation of modern smart infrastructure: unvalidated sensor trust.
        </p>
      </div>

      {/* Product Vision & Research Motivation */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        <Card variant="pale-yellow" rounded="3xl" className="p-8 sm:p-10 border border-[#F2E7A7] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#172238] border border-[#ECEDE8] shadow-2xs">
            <Compass className="w-6 h-6 text-[#172238]" />
          </div>
          <h2 className="text-2xl font-black text-[#172238] tracking-tight">
            The Product Vision
          </h2>
          <p className="text-sm text-[#172238]/85 leading-relaxed">
            Our vision is a future where connected infrastructure does not fail because of unverified sensor telemetry. Industrial control loops, urban drainage networks, chemical plants, and automated factories depend on measurements that are too frequently accepted as unquestioned fact.
          </p>
          <p className="text-sm text-[#172238]/85 leading-relaxed">
            VeyraSense creates a sovereign layer of measurement verification. By giving edge gateways the intelligence to question readings, execute physical validation routines, and synthesize mathematically proven recovery, we turn vulnerable sensor networks into resilient, self-healing nervous systems.
          </p>
        </Card>

        <Card variant="white" rounded="3xl" className="p-8 sm:p-10 border border-[#ECEDE8] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#E8FAF1] flex items-center justify-center text-[#0C5A37] border border-[#78E9AD]/60 shadow-2xs">
            <FlaskConical className="w-6 h-6 text-[#0C5A37]" />
          </div>
          <h2 className="text-2xl font-black text-[#172238] tracking-tight">
            Research Motivation
          </h2>
          <p className="text-sm text-[#718096] leading-relaxed">
            In AIoT literature surveys and preliminary industrial observations, research indicates that over 65% of IoT sensor anomalies stem from transducer bio-fouling, electrical contact oxidation, temperature drift, and supply voltage fluctuations—not catastrophic component breakage.
          </p>
          <p className="text-sm text-[#718096] leading-relaxed">
            Traditional approaches resort to simple threshold alerts or cloud-based neural networks that hallucinate values when sensors drop offline. Our motivation is to replace guesswork with deterministic physical challenges and spatial evidence.
          </p>
        </Card>
      </section>

      {/* The Sensor Reliability Problem */}
      <section className="rounded-[36px] clay-surface p-8 sm:p-12 space-y-8">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF6C9] text-[#172238] border border-[#F2E7A7] text-xs font-bold uppercase tracking-wider">
            Root Cause Analysis
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172238] tracking-tight">
            The Sensor Reliability Problem
          </h2>
          <p className="text-sm text-[#718096] leading-relaxed">
            Why do modern sensor networks struggle in harsh deployment environments?
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl clay-recessed space-y-2.5">
            <div className="text-sm font-bold text-[#172238] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF6461]" />
              <span>Silent Degradation & Drift</span>
            </div>
            <p className="text-xs text-[#718096] leading-relaxed">
              Sensors rarely fail with a clean cutoff. Instead, calibration shifts gradually over months, delivering subtly biased telemetry that escapes basic sanity checks while polluting downstream analytics.
            </p>
          </div>

          <div className="p-6 rounded-2xl clay-recessed space-y-2.5">
            <div className="text-sm font-bold text-[#172238] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFD21C]" />
              <span>Environmental Ambiguity</span>
            </div>
            <p className="text-xs text-[#718096] leading-relaxed">
              When an ultrasonic water sensor registers zero distance, has the chamber flooded or did spider silk or condensation foul the acoustic transceiver? Static rules cannot distinguish the two.
            </p>
          </div>

          <div className="p-6 rounded-2xl clay-recessed space-y-2.5">
            <div className="text-sm font-bold text-[#172238] flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#5BA4F5]" />
              <span>Blind Cloud Dependency</span>
            </div>
            <p className="text-xs text-[#718096] leading-relaxed">
              Sending raw raw readings to distant cloud servers creates high latency, privacy risks, and total vulnerability to wide-area network drops during critical events.
            </p>
          </div>
        </div>
      </section>

      {/* Physical Diagnosis & Recovery Philosophy */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF6C9] text-[#172238] border border-[#F2E7A7] text-xs font-bold uppercase tracking-wider">
            Evidence-Based Methodology
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#172238] tracking-tight">
            Our Physical Challenge–Response Philosophy
          </h2>
          <p className="text-sm text-[#718096] leading-relaxed">
            In computer security, challenge-response protocols authenticate identity by demanding proof that only a valid cryptographic keyholder can provide.
          </p>
          <p className="text-sm text-[#718096] leading-relaxed">
            VeyraSense brings this same principle to physical IoT sensing. We treat suspect sensors not as permanent authorities, but as entities whose claims must be physically interrogated:
          </p>

          <div className="space-y-3 pt-2 text-xs">
            <div className="p-3.5 rounded-2xl clay-surface flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-[#FFF6C9] text-[#172238] mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-[#172238]" />
              </div>
              <div>
                <span className="font-bold text-[#172238]">Active Physical Stimulus:</span> Transducers are pulsed with known excitation frequencies to measure acoustic ringdown, electrical impedance, and thermal dissipation.
              </div>
            </div>

            <div className="p-3.5 rounded-2xl clay-surface flex items-start gap-3">
              <div className="p-1.5 rounded-lg bg-[#E8FAF1] text-[#0C5A37] mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-[#0C5A37]" />
              </div>
              <div>
                <span className="font-bold text-[#172238]">Conservation Law Constraints:</span> Synthesized recovery data must satisfy fundamental conservation of mass and energy across adjacent node networks.
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6">
          <Card variant="dark-slate" rounded="3xl" className="p-8 border border-[#263756] space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#263756]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FFD21C]">
                Technology Stack Architecture
              </span>
              <StatusBadge status="online" label="Local Stack" size="sm" />
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E2D4A] border border-[#2E436D]">
                <div>
                  <div className="font-bold text-white">Edge Microcontrollers</div>
                  <div className="text-[11px] text-slate-400">Firmware layer for sensor interface</div>
                </div>
                <div className="font-mono text-slate-200 bg-[#263756] px-2.5 py-1 rounded">
                  ESP32 / ESP8266 C++
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E2D4A] border border-[#2E436D]">
                <div>
                  <div className="font-bold text-white">Message Ingestion Broker</div>
                  <div className="text-[11px] text-slate-400">Publish/subscribe telemetry bus</div>
                </div>
                <div className="font-mono text-slate-200 bg-[#263756] px-2.5 py-1 rounded">
                  Eclipse Mosquitto (MQTT)
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E2D4A] border border-[#2E436D]">
                <div>
                  <div className="font-bold text-white">Application & Diagnostics Backend</div>
                  <div className="text-[11px] text-slate-400">Async processing & API endpoints</div>
                </div>
                <div className="font-mono text-slate-200 bg-[#263756] px-2.5 py-1 rounded">
                  FastAPI / Python 3.11+
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E2D4A] border border-[#2E436D]">
                <div>
                  <div className="font-bold text-white">Time Series & Relational Storage</div>
                  <div className="text-[11px] text-slate-400">Edge database persistence</div>
                </div>
                <div className="font-mono text-slate-200 bg-[#263756] px-2.5 py-1 rounded">
                  SQLite / Timescale Local
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1E2D4A] border border-[#2E436D]">
                <div>
                  <div className="font-bold text-white">Frontend & UI Interface</div>
                  <div className="text-[11px] text-slate-400">Operator dashboard & public site</div>
                </div>
                <div className="font-mono text-[#FFD21C] bg-[#263756] px-2.5 py-1 rounded font-bold">
                  React 19 + TypeScript + Vite
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* =========================================================
          CRITICAL SECTION: DISTINGUISHING PLANNED VS EXPERIMENTALLY VALIDATED
          ========================================================= */}
      <section className="rounded-[36px] clay-surface p-8 sm:p-12 space-y-6">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF4FE] text-[#134685] border border-[#5BA4F5]/60 text-xs font-bold uppercase tracking-wider">
            Academic & Engineering Transparency
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172238] tracking-tight">
            Research Status & Verification Matrix
          </h2>
          <p className="text-sm text-[#718096] leading-relaxed">
            In accordance with sound engineering principles, we strictly delineate between physical bench protocols and production edge capabilities.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
          {/* Proposed Experiments & Preliminary Bench Prototypes */}
          <div className="p-6 rounded-3xl bg-[#E8FAF1]/60 border border-[#78E9AD] space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#0C5A37] uppercase tracking-wider">
              <CheckCircle2 className="w-5 h-5 text-[#0C5A37]" />
              <span>Edge Bench Experiments & Observations</span>
            </div>
            <p className="text-xs text-[#0C5A37]/90 leading-relaxed">
              These methodologies represent testbed protocols and engineering benchmarks in the project scope:
            </p>
            <ul className="space-y-2.5 text-xs text-[#172238]">
              <li className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-[#78E9AD]/40">
                <span className="font-bold text-[#0C5A37]">•</span>
                <span>
                  <strong>Ultrasonic Transducer Testing Protocol:</strong> Bench evaluation protocol for JSN-SR04T acoustic reflection timing and zero-distance fault discrimination under physical obstructions.
                </span>
              </li>
              <li className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-[#78E9AD]/40">
                <span className="font-bold text-[#0C5A37]">•</span>
                <span>
                  <strong>MQTT Telemetry Pipeline:</strong> Production architecture for ingestion through local Mosquitto broker on Raspberry Pi 5 with sub-50ms message processing latency.
                </span>
              </li>
              <li className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-[#78E9AD]/40">
                <span className="font-bold text-[#0C5A37]">•</span>
                <span>
                  <strong>Statistical Drift Detection:</strong> CUSUM and residual moving-window algorithms designed for detecting gradual sensor drift on operational telemetry streams.
                </span>
              </li>
            </ul>
          </div>

          {/* Planned Research Capabilities */}
          <div className="p-6 rounded-3xl bg-[#FFF9DE]/60 border border-[#FFD21C] space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#875B00] uppercase tracking-wider">
              <Clock className="w-5 h-5 text-[#875B00]" />
              <span>Advanced Research Roadmap</span>
            </div>
            <p className="text-xs text-[#875B00]/90 leading-relaxed">
              These capabilities represent advanced project milestones in development:
            </p>
            <ul className="space-y-2.5 text-xs text-[#172238]">
              <li className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-[#FFD21C]/40">
                <span className="font-bold text-[#875B00]">•</span>
                <span>
                  <strong>Multi-Hop Mesh Collaborative Imputation [Planned]:</strong> Distributed spatial Kalman consensus across concurrent physical edge nodes in live industrial deployments.
                </span>
              </li>
              <li className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-[#FFD21C]/40">
                <span className="font-bold text-[#875B00]">•</span>
                <span>
                  <strong>Autonomous On-Chip Re-Excitation [Planned]:</strong> Hardware-level micro-excitation circuit triggering secondary pulse wave shapes via dedicated DAC pins.
                </span>
              </li>
              <li className="flex items-start gap-2 bg-white/80 p-2.5 rounded-xl border border-[#FFD21C]/40">
                <span className="font-bold text-[#875B00]">•</span>
                <span>
                  <strong>Certified Cryptographic Provenance [Planned]:</strong> Formal cryptographic signing of edge recovered telemetry for regulatory audit submission.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Navigation CTA */}
      <div className="text-center pb-6">
        <Link to="/contact">
          <Button variant="primary" size="lg" className="font-bold shadow-xs" rightIcon={<ArrowRight className="w-4 h-4" />}>
            Contact the Research Team
          </Button>
        </Link>
      </div>
    </div>
  );
};
