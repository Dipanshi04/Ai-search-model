import { useState, useEffect } from 'react';
import RunnerDashboard from './pages/RunnerDashboard';
import RunnerHome from './pages/RunnerHome';
import LoginPage from './pages/LoginPage';
import PaymentPendingPage from './pages/PaymentPendingPage';
import { api } from './lib/api';
import { installBackTrap } from './lib/backStack';
import logo from './components/logo-dark.png';

interface ParticipantInfo {
  participantId: string;
  token: string;
  bibNumber: string;
  category: string;
  eventId: string;
  status: string;
  paymentStatus: string;
  isPremiumCompany: boolean;
}

export default function App() {
  const [participant, setParticipant] = useState<ParticipantInfo | null>(null);
  const [raceStarted, setRaceStarted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), 2200);
    checkAuth();
    return () => clearTimeout(timer);
  }, []);

  // Past login, the hardware back button should navigate within the runner
  // app (closing whatever overlay is open) rather than escaping out to
  // whatever page linked here — see lib/backStack.ts.
  useEffect(() => {
    if (participant) installBackTrap();
  }, [participant]);

  async function checkAuth() {
    const token = localStorage.getItem('runner_token');
    if (token) {
      api.setToken(token);
      const res = await api.getMe();
      if (res.success && res.data?.participants?.length > 0) {
        const p = res.data.participants[0];
        setParticipant({
          participantId: p.id,
          token,
          bibNumber: p.bibNumber,
          category: p.category,
          eventId: p.eventId,
          status: p.status,
          paymentStatus: p.paymentStatus,
          isPremiumCompany: p.company?.status === 'PREMIUM',
        });
        // Already RUNNING or PAUSED server-side (tracking started before
        // this page loaded) — skip the "START RACE" gate entirely instead
        // of making them tap Start again after every refresh/reload.
        if (p.status === 'RUNNING' || p.status === 'PAUSED') {
          setRaceStarted(true);
        }
      } else {
        api.clearToken();
      }
    }
    setLoading(false);
  }

  if (!splashDone || loading) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f4f8',
        flexDirection: 'column',
        gap: '32px',
      }}>
        <img
          src={logo}
          alt="ISA Marathon"
          style={{ height: '140px', width: 'auto', maxWidth: '300px', objectFit: 'contain', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))' }}
        />
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid rgba(16,185,129,0.2)',
          borderTopColor: '#059669',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!participant) {
    return <LoginPage onLogin={() => checkAuth()} />;
  }

  // Registered but never completed (or abandoned) checkout — block
  // everything else until payment actually goes through. Without this, a
  // runner could log in with their PIN and reach the full app, including
  // starting live GPS tracking, without ever having paid.
  if (participant.paymentStatus !== 'COMPLETED') {
    return (
      <PaymentPendingPage
        participantId={participant.participantId}
        bibNumber={participant.bibNumber}
        category={participant.category}
        isPremiumCompany={participant.isPremiumCompany}
        onPaid={() => checkAuth()}
        onLogout={() => { api.clearToken(); setParticipant(null); }}
      />
    );
  }

  if (!raceStarted) {
    return (
      <RunnerHome
        bibNumber={participant.bibNumber}
        category={participant.category}
        onStart={() => setRaceStarted(true)}
      />
    );
  }

  return (
    <RunnerDashboard
      participantId={participant.participantId}
      token={participant.token}
      bibNumber={participant.bibNumber}
      category={participant.category}
      eventId={participant.eventId}
      onHome={() => setRaceStarted(false)}
    />
  );
}
