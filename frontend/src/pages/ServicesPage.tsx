import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  Cpu,
  GitCompare,
  Sliders,
  Database,
  CheckCircle2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface ServiceDetail {
  id: string;
  title: string;
  category: string;
  accent: 'yellow' | 'mint' | 'blue';
  icon: React.ReactNode;
  summary: string;
  capabilities: string[];
  inputs: string;
  outputs: string;
  edgeRequirement: string;
}

export const ServicesPage: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'monitoring' | 'diagnosis' | 'recovery' | 'edge'>('all');

  const services: ServiceDetail[] = [
    {
      id: 'iot-sensor-monitoring',
      title: 'IoT Sensor Monitoring',
      category: 'monitoring',
      accent: 'yellow',
      icon: <Activity className="w-6 h-6 text-[#172238]" />,
      summary:
        'Continuous high-frequency ingestion of telemetry streams from heterogeneous IoT microcontrollers over MQTT, LoRa, or local serial buses.',
      capabilities: [
        'Real-time packet deduplication & timestamp alignment',
        'Dynamic variance envelope and boundary checking',
        'Multi-frequency sampling rate auto-tuning',
        'Buffer preservation during intermittent edge disconnections',
      ],
      inputs: 'Raw sensor telemetry (JSON / binary payloads)',
      outputs: 'Standardized timeseries frames with quality metrics',
      edgeRequirement: 'Lightweight C/Python daemon (< 25MB RAM)',
    },
    {
      id: 'sensor-fault-detection',
      title: 'Sensor Fault Detection',
      category: 'diagnosis',
      accent: 'mint',
      icon: <AlertCircle className="w-6 h-6 text-[#0C5A37]" />,
      summary:
        'Statistical and machine-learning anomaly detection that isolates subtle signal deviations, flatlining, drift, and erratic spikes.',
      capabilities: [
        'Rolling residual statistical anomaly scoring (Z-score & CUSUM)',
        'Frozen transducer detection for zero-variance states',
        'Rapid slope/derivative anomaly tripwires',
        'Automated noise floor discrimination',
      ],
      inputs: 'Normalized telemetry time series',
      outputs: 'Anomaly confidence vectors & classification alerts',
      edgeRequirement: 'ARM-optimized NumPy / SciPy routines',
    },
    {
      id: 'evidence-based-diagnosis',
      title: 'Evidence-Based Diagnosis',
      category: 'diagnosis',
      accent: 'blue',
      icon: <ShieldCheck className="w-6 h-6 text-[#134685]" />,
      summary:
        'Cross-correlates external physical environmental conditions with transducer health to prevent false alarms during genuine environmental events.',
      capabilities: [
        'Multi-sensor corroboration to verify physical phenomena',
        'Distinction between sensor failure and true process surges',
        'Causal graph tracing for cascaded industrial events',
        'Audit logs preserving diagnostic decision traces',
      ],
      inputs: 'Multi-node sensor clusters & ambient environmental data',
      outputs: 'Deterministic diagnosis (Sensor Fault vs Physical Event)',
      edgeRequirement: 'Local deterministic rule engine & Bayesian graph',
    },
    {
      id: 'physical-challenge-response',
      title: 'Physical Challenge–Response',
      category: 'diagnosis',
      accent: 'yellow',
      icon: <Zap className="w-6 h-6 text-[#172238]" />,
      summary:
        'Actively interrogates suspect transducers with non-destructive excitation signals (e.g., secondary ultrasonic pings or heating cycles) to verify operational physics.',
      capabilities: [
        'Controlled excitation signal dispatch to MCU peripherals',
        'Measurement of transducer resonant frequency & acoustic damping',
        'Verification of circuit impedance and wire integrity',
        'Safe, non-destructive execution within operational safety margins',
      ],
      inputs: 'Diagnostic trigger flags from fault detection engine',
      outputs: 'Hardware health confirmation vs physical fault verification',
      edgeRequirement: 'Bidirectional MQTT/LoRa challenge protocol',
    },
    {
      id: 'temporal-sensor-prediction',
      title: 'Temporal Sensor Prediction',
      category: 'recovery',
      accent: 'mint',
      icon: <GitCompare className="w-6 h-6 text-[#0C5A37]" />,
      summary:
        'Predicts expected sensor trajectories using historical periodicity, trend autoregression, and physical process dynamics.',
      capabilities: [
        'Autoregressive integrated moving average (ARIMA) & Kalman filters',
        'Adaptive baseline updating across seasonal & diurnal cycles',
        'Physical process rate-of-change bounding constraints',
        'Uncertainty interval calculation for synthetic data points',
      ],
      inputs: 'Historical baseline buffer (1h – 30 days sliding window)',
      outputs: 'Synthetic predicted value series with variance bounds',
      edgeRequirement: 'Embedded linear algebra & Kalman filter engine',
    },
    {
      id: 'neighbour-based-recovery',
      title: 'Neighbour-Based Sensor Recovery',
      category: 'recovery',
      accent: 'blue',
      icon: <Cpu className="w-6 h-6 text-[#134685]" />,
      summary:
        'Reconstructs corrupted data streams by utilizing spatial correlation from adjacent physical sensor nodes monitoring the same process loop.',
      capabilities: [
        'Spatial covariance matrix calculation across adjacent nodes',
        'Distance-weighted collaborative imputation',
        'Hydraulic and thermodynamic conservation law constraints',
        'Independent cross-validation against physical boundary limits',
      ],
      inputs: 'Adjacent node streams & spatial graph topology',
      outputs: 'High-confidence reconstructed measurement telemetry',
      edgeRequirement: 'Spatial graph matrix solver',
    },
    {
      id: 'ml-model-management',
      title: 'ML Model Management',
      category: 'recovery',
      accent: 'yellow',
      icon: <Database className="w-6 h-6 text-[#172238]" />,
      summary:
        'Manages lightweight, quantized machine learning models directly on edge hosts, supporting local retraining and zero-cloud inference.',
      capabilities: [
        'Quantized ONNX / TFLite runtime support on ARM architecture',
        'Incremental online learning to adapt to industrial wear',
        'Model versioning and drift re-calibration triggers',
        'Minimal memory footprint (< 50MB runtime overhead)',
      ],
      inputs: 'Calibrated historical telemetry & fault event datasets',
      outputs: 'Trained model weights & inference latency reports',
      edgeRequirement: 'TFLite Runtime / ONNX Edge Engine',
    },
    {
      id: 'edge-deployment',
      title: 'Edge Deployment',
      category: 'edge',
      accent: 'mint',
      icon: <Sliders className="w-6 h-6 text-[#0C5A37]" />,
      summary:
        'Turnkey appliance software optimized for Raspberry Pi, industrial edge gateways, and ruggedized IPCs running headless Linux.',
      capabilities: [
        'Containerized Docker & systemd micro-service architecture',
        'Embedded Mosquitto MQTT broker pre-configured for port 1883',
        'SQLite local persistence with automated pruning policies',
        'Self-healing watchdog monitors with automatic recovery restart',
      ],
      inputs: 'Debian / Ubuntu / Raspberry Pi OS Linux environment',
      outputs: 'Full local reliability pipeline & local web UI',
      edgeRequirement: 'Host: 1GHz CPU, 1GB RAM, 16GB Storage',
    },
  ];

  const filteredServices =
    filter === 'all' ? services : services.filter((s) => s.category === filter);

  const getAccentBg = (accent: 'yellow' | 'mint' | 'blue') => {
    switch (accent) {
      case 'yellow':
        return 'bg-[#FFF6C9] border-[#F2E7A7]';
      case 'mint':
        return 'bg-[#E8FAF1] border-[#78E9AD]/60';
      case 'blue':
        return 'bg-[#EBF4FE] border-[#5BA4F5]/60';
    }
  };

  const getAccentBadge = (accent: 'yellow' | 'mint' | 'blue') => {
    switch (accent) {
      case 'yellow':
        return 'bg-[#FFF9DE] text-[#875B00] border-[#FFD21C]/60';
      case 'mint':
        return 'bg-[#E8FAF1] text-[#0C5A37] border-[#78E9AD]/60';
      case 'blue':
        return 'bg-[#EBF4FE] text-[#134685] border-[#5BA4F5]/60';
    }
  };

  return (
    <div className="space-y-16 sm:space-y-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
      {/* Page Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF6C9] text-[#172238] border border-[#F2E7A7] text-xs font-bold uppercase tracking-wider">
          Platform Capabilities
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#172238] tracking-tight">
          Intelligent Services for Critical Sensor Networks
        </h1>
        <p className="text-sm sm:text-base text-[#718096] leading-relaxed">
          From high-speed telemetry ingestion to physical challenge-response and spatial data recovery. Explore the modular services powering VeyraSense.
        </p>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
          {[
            { id: 'all', label: 'All Services' },
            { id: 'monitoring', label: 'Monitoring' },
            { id: 'diagnosis', label: 'Diagnosis & Challenge' },
            { id: 'recovery', label: 'Data Recovery' },
            { id: 'edge', label: 'Edge Systems' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all duration-150 ${
                filter === tab.id
                  ? 'bg-[#FFD21C] text-[#172238] shadow-xs font-bold'
                  : 'bg-white text-[#718096] border border-[#ECEDE8] hover:bg-[#F7F7F0] hover:text-[#172238]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 8 Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {filteredServices.map((service) => (
          <Card
            key={service.id}
            variant="white"
            rounded="3xl"
            hoverEffect
            className="p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              {/* Header with accent icon & category badge */}
              <div className="flex items-start justify-between gap-4 mb-5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${getAccentBg(
                    service.accent
                  )}`}
                >
                  {service.icon}
                </div>
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full border ${getAccentBadge(
                    service.accent
                  )}`}
                >
                  {service.category}
                </span>
              </div>

              {/* Title & Summary */}
              <h2 className="text-xl font-bold text-[#172238] mb-2 tracking-tight">
                {service.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#718096] leading-relaxed mb-6">
                {service.summary}
              </p>

              {/* Capabilities list */}
              <div className="space-y-2 mb-6">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#172238]">
                  Key Capabilities
                </div>
                <ul className="space-y-2">
                  {service.capabilities.map((cap, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-[#718096]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#0C5A37] shrink-0 mt-0.5" />
                      <span>{cap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Technical Specifications Footer */}
            <div className="pt-4 border-t border-[#ECEDE8] space-y-2 text-xs bg-[#F7F7F0]/60 p-3.5 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[#718096] font-medium">Input:</span>
                <span className="text-[#172238] font-semibold text-right">{service.inputs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#718096] font-medium">Output:</span>
                <span className="text-[#172238] font-semibold text-right">{service.outputs}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#ECEDE8]/80">
                <span className="text-[#718096] font-medium">Host Req:</span>
                <span className="text-[#0C5A37] font-semibold">{service.edgeRequirement}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Deployment Consultation CTA */}
      <section className="rounded-[32px] bg-[#172238] text-white p-8 sm:p-12 border border-[#263756]">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#263756] text-[#FFD21C] text-xs font-bold uppercase tracking-wider">
              Integration Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Custom Challenge Modules For Your Specific Sensors
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every industrial sensor has distinct failure modes and physical interrogation possibilities. Our research team assists in configuring custom challenge-response matrices for specialized industrial transducers.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link to="/contact">
              <Button variant="primary" size="lg" className="font-bold shadow-xs">
                Request Architecture Consultation
              </Button>
            </Link>
            <Link to="/about">
              <Button variant="outline" size="lg" className="bg-transparent text-white border-[#2E436D] hover:bg-[#202E4C]">
                Explore Tech Stack
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
