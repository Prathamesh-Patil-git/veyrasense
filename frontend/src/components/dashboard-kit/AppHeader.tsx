import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
} from 'lucide-react';
import { SearchBar } from './SearchBar';
import { DepartmentSelector } from './DepartmentSelector';
import { useAuth } from '../../context/AuthContext';

interface AppHeaderProps {
  onOpenMobileDrawer?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ onOpenMobileDrawer }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const pathToTitleMap: { [key: string]: { title: string; section: string } } = {
    '/app/overview': { title: 'Operations Console', section: 'Overview' },
    '/app/departments': { title: 'Department Fleet', section: 'Departments' },
    '/app/monitoring': { title: 'High-Frequency Sensor Monitoring', section: 'Monitoring' },
    '/app/map': { title: 'Topological Sensor Network Map', section: 'Network Map' },
    '/app/investigations': { title: 'Alerts & Fault Investigations', section: 'Investigations' },
    '/app/devices': { title: 'Edge Device Inventory', section: 'Devices' },
    '/app/data-explorer': { title: 'Telemetry Data Explorer', section: 'Data Explorer' },
    '/app/challenges': { title: 'Physical Challenge–Response Engine', section: 'Challenges' },
    '/app/recovery': { title: 'Temporal & Neighbour Recovery', section: 'Recovery' },
    '/app/trusted-data': { title: 'Cryptographically Verified Data', section: 'Trusted Data' },
    '/app/ml': { title: 'Edge ML Model Management', section: 'ML Models' },
    '/app/analytics': { title: 'Reliability Analytics & Reports', section: 'Analytics' },
    '/app/audit': { title: 'Immutable Decision Audit Logs', section: 'Audit' },
    '/app/settings': { title: 'Gateway System Settings', section: 'Settings' },
  };

  const currentRouteMeta = pathToTitleMap[location.pathname] || {
    title: 'Operations Console',
    section: 'Overview',
  };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F7F7F0]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Trigger + Breadcrumb & Title */}
        <div className="flex items-center gap-3">
          {onOpenMobileDrawer && (
            <button
              type="button"
              onClick={onOpenMobileDrawer}
              className="md:hidden p-2 rounded-2xl clay-surface-interactive text-[#172238] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD21C]"
              aria-label="Open sidebar menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#718096]">
              <Link to="/app/overview" className="hover:text-[#172238] transition-colors">
                VeyraSense
              </Link>
              <span>/</span>
              <span className="text-[#172238] font-bold">{currentRouteMeta.section}</span>
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-[#172238]">
              {currentRouteMeta.title}
            </h1>
          </div>
        </div>

        {/* Center: Search Bar & Department Selector */}
        <div className="hidden lg:flex items-center gap-3 flex-1 max-w-lg mx-4">
          <SearchBar placeholder="Search telemetry, nodes (e.g. NODE-PRD-01), alerts..." />
          <DepartmentSelector />
        </div>

        {/* Right: Status Pill + Actions + Admin Menu */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Local System Connection Status (Explicitly Demo) */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full clay-surface text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#5BA4F5] animate-pulse" />
            <div className="text-left text-[11px]">
              <span className="font-bold text-[#172238]">Simulated MQTT Broker</span>
              <span className="text-[#718096] hidden xl:inline"> (Demo Connection)</span>
            </div>
          </div>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={() => setIsDarkMode((prev) => !prev)}
            className="p-2.5 rounded-2xl clay-surface-interactive text-[#172238] transition-colors"
            title={isDarkMode ? 'Industrial Ivory Mode' : 'High-Contrast Dashboard Mode'}
            aria-label="Toggle visual theme"
          >
            {isDarkMode ? <Moon className="w-4 h-4 text-[#FFD21C]" /> : <Sun className="w-4 h-4 text-[#172238]" />}
          </button>

          {/* Notification Bell with Badge & Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative p-2.5 rounded-2xl clay-surface-interactive text-[#172238] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD21C]"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#EF6461]" />
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 clay-surface p-4 z-50 text-xs animate-in fade-in zoom-in-95 shadow-xl">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F2F3EE]">
                  <span className="font-bold text-[#172238]">System Alerts (Illustrative)</span>
                  <span className="text-[10px] font-bold text-[#875B00] bg-[#FFF9DE] px-2 py-0.5 rounded-full">
                    DEMO
                  </span>
                </div>
                <div className="space-y-2.5">
                  <div className="p-3 rounded-2xl bg-[#FDF0F0] flex items-start gap-2.5 shadow-2xs">
                    <AlertTriangle className="w-4 h-4 text-[#EF6461] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[#172238]">Surge in Motor Phase Current</div>
                      <div className="text-[11px] text-[#718096]">NODE-MNT-02 triggered 3.88σ residual test.</div>
                    </div>
                  </div>
                  <div className="p-3 rounded-2xl bg-[#E8FAF1] flex items-start gap-2.5 shadow-2xs">
                    <CheckCircle2 className="w-4 h-4 text-[#0C5A37] shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-[#172238]">Recovery Verified</div>
                      <div className="text-[11px] text-[#718096]">NODE-UTL-01 synthesized water level validated.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Administrator Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setProfileOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-full clay-surface-interactive focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD21C] transition-all"
              aria-expanded={profileOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 rounded-full bg-[#FFD21C] flex items-center justify-center font-black text-[#172238] text-xs shadow-2xs">
                OP
              </div>
              <div className="hidden md:block text-left text-xs leading-tight">
                <div className="font-bold text-[#172238]">Edge Operator</div>
                <div className="text-[10px] text-[#718096]">Pi 5 Admin</div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#718096] hidden sm:block" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 clay-surface p-3 z-50 text-xs animate-in fade-in zoom-in-95 shadow-xl">
                <div className="pb-2.5 mb-2 border-b border-[#F2F3EE] space-y-1">
                  <div className="font-bold text-[#172238]">{user.name}</div>
                  <div className="text-[11px] text-[#718096]">{user.email}</div>
                  <div className="text-[10px] text-[#0C5A37] font-semibold bg-[#E8FAF1] px-2 py-0.5 rounded-full inline-block">
                    {user.deploymentTarget}
                  </div>
                </div>

                <div className="space-y-1">
                  <Link
                    to="/app/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-[#172238] hover:bg-[#F7F7F0] transition-colors"
                  >
                    <HardDrive className="w-4 h-4 text-[#718096]" />
                    <span>System Settings</span>
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-[#EF6461] hover:bg-[#FDF0F0] font-semibold transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
