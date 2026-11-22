import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';
import { VeyraLogo } from './VeyraLogo';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#172238] text-slate-300 border-t border-[#263756] mt-24">
      {/* Top Banner inside footer */}
      <div className="border-b border-[#263756]/80 py-8 bg-[#131D31]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#1E2D4A] border border-[#2E436D] text-[#78E9AD]">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span>VeyraSense Edge Telemetry Engine</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#78E9AD]/20 text-[#78E9AD] border border-[#78E9AD]/30">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Lightweight local anomaly detection & physical validation for edge gateways.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#1A263E] px-3.5 py-1.5 rounded-xl border border-[#263756]">
            <span className="w-2 h-2 rounded-full bg-[#5BA4F5]" />
            <span>Mosquitto MQTT 1883 • SQLite Synced • Local Loop Safe</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <VeyraLogo variant="light" size="lg" showTagline />
            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              "Trust every measurement. Understand every anomaly. Recover with evidence."
            </p>
            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              An intelligent, sensor-agnostic reliability platform designed for harsh industrial IoT environments. Detecting silent degradation, issuing physical challenge-response tests, and synthesizing verified data recovery.
            </p>
          </div>

          {/* Quick Links: Platform */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFD21C] mb-4">
              Platform
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  IoT Sensor Monitoring
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  Fault Diagnosis
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  Challenge–Response
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  Temporal Recovery
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-white transition-colors">
                  Edge Deployment
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links: Sensor Types */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFD21C] mb-4">
              Sensor Focus
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#78E9AD]" />
                <span>Ultrasonic Level & Flow</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#78E9AD]" />
                <span>Gas & Environmental</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5BA4F5]" />
                <span>Magnetic Reed & Cover</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5BA4F5]" />
                <span>Vibration & Accelerometer</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFD21C]" />
                <span>Thermal & Pressure</span>
              </li>
            </ul>
          </div>

          {/* Quick Links: System & About */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#FFD21C] mb-4">
              Resources
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Research Motivation
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Architecture Overview
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Deployment Inquiry
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-white transition-colors">
                  Admin Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-white transition-colors">
                  Access Portal
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="mt-12 pt-8 border-t border-[#263756] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div>
            © {new Date().getFullYear()} VeyraSense. Course Project & Industrial IoT Sensor Research Platform.
          </div>
          <div className="flex items-center gap-6">
            <span className="text-slate-400">
              Designed with warm ivory & industrial gold visual architecture.
            </span>
            <span className="text-[#78E9AD] font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#78E9AD]" />
              Edge Core v1.0-alpha
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
