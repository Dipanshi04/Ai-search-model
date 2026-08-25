import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import logoLight from '../components/logo-light.png';

const Logo = ({ size = 'h-20' }: { size?: string }) => (
  <div className="w-full flex justify-center">
    <img 
      src={logoLight} 
      alt="ISA Marathon" 
      className={`${size} w-auto max-w-[200px] object-contain drop-shadow-md`} 
    />
  </div>
);

interface RunnerDetails {
  name: string;
  email: string;
  phone: string;
  bibNumber: string;
  category: string;
  status: string;
}

interface Props {
  bibNumber: string;
  category: string;
  onStart: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  RUN_3K: '3K Fun Run',
  RUN_5K: '5K Challenge',
};

export default function RunnerHome({ bibNumber, category, onStart }: Props) {
  const [details, setDetails] = useState<RunnerDetails | null>(null);
  const [raceStatus, setRaceStatus] = useState<string>('UPCOMING');

  useEffect(() => {
    api.getMe().then((res) => {
      if (res.success && res.data) {
        setDetails({
          name: res.data.name,
          email: res.data.email,
          phone: res.data.phone,
          bibNumber: res.data.participants?.[0]?.bibNumber || bibNumber,
          category: res.data.participants?.[0]?.category || category,
          status: res.data.participants?.[0]?.status || 'REGISTERED',
        });
      }
    });

    api.getRaceStatus().then((res) => {
      if (res.success && res.data?.event) setRaceStatus(res.data.event.status);
    }).catch(() => {});
  }, [bibNumber, category]);

  const canStart = raceStatus === 'ACTIVE';

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '20px',
  };

  const label: React.CSSProperties = {
    fontSize: '11px',
    color: '#64748b',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    fontWeight: 600,
    marginBottom: '4px',
  };

  const value: React.CSSProperties = {
    fontSize: '12px',
    color: '#000',
    fontWeight: 600,
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-white)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', width: '100%' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>
          <div style={{ marginBottom: '24px' }}>
            <Logo size="h-14" />
          </div>

          {/* BIB Card */}
          <div style={{
            ...card,
            background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(255,255,255,0.03))',
            border: '1px solid rgba(16,185,129,0.3)',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '11px', color: '#6ee7b7', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
              Your Race BIB
            </p>
            <p style={{ fontSize: '44px', fontWeight: 900, color: '#10b981', letterSpacing: '0.05em', lineHeight: 1.1, fontFamily: 'monospace' }}>
              {details?.bibNumber || bibNumber}
            </p>
            <p style={{ fontSize: '15px', color: 'rgb(0 0 0)', fontWeight: 600, marginTop: '6px' }}>
              {details?.name || 'Runner'}
            </p>
          </div>

          {/* Details */}
          <div style={{ ...card, marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={label}>Category</p>
                <p style={value}>{CATEGORY_LABELS[details?.category || category] || category}</p>
              </div>
              <div>
                <p style={label}>Status</p>
                <p style={value}>{details?.status || 'REGISTERED'}</p>
              </div>
              <div>
                <p style={label}>Email</p>
                <p style={{ ...value, fontSize: '13px', wordBreak: 'break-all' }}>{details?.email || '—'}</p>
              </div>
              <div>
                <p style={label}>Phone</p>
                <p style={{ ...value, fontSize: '13px' }}>{details?.phone || '—'}</p>
              </div>
            </div>
          </div>

          {/* Race status hint */}
          {!canStart && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.3)',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '13px', color: '#fbbf24', fontWeight: 500 }}>
                {raceStatus === 'UPCOMING' ? 'Race has not started yet. Stay tuned!' :
                 raceStatus === 'PAUSED' ? 'Race is paused. Please wait.' :
                 raceStatus === 'COMPLETED' ? 'Race has finished.' : 'Waiting for race to start...'}
              </p>
            </div>
          )}

          {/* Start button */}
          <button
            onClick={onStart}
            style={{
              width: '100%',
              padding: '18px',
              color: '#fff',
              fontSize: '17px',
              fontWeight: 700,
              borderRadius: '14px',
              border: 'none',
              background: canStart ? '#10b981' : 'rgba(16,185,129)',
              cursor: canStart ? 'pointer' : 'not-allowed',
              boxShadow: canStart ? '0 8px 24px rgba(16,185,129,0.35)' : 'none',
              transition: 'transform 0.15s ease',
              letterSpacing: '0.02em',
            }}
            onMouseDown={(e) => { if (canStart) e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            START RACE
          </button>

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#475569', marginTop: '14px' }}>
            Make sure GPS is enabled before starting
          </p>
        </div>
      </div>
    </div>
  );
}
