import { useState, useEffect } from 'react';
import RunnerDashboard from './pages/RunnerDashboard';
import LoginPage from './pages/LoginPage';
import { api } from './lib/api';

interface ParticipantInfo {
  participantId: string;
  token: string;
  bibNumber: string;
  category: string;
  eventId: string;
}

export default function App() {
  const [participant, setParticipant] = useState<ParticipantInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (!participant) {
    return <LoginPage onLogin={() => checkAuth()} />;
  }

  return (
    <RunnerDashboard
      participantId={participant.participantId}
      token={participant.token}
      bibNumber={participant.bibNumber}
      category={participant.category}
      eventId={participant.eventId}
    />
  );
}