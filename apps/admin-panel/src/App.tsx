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
import AnalyticsPage from './pages/AnalyticsPage';
import CompaniesPage from './pages/CompaniesPage';
import SettingsPage from './pages/SettingsPage';
import CertificatesPage from './pages/CertificatesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
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
        <Route path="checkin" element={<CheckinPage />} />
        <Route path="tracking" element={<RaceControlPage />} />
        <Route path="route-builder" element={<RouteBuilderPage />} />
        <Route path="leaderboard" element={<div className="text-slate-400">Leaderboard - Coming Soon</div>} />
        <Route path="green" element={<div className="text-slate-400">Green Mission - Coming Soon</div>} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="companies" element={<CompaniesPage />} />
        <Route path="announcements" element={<div className="text-slate-400">Announcements - Coming Soon</div>} />
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
