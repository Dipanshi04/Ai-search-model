import { useState, useEffect } from 'react';
import RunnerDashboard from './pages/RunnerDashboard';
import LoginPage from './pages/LoginPage';
import { api } from './lib/api';

const Logo = ({ size = 'h-14', theme = 'dark' }: { size?: string; theme?: 'light' | 'dark' }) => (
  <img 
    src={theme === 'dark' ? '/logo-light.png' : '/logo-dark.png'} 
    alt="ISA Marathon" 
    className={`${size} w-auto max-w-[200px] object-contain drop-shadow-md mx-auto block`} 
  />
);

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
      <div className="min-h-screen min-h-[100dvh] flex items-center justify-center bg-[#0a0f1a]">
        <div className="flex flex-col items-center gap-3">
          <Logo size="h-8" />
          <div className="w-5 h-5 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
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