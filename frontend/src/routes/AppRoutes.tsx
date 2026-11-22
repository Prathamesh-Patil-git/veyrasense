import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { Footer } from '../components/common/Footer';
import { HomePage } from '../pages/HomePage';
import { ServicesPage } from '../pages/ServicesPage';
import { AboutPage } from '../pages/AboutPage';
import { ContactPage } from '../pages/ContactPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';

// Authenticated Application Dashboard Layout & Pages
import { AppLayout } from '../components/dashboard-kit/AppLayout';
import { OverviewPage } from '../pages/app/OverviewPage';
import { DepartmentsPage } from '../pages/app/DepartmentsPage';
import { MonitoringPage } from '../pages/app/MonitoringPage';
import { MapPage } from '../pages/app/MapPage';
import { InvestigationsPage } from '../pages/app/InvestigationsPage';
import { DevicesPage } from '../pages/app/DevicesPage';
import { DataExplorerPage } from '../pages/app/DataExplorerPage';
import { ChallengesPage } from '../pages/app/ChallengesPage';
import { RecoveryPage } from '../pages/app/RecoveryPage';
import { TrustedDataPage } from '../pages/app/TrustedDataPage';
import { MLModelPage } from '../pages/app/MLModelPage';
import { AnalyticsPage } from '../pages/app/AnalyticsPage';
import { AuditPage } from '../pages/app/AuditPage';
import { SettingsPage } from '../pages/app/SettingsPage';

// Shared Public Website Layout
const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F7F7F0] flex flex-col justify-between selection:bg-[#FFD21C] selection:text-[#172238]">
      <div>
        <Navbar />
        <main className="pb-16">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* =========================================================
          1. PUBLIC WEBSITE ROUTES
          ========================================================= */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>

      {/* =========================================================
          2. AUTHENTICATION PAGES (SPLIT-SCREEN)
          ========================================================= */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* =========================================================
          3. AUTHENTICATED APPLICATION DASHBOARD (/app/*)
          ========================================================= */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="/app/overview" replace />} />
        <Route path="overview" element={<OverviewPage />} />
        <Route path="departments" element={<DepartmentsPage />} />
        <Route path="monitoring" element={<MonitoringPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="investigations" element={<InvestigationsPage />} />
        <Route path="devices" element={<DevicesPage />} />
        <Route path="data-explorer" element={<DataExplorerPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="recovery" element={<RecoveryPage />} />
        <Route path="trusted-data" element={<TrustedDataPage />} />
        <Route path="ml" element={<MLModelPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
