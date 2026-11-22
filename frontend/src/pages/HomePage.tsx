import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2,
  Server,
  Zap,
  GitCompare,
  Sliders,
  Radio,
  Gauge,
  Search,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/dashboard-kit/StatusBadge';
import { MetricCard } from '../components/dashboard-kit/MetricCard';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-20 sm:space-y-28">
      {/* =========================================================
          HERO SECTION
          ========================================================= */}
      <section className="relative pt-6 sm:pt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Pale-yellow clay banner treatment */}
          <div className="relative rounded-[36px] clay-yellow-banner p-6 sm:p-10 lg:p-14 overflow-hidden">
            {/* Subtle decorative radial accents */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFEFA8]/60 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-80 h-80 bg-[#FFFAD9] rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              {/* Hero Left Content */}
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/95 shadow-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#78E9AD] animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[#172238]">
                    Sensor Reliability Platform
                  </span>
                  <span className="text-xs text-[#718096]">•</span>
                  <span className="text-xs font-medium text-[#718096]">Edge Ready</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#172238] tracking-tight leading-[1.12]">
                  Make Every Sensor Measurement{' '}
                  <span className="relative inline-block">
                    <span className="relative z-10 text-[#172238]">Trustworthy</span>
                    <span className="absolute bottom-1.5 left-0 w-full h-3.5 bg-[#FFD21C] -z-0 rounded-sm opacity-80" />
                  </span>
                  .
                </h1>

                <p className="text-base sm:text-lg text-[#172238]/85 leading-relaxed max-w-2xl font-normal">
                  Monitor connected devices, investigate suspicious measurements and recover sensor data through intelligent, evidence-based analysis.
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link to="/register">
                    <Button
                      variant="primary"
                      size="lg"
                      className="font-bold shadow-md"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      Get Started
                    </Button>
                  </Link>

                  <Link to="/services">
                    <Button
                      variant="secondary"
                      size="lg"
                      className="font-bold"
                      leftIcon={<Layers className="w-4 h-4" />}
                    >
                      Explore Platform
                    </Button>
                  </Link>
                </div>

                {/* Key Architectural Highlights */}
                <div className="pt-4 border-t border-[#E8DC96]/60 grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#718096]">
                      Architecture
                    </div>
                    <div className="text-sm font-bold text-[#172238] mt-0.5">
                      Edge-Native
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#718096]">
                      Validation
                    </div>
                    <div className="text-sm font-bold text-[#172238] mt-0.5">
                      Physical Challenge
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#718096]">
                      Recovery
                    </div>
                    <div className="text-sm font-bold text-[#172238] mt-0.5">
                      Dual-Engine
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero Right Visuals */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Outer Frame with claymorphic depth */}
                  <div className="relative rounded-[32px] overflow-hidden clay-surface p-3 shadow-xl">
                    <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-slate-900">
                      <img
                        src="/assets/images/hero-sensor-iot.png"
                        alt="VeyraSense Industrial Sensor Reliability Deployment"
                        className="w-full h-full object-cover object-center"
                        loading="eager"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#172238]/80 via-transparent to-transparent pointer-events-none" />

                      {/* Overlay node status badge */}
                      <div className="absolute top-3.5 left-3.5">
                        <StatusBadge status="online" label="Simulated Node VS-01" size="sm" />
                      </div>

                      {/* Live Telemetry metric card inside image */}
                      <div className="absolute bottom-3.5 left-3.5 right-3.5 p-3 rounded-2xl bg-white/95 backdrop-blur-md flex items-center justify-between shadow-sm">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-[#718096]">
                            Measurement Fidelity (Simulated)
                          </div>
                          <div className="text-sm font-extrabold text-[#172238] flex items-center gap-1.5">
                            <span>Ultrasonic Flow Node</span>
                            <span className="text-[11px] font-bold text-[#0C5A37] bg-[#E8FAF1] px-2 py-0.5 rounded-full">
                              99.4%
                            </span>
                          </div>
                        </div>
                        <div className="p-2 rounded-xl bg-[#FFF6C9] text-[#172238]">
                          <Activity className="w-4 h-4 text-[#172238]" />
                        </div>
                      </div>
                    </div>

                    {/* Decorative Data Visualization Well below image */}
                    <div className="mt-3 p-3.5 rounded-2xl clay-recessed grid grid-cols-2 gap-3 text-left">
                      <div className="bg-white p-2.5 rounded-xl shadow-2xs">
                        <div className="text-[10px] uppercase font-bold text-[#718096]">
                          Drift Detection
                        </div>
                        <div className="text-xs font-bold text-[#172238] flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#78E9AD]" />
                          <span>0.04% (Simulated)</span>
                        </div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl shadow-2xs">
                        <div className="text-[10px] uppercase font-bold text-[#718096]">
                          Physical Probe
                        </div>
                        <div className="text-xs font-bold text-[#172238] flex items-center gap-1 mt-0.5">
                          <span className="w-2 h-2 rounded-full bg-[#5BA4F5]" />
                          <span>Simulated Protocol</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Soft floating decorative shape */}
                  <div className="hidden sm:block absolute -bottom-5 -right-5 p-3.5 clay-surface shadow-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#FFD21C]" />
                      <span className="text-xs font-bold text-[#172238]">Zero Cloud Lock-in</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 1: PLATFORM OVERVIEW
          ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF6C9] text-[#172238] text-xs font-bold uppercase tracking-wider mb-3 shadow-2xs">
            Core Philosophy
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#172238] tracking-tight">
            Sensors Fail Silently. VeyraSense Catches What Telemetry Misses.
          </h2>
          <p className="mt-3.5 text-sm sm:text-base text-[#718096] leading-relaxed">
            Standard IoT platforms assume raw telemetry is accurate until catastrophic failure. VeyraSense treats every measurement as a hypothesis, actively interrogating anomalies with physical principles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="clay-surface-interactive p-6 sm:p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF6C9] flex items-center justify-center text-[#172238] mb-5 shadow-2xs">
              <Search className="w-6 h-6 text-[#172238]" />
            </div>
            <h3 className="text-lg font-bold text-[#172238] mb-2">
              Investigate Every Discrepancy
            </h3>
            <p className="text-xs sm:text-sm text-[#718096] leading-relaxed">
              Drift, bias, freezing, and environmental shocks are classified through continuous residual analysis rather than simple static thresholding.
            </p>
          </div>

          <div className="clay-surface-interactive p-6 sm:p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#E8FAF1] flex items-center justify-center text-[#0C5A37] mb-5 shadow-2xs">
              <ShieldCheck className="w-6 h-6 text-[#0C5A37]" />
            </div>
            <h3 className="text-lg font-bold text-[#172238] mb-2">
              Physical Challenge–Response
            </h3>
            <p className="text-xs sm:text-sm text-[#718096] leading-relaxed">
              When suspicious data appears, the platform triggers non-destructive physical stimulus signals to verify whether the transducer is responding correctly.
            </p>
          </div>

          <div className="clay-surface-interactive p-6 sm:p-8">
            <div className="w-12 h-12 rounded-2xl bg-[#EBF4FE] flex items-center justify-center text-[#134685] mb-5 shadow-2xs">
              <GitCompare className="w-6 h-6 text-[#134685]" />
            </div>
            <h3 className="text-lg font-bold text-[#172238] mb-2">
              Dual-Engine Data Recovery
            </h3>
            <p className="text-xs sm:text-sm text-[#718096] leading-relaxed">
              Synthesize missing or corrupted readings by coupling temporal predictive autoregression with spatial correlations from neighbouring verified sensor nodes.
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 2: SENSOR MONITORING & METRICS PREVIEW
          ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="clay-surface p-6 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#718096] mb-2">
                <Radio className="w-4 h-4 text-[#5BA4F5]" />
                Live Ingestion Stream
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#172238] tracking-tight">
                Continuous Telemetry Surveillance
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-[#FFF9DE] text-[#875B00] shadow-2xs">
                Simulated Preview
              </span>
              <StatusBadge status="communicating" label="Target: Mosquitto MQTT" />
              <StatusBadge status="online" label="Sampling: 100ms (Simulated)" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Flow Transducer #1"
              value="42.8"
              unit="L/min"
              change="+1.2%"
              changeType="positive"
              timeframe="vs 1h rolling avg"
              accent="mint"
              badge={<StatusBadge status="online" label="Verified" size="sm" />}
            />
            <MetricCard
              label="Ultrasonic Level"
              value="18.4"
              unit="cm"
              change="Stable"
              changeType="neutral"
              timeframe="within bounds"
              accent="yellow"
              badge={<StatusBadge status="calibrating" label="Compensating" size="sm" />}
            />
            <MetricCard
              label="Gas MQ-135 Sensor"
              value="142"
              unit="ppm"
              change="-3.8%"
              changeType="positive"
              timeframe="baseline clear"
              accent="blue"
              badge={<StatusBadge status="online" label="Clean" size="sm" />}
            />
            <MetricCard
              label="Vibration Accel"
              value="0.14"
              unit="g"
              change="+0.02g"
              changeType="neutral"
              timeframe="normal motor hum"
              accent="slate"
              badge={<StatusBadge status="healthy" label="Nominal" size="sm" />}
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 3: EVIDENCE-BASED DIAGNOSIS & CHALLENGE-RESPONSE
          ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF6C9] text-[#172238] text-xs font-bold uppercase tracking-wider shadow-2xs">
              Diagnose With Ground Truth
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#172238] tracking-tight">
              Distinguish True External Events From Sensor Faults.
            </h2>
            <p className="text-sm sm:text-base text-[#718096] leading-relaxed">
              When a water level sensor spikes suddenly, is there a flash flood or did debris block the ultrasonic acoustic path? Traditional rule engines trigger expensive false emergency dispatches.
            </p>
            <p className="text-sm sm:text-base text-[#718096] leading-relaxed">
              VeyraSense correlates physical challenge-response routines: testing transducer acoustic impedance, comparing downstream hydrostatic changes, and evaluating neighbouring node states before asserting an alarm.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-4 rounded-2xl clay-surface">
                <div className="p-2 rounded-xl bg-[#E8FAF1] text-[#0C5A37] shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#172238] uppercase tracking-wide">
                    Zero Hallucinated Recovery
                  </h4>
                  <p className="text-xs text-[#718096] mt-0.5">
                    Recovered data points are tagged with explicit mathematical provenance and validation confidence intervals.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl clay-surface">
                <div className="p-2 rounded-xl bg-[#FFF6C9] text-[#875B00] shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#172238] uppercase tracking-wide">
                    Controlled Hardware Challenge
                  </h4>
                  <p className="text-xs text-[#718096] mt-0.5">
                    Microcontroller triggers micro-current pulses or resonant checks to confirm physical circuit continuity and transducer diaphragm health.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="clay-dark p-6 sm:p-8 relative overflow-hidden text-white">
              <div className="flex items-center justify-between pb-4 border-b border-[#263756] mb-6">
                <div className="flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-[#FFD21C]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Diagnostic Decision Engine
                  </span>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#263756] text-slate-300">
                  Real-Time Pipeline
                </span>
              </div>

              {/* Step Flow */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-[#1F2C46] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>1. Telemetry Anomaly Detected</span>
                    <span className="text-[#EF6461] font-bold">Residual &gt; 3.2σ</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sensor JSN-SR04T reported sudden 80% distance drop without hydraulic precursor.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#1F2C46] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>2. Physical Probe Interrogation</span>
                    <span className="text-[#FFD21C] font-bold">Challenge Executed</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Secondary echo pulse returned no acoustic damping. Sensor transducer confirmed mechanically healthy; surface obstruction diagnosed.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#1F2C46] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>3. Spatial Evidence Synthesis</span>
                    <span className="text-[#78E9AD] font-bold">Verified Recovery</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Synthesized 18.2 cm water level via neighbour Node-02 correlation and temporal autoregression model.
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#263756] flex items-center justify-between text-xs">
                <span className="text-slate-400">Diagnosis Latency: &lt; 42ms</span>
                <span className="text-[#78E9AD] font-semibold">100% Deterministic Evidence</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 4: SUPPORTED SENSOR CATEGORIES
          ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF6C9] text-[#172238] text-xs font-bold uppercase tracking-wider mb-3 shadow-2xs">
            Hardware Agnostic
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#172238] tracking-tight">
            Supported Sensor Categories
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#718096]">
            Engineered to interface with industrial standards: I2C, SPI, UART, analog 4-20mA, Modbus, and digital pulse counters.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="clay-surface-interactive p-6">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF6C9] flex items-center justify-center text-[#172238] mb-4 shadow-2xs">
              <Gauge className="w-5 h-5 text-[#172238]" />
            </div>
            <h3 className="text-base font-bold text-[#172238] mb-1.5">
              Level & Flow
            </h3>
            <p className="text-xs text-[#718096] mb-3">
              Ultrasonic (JSN-SR04T), hydrostatic pressure, optical time-of-flight, and hall-effect pulse flow meters (YF-S201).
            </p>
            <div className="text-[11px] font-semibold text-[#172238] bg-[#F7F7F0] px-2.5 py-1 rounded-lg">
              Acoustic echo verification
            </div>
          </div>

          <div className="clay-surface-interactive p-6">
            <div className="w-10 h-10 rounded-2xl bg-[#E8FAF1] flex items-center justify-center text-[#0C5A37] mb-4 shadow-2xs">
              <Activity className="w-5 h-5 text-[#0C5A37]" />
            </div>
            <h3 className="text-base font-bold text-[#172238] mb-1.5">
              Environmental & Gas
            </h3>
            <p className="text-xs text-[#718096] mb-3">
              Electrochemical & metal oxide gas sensors (MQ-135, MQ-4), BME280 barometric humidity, and ambient temperature probes.
            </p>
            <div className="text-[11px] font-semibold text-[#0C5A37] bg-[#E8FAF1] px-2.5 py-1 rounded-lg">
              Baseline drift calibration
            </div>
          </div>

          <div className="clay-surface-interactive p-6">
            <div className="w-10 h-10 rounded-2xl bg-[#EBF4FE] flex items-center justify-center text-[#134685] mb-4 shadow-2xs">
              <Cpu className="w-5 h-5 text-[#134685]" />
            </div>
            <h3 className="text-base font-bold text-[#172238] mb-1.5">
              Mechanical & Structural
            </h3>
            <p className="text-xs text-[#718096] mb-3">
              Magnetic reed switches, tilt switches, 3-axis accelerometers (MPU6050, ADXL345), and structural strain gauges.
            </p>
            <div className="text-[11px] font-semibold text-[#134685] bg-[#EBF4FE] px-2.5 py-1 rounded-lg">
              Vibration profile mapping
            </div>
          </div>

          <div className="clay-surface-interactive p-6">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF6C9] flex items-center justify-center text-[#172238] mb-4 shadow-2xs">
              <Sliders className="w-5 h-5 text-[#172238]" />
            </div>
            <h3 className="text-base font-bold text-[#172238] mb-1.5">
              Thermal & Electrical
            </h3>
            <p className="text-xs text-[#718096] mb-3">
              Thermocouples (MAX6675, DS18B20), current transducers (ACS712), and DC solar/battery voltage monitors.
            </p>
            <div className="text-[11px] font-semibold text-[#172238] bg-[#F7F7F0] px-2.5 py-1 rounded-lg">
              Joule thermal tracking
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 5: HOW THE PLATFORM WORKS (4 STAGES)
          ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[36px] clay-dark text-white p-8 sm:p-12 lg:p-16">
          <div className="max-w-3xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#263756] text-[#FFD21C] text-xs font-bold uppercase tracking-wider mb-3">
              Execution Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              The 4-Stage Reliability Cycle
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300">
              Deterministic, evidence-based steps execute continuously at the local edge host without reliance on remote cloud servers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#1E2D4A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] relative">
              <div className="text-3xl font-black text-[#FFD21C] mb-3">01</div>
              <h3 className="text-base font-bold text-white mb-2">
                Ingest & Normalise
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Raw packets stream via MQTT from microcontrollers (ESP32/ESP8266/LoRa). Timestamps, sampling intervals, and variance bounds are normalized immediately.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1E2D4A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] relative">
              <div className="text-3xl font-black text-[#78E9AD] mb-3">02</div>
              <h3 className="text-base font-bold text-white mb-2">
                Detect & Classify
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Residual statistical models and lightweight edge ML classifiers isolate drift, sudden bias, packet dropouts, and flatline frozen readings.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1E2D4A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] relative">
              <div className="text-3xl font-black text-[#5BA4F5] mb-3">03</div>
              <h3 className="text-base font-bold text-white mb-2">
                Challenge Probe
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Platform sends test stimulus (sensor ping, excitation pulses, cross-pin verification) to confirm whether transducer physical response matches electrical response.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#1E2D4A] shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] relative">
              <div className="text-3xl font-black text-white mb-3">04</div>
              <h3 className="text-base font-bold text-white mb-2">
                Recover & Validate
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Temporal prediction models and spatial neighbour correlations synthesize the corrected measurement with a mathematical confidence envelope.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 6: LOCAL EDGE COMPUTING ADVANTAGE
          ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="p-6 sm:p-8 rounded-[32px] clay-surface space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[#FFF6C9] text-[#172238] shadow-2xs">
                  <Server className="w-6 h-6 text-[#172238]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#172238] uppercase tracking-wide">
                    Raspberry Pi 5 / Edge Gateway
                  </h3>
                  <p className="text-xs text-[#718096]">BCM2712 Quad-Core ARM • 4GB RAM • 64GB Storage</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl clay-recessed">
                  <span className="font-semibold text-[#172238]">MQTT Broker</span>
                  <span className="text-[#0C5A37] font-bold">Mosquitto (Local Port 1883)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl clay-recessed">
                  <span className="font-semibold text-[#172238]">Telemetry Ingestion</span>
                  <span className="text-[#0C5A37] font-bold">FastAPI Async Engine</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl clay-recessed">
                  <span className="font-semibold text-[#172238]">Local Persistence</span>
                  <span className="text-[#0C5A37] font-bold">SQLite Timeseries (WAL)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl clay-recessed">
                  <span className="font-semibold text-[#172238]">Cloud Dependency</span>
                  <span className="text-[#134685] font-bold">Zero (Air-Gapped Ready)</span>
                </div>
              </div>

              <div className="pt-2 text-center">
                <StatusBadge status="healthy" label="Target Architecture: Autonomous Offline Execution" />
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF6C9] text-[#172238] text-xs font-bold uppercase tracking-wider shadow-2xs">
              Rugged Architecture
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#172238] tracking-tight">
              Designed for Severe Industrial Environments
            </h2>
            <p className="text-sm sm:text-base text-[#718096] leading-relaxed">
              Industrial facilities cannot pause operations when internet connections drop. Remote cloud-only anomaly analysis adds round-trip latency, high bandwidth costs, and single-point-of-failure vulnerabilities.
            </p>
            <p className="text-sm sm:text-base text-[#718096] leading-relaxed">
              VeyraSense is engineered from the ground up for edge micro-servers. Even in complete network isolation, sensor fault isolation, local challenge probes, and temporal recovery run uninterrupted at wire speed.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link to="/about">
                <Button variant="secondary" size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Read Research Foundation
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" size="md">
                  View Edge Deployment Specs
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SECTION 7: FINAL CTA BANNER
          ========================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-[36px] clay-yellow-banner p-8 sm:p-12 lg:p-16 overflow-hidden text-center">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-[#172238] text-xs font-bold uppercase tracking-wider shadow-2xs">
              VeyraSense Platform
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#172238] tracking-tight">
              Ready to Secure Your Industrial Sensor Infrastructure?
            </h2>

            <p className="text-sm sm:text-base text-[#172238]/80 max-w-xl mx-auto leading-relaxed">
              Experience deterministic evidence-based sensor monitoring. Inspect the open architectural specifications or request deployment guidelines for your hardware fleet.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link to="/register">
                <Button variant="primary" size="lg" className="font-bold shadow-md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Create Edge Account
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="font-semibold bg-white">
                  Contact Deployment Engineers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
