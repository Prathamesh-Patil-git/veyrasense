import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { AppHeader } from './AppHeader';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle } from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Authentication Boundary Guard (Demo mode redirects or blocks if logged out)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F7F7F0] text-[#172238] font-sans">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:flex h-full shrink-0">
        <DashboardSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-xs flex">
          <div className="h-full w-72 max-w-[85vw] shadow-2xl animate-in slide-in-from-left duration-200">
            <DashboardSidebar
              isMobileDrawer
              onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
            />
          </div>
          <div
            className="flex-1"
            onClick={() => setMobileDrawerOpen(false)}
            aria-label="Dismiss sidebar"
          />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Development / Demo Mode Notice Bar */}
        <div className="bg-[#FFF6C9] px-4 py-2 flex items-center justify-between text-xs text-[#875B00] font-semibold shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#875B00]" />
            <span>
              <strong>DEVELOPMENT / DEMO MODE:</strong> Target: Raspberry Pi 5 (4GB RAM / 64GB SSD). Centralized mock data is active until FastAPI & Mosquitto endpoints are bound.
            </span>
          </div>
          <span className="hidden sm:inline-block text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-white/90 text-[#172238] shadow-2xs">
            Status: UI Prototype (Simulated Data)
          </span>
        </div>

        <AppHeader onOpenMobileDrawer={() => setMobileDrawerOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-thin">
          <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
