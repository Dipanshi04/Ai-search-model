import { useState, useEffect } from 'react';
import RunnerDashboard from './pages/RunnerDashboard';
import RunnerHome from './pages/RunnerHome';
import LoginPage from './pages/LoginPage';
import { api } from './lib/api';
import logo from './components/logo-dark.png';

interface ParticipantInfo {
  participantId: string;
  token: string;
  bibNumber: string;
  category: string;
  eventId: string;
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
        });
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
