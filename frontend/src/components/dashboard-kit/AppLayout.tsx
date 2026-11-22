import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { DashboardSidebar } from './DashboardSidebar';
import { AppHeader } from './AppHeader';
import { useAuth } from '../../context/AuthContext';

export const AppLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Authentication Boundary Guard
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
