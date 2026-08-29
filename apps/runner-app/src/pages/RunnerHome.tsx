import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import logoDark from '../components/logo-dark.png';
import ProfilePage from './ProfilePage';
import MessagesPage from './MessagesPage';

interface RunnerDetails {
  name: string;
  email: string;
  phone: string;
  bibNumber: string;
  category: string;
  status: string;
  participantId: string;
  eventId: string;
  kitDistributed: boolean;
  certificateUrl: string | null;
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
  const [showProfile, setShowProfile] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [hasMessages, setHasMessages] = useState(false);
  const [certGenerating, setCertGenerating] = useState(false);
  const [certError, setCertError] = useState('');

  useEffect(() => {
    api.getMe().then((res) => {
      if (res.success && res.data) {
        const p = res.data.participants?.[0];
        setDetails({
          name: res.data.name,
          email: res.data.email,
          phone: res.data.phone,
          bibNumber: p?.bibNumber || bibNumber,
          category: p?.category || category,
          status: p?.status || 'REGISTERED',
          participantId: p?.id || '',
          eventId: p?.eventId || '',
          kitDistributed: p?.kitDistributed || false,
          certificateUrl: p?.certificateUrl || null,
        });
        if (p?.eventId) {
          api.getAnnouncements(p.eventId).then((mRes) => {
            if (mRes.success && mRes.data) setHasMessages(mRes.data.length > 0);
          }).catch(() => {});
        }
      }
    });

    api.getRaceStatus().then((res) => {
      if (res.success && res.data?.event) setRaceStatus(res.data.event.status);
    }).catch(() => {});
  }, [bibNumber, category]);

  const canStart = raceStatus === 'ACTIVE';

  const handleDownloadCertificate = async () => {
    if (!details?.participantId) return;
    setCertError('');
    if (details.certificateUrl) {
      window.open(`${import.meta.env.VITE_API_URL || ''}${details.certificateUrl}`, '_blank');
      return;
    }
    setCertGenerating(true);
    try {
      const res = await api.generateCertificate(details.participantId);
      if (res.success && res.data?.pdfUrl) {
        setDetails((d) => (d ? { ...d, certificateUrl: res.data!.pdfUrl } : d));
        window.open(`${import.meta.env.VITE_API_URL || ''}${res.data.pdfUrl}`, '_blank');
      } else {
        setCertError(res.message || 'Failed to generate certificate');
      }
    } catch {
      setCertError('Network error. Please try again.');
    }
    setCertGenerating(false);
  };

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#f0f4f8',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <button
        onClick={() => setShowMessages(true)}
        aria-label="Messages"
        style={{
          position: 'fixed',
          top: 'calc(16px + env(safe-area-inset-top))',
          right: '64px',
          zIndex: 20,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          transition: 'transform 0.1s',
          touchAction: 'manipulation',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasMessages && (
          <span style={{
            position: 'absolute', top: '6px', right: '6px',
            width: '9px', height: '9px', borderRadius: '50%',
            background: '#ef4444', border: '1.5px solid #fff',
          }} />
        )}
      </button>

      <button
        onClick={() => setShowProfile(true)}
        aria-label="Profile"
        style={{
          position: 'fixed',
          top: 'calc(16px + env(safe-area-inset-top))',
          right: '16px',
          zIndex: 20,
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#fff',
          border: '1.5px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          transition: 'transform 0.1s',
          touchAction: 'manipulation',
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
      </button>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}>
        {details && (details.kitDistributed || details.status === 'FINISHED') && (
          <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {details.kitDistributed && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '16px',
                padding: '14px 16px',
              }}>
                <span style={{ fontSize: '22px', lineHeight: 1 }}>🎁</span>
                <div>
                  <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400e', margin: 0 }}>Your kit is ready</p>
                  <p style={{ fontSize: '12px', color: '#b45309', margin: '1px 0 0' }}>Collect it from the kit distribution desk.</p>
                </div>
              </div>
            )}

            {details.status === 'FINISHED' && (
              <button
                onClick={handleDownloadCertificate}
                disabled={certGenerating}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left',
                  background: '#ecfdf5', border: '1.5px solid #a7f3d0', borderRadius: '16px',
                  padding: '14px 16px', cursor: certGenerating ? 'not-allowed' : 'pointer',
                  width: '100%', touchAction: 'manipulation',
                }}
              >
                <span style={{ fontSize: '22px', lineHeight: 1 }}>🏅</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13.5px', fontWeight: 700, color: '#065f46', margin: 0 }}>
                    {certGenerating ? 'Preparing your certificate…' : 'Your certificate is ready'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#059669', margin: '1px 0 0' }}>
                    {certGenerating ? 'This takes a few seconds' : 'Tap to download'}
                  </p>
                </div>
              </button>
            )}

            {certError && (
              <p style={{ fontSize: '12px', color: '#dc2626', textAlign: 'center', margin: 0 }}>{certError}</p>
            )}
          </div>
        )}

        <div style={{
          width: '100%',
          maxWidth: '380px',
          background: '#fff',
          borderRadius: '24px',
          padding: '40px 28px 32px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <img
              src={logoDark}
              alt="ISA Marathon"
              style={{ height: '72px', width: 'auto', maxWidth: '260px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
            />
          </div>

          <h2 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: '#1e293b',
            textAlign: 'center',
            marginBottom: '28px',
          }}>
            Runner Dashboard
          </h2>

          {/* BIB Card */}
          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)',
            border: '1.5px solid #a7f3d0',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '11px',
              color: '#059669',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: '6px',
            }}>
              Your Race BIB
            </p>
            <p style={{
              fontSize: '48px',
              fontWeight: 900,
              color: '#10b981',
              letterSpacing: '0.05em',
              lineHeight: 1.1,
              fontFamily: 'monospace',
              margin: 0,
            }}>
              {details?.bibNumber || bibNumber}
            </p>
            <p style={{
              fontSize: '16px',
              color: '#1e293b',
              fontWeight: 600,
              margin: 0,
              marginTop: '8px',
            }}>
              {details?.name || 'Runner'}
            </p>
          </div>

          {/* Details Grid */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p style={{
                  fontSize: '11px',
                  color: '#64748b',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}>Category</p>
                <p style={{
                  fontSize: '14px',
                  color: '#1e293b',
                  fontWeight: 600,
                  margin: 0,
                }}>{CATEGORY_LABELS[details?.category || category] || category}</p>
              </div>
              <div>
                <p style={{
                  fontSize: '11px',
                  color: '#64748b',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}>Status</p>
                <p style={{
                  fontSize: '14px',
                  color: details?.status === 'RUNNING' ? '#10b981' : '#1e293b',
                  fontWeight: 600,
                  margin: 0,
                }}>{details?.status || 'REGISTERED'}</p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{
                  fontSize: '11px',
                  color: '#64748b',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}>Email</p>
                <p style={{
                  fontSize: '13px',
                  color: '#1e293b',
                  fontWeight: 500,
                  wordBreak: 'break-all',
                  margin: 0,
                }}>{details?.email || '—'}</p>
              </div>
            </div>
          </div>

          {/* Race status hint */}
          {!canStart && (
            <div style={{
              padding: '14px 16px',
              borderRadius: '14px',
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '13px', color: '#d97706', fontWeight: 500, margin: 0 }}>
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
              padding: '16px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 700,
              borderRadius: '14px',
              border: 'none',
              background: canStart ? '#10b981' : '#94d8b3',
              cursor: canStart ? 'pointer' : 'not-allowed',
              boxShadow: canStart ? '0 4px 14px rgba(16,185,129,0.35)' : 'none',
              transition: 'background 0.2s',
            }}
          >
            START RACE
          </button>

          <button
            type="button"
            onClick={() => setShowProfile(true)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'center',
              fontSize: '11px',
              color: '#94a3b8',
              background: 'none',
              border: 'none',
              margin: 0,
              marginTop: '16px',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            Make sure GPS is enabled before starting — check now
          </button>
        </div>
      </div>

      <div style={{ paddingBottom: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#94a3b8' }}>ISA Tech Marathon 2026</p>
      </div>

      {showProfile && <ProfilePage onBack={() => setShowProfile(false)} />}
      {showMessages && (
        <MessagesPage
          eventId={details?.eventId || ''}
          onBack={() => { setShowMessages(false); setHasMessages(false); }}
        />
      )}
    </div>
  );
}
