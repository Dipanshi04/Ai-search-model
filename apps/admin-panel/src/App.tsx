import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EventsPage from './pages/EventsPage';
import ParticipantsPage from './pages/ParticipantsPage';
import CheckinPage from './pages/CheckinPage';
import RaceControlPage from './pages/RaceControlPage';
import RouteBuilderPage from './pages/RouteBuilderPage';
import LeaderboardPage from './pages/LeaderboardPage';
import GreenMissionPage from './pages/GreenMissionPage';
import CertificatesPage from './pages/CertificatesPage';
import AnalyticsPage from './pages/AnalyticsPage';
import CompaniesPage from './pages/CompaniesPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import SettingsPage from './pages/SettingsPage';
import BulkRegistrationPage from './pages/BulkRegistrationPage';

function HrPortalRedirect() {
  const h = window.location.hostname;
  const base = h === 'localhost'
    ? 'http://localhost:3000'
    : h === 'admin.theisa.in'
      ? 'https://marathon.theisa.in'
      : window.location.origin;
  window.location.replace(`${base}/hr-portal`);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/hr-portal" element={<HrPortalRedirect />} />
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="participants" element={<ParticipantsPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="bulk-registration" element={<BulkRegistrationPage />} />
        <Route path="checkin" element={<CheckinPage />} />
        <Route path="tracking" element={<RaceControlPage />} />
        <Route path="route-builder" element={<RouteBuilderPage />} />
        <Route path="leaderboard" element={<LeaderboardPage />} />
        <Route path="green" element={<GreenMissionPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="announcements" element={<AnnouncementsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
