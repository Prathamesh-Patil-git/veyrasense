import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Activity,
  Network,
  AlertTriangle,
  Cpu,
  Database,
  Zap,
  GitCompare,
  ShieldCheck,
  Sparkles,
  BarChart3,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { VeyraLogo } from '../common/VeyraLogo';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeAlert?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export interface DashboardSidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileDrawer?: boolean;
  onCloseMobileDrawer?: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  collapsed = false,
  onToggleCollapse,
  isMobileDrawer = false,
  onCloseMobileDrawer,
}) => {
  const location = useLocation();

  const navGroups: NavGroup[] = [
    {
      title: 'Operational Surveillance',
      items: [
        { to: '/app/overview', label: 'Overview', icon: LayoutDashboard },
        { to: '/app/departments', label: 'Departments', icon: Building2 },
        { to: '/app/monitoring', label: 'Sensor Monitoring', icon: Activity, badge: '16' },
        { to: '/app/map', label: 'Sensor Network Map', icon: Network },
      ],
    },
    {
      title: 'Diagnostics & Recovery',
      items: [
        { to: '/app/investigations', label: 'Alerts & Investigations', icon: AlertTriangle, badge: '2', badgeAlert: true },
        { to: '/app/devices', label: 'Device Management', icon: Cpu },
        { to: '/app/data-explorer', label: 'Data Explorer', icon: Database },
        { to: '/app/challenges', label: 'Physical Challenges', icon: Zap },
        { to: '/app/recovery', label: 'Recovery & Validation', icon: GitCompare },
        { to: '/app/trusted-data', label: 'Trusted Data', icon: ShieldCheck },
      ],
    },
    {
      title: 'Intelligence & Gateway',
      items: [
        { to: '/app/ml', label: 'ML Model Management', icon: Sparkles },
        { to: '/app/analytics', label: 'Analytics & Reports', icon: BarChart3 },
        { to: '/app/audit', label: 'Audit Logs', icon: FileText },
        { to: '/app/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside
      className={`bg-[#172238] text-slate-200 flex flex-col justify-between h-full transition-all duration-300 shadow-2xl select-none relative z-30 ${
        collapsed && !isMobileDrawer ? 'w-20' : 'w-64 sm:w-72'
      }`}
    >
      {/* Header with Logo & Drawer / Collapse Toggle */}
      <div className="p-4 border-b border-[#22314E] flex items-center justify-between">
        <VeyraLogo
          variant="light"
          size={collapsed && !isMobileDrawer ? 'sm' : 'md'}
          showTagline={!collapsed || isMobileDrawer}
        />

        {isMobileDrawer ? (
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#202E4C] transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        ) : onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-[#202E4C] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        ) : null}
      </div>

      {/* Navigation Groups List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-1">
            {(!collapsed || isMobileDrawer) && (
              <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.title}
              </div>
            )}
            <nav className="space-y-1" aria-label={group.title}>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => {
                      if (isMobileDrawer && onCloseMobileDrawer) {
                        onCloseMobileDrawer();
                      }
                    }}
                    title={collapsed && !isMobileDrawer ? item.label : undefined}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-bold transition-all duration-150 ${
                      isActive
                        ? 'clay-btn-primary shadow-[0_4px_14px_rgba(255,210,28,0.35),inset_0_1px_1px_rgba(255,255,255,0.7)]'
                        : 'text-slate-300 hover:text-white hover:bg-[#202E4C]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-[#172238]' : 'text-slate-400'
                        }`}
                      />
                      {(!collapsed || isMobileDrawer) && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </div>

                    {(!collapsed || isMobileDrawer) && item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-black flex items-center gap-1 ${
                          isActive
                            ? 'bg-[#172238] text-[#FFD21C]'
                            : item.badgeAlert
                            ? 'bg-[#EF6461] text-white shadow-2xs'
                            : 'bg-[#263756] text-slate-200'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Edge Gateway Hardware Badge */}
      {(!collapsed || isMobileDrawer) && (
        <div className="p-4 mx-3 mb-4 rounded-2xl bg-[#1F2C46] shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] text-xs space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#78E9AD] animate-pulse" />
              <span>Target Hardware</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">v0.3.1</span>
          </div>
          <div className="text-[11px] text-slate-200 font-bold">
            Raspberry Pi 5 (4GB / 64GB)
          </div>
          <div className="text-[10px] text-[#FFD21C] font-mono">
            Mosquitto MQTT • SQLite WAL
          </div>
        </div>
      )}
    </aside>
  );
};
