import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useBackClose } from '../hooks/useBackClose';
import logoDark from '../components/logo-dark.png';
import nrcGroupLogo from '../components/nrc-group-logo.png';
import BrandHeader from '../components/BrandHeader';
import ProfilePage from './ProfilePage';
import MessagesPage from './MessagesPage';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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
  const [sharing, setSharing] = useState(false);

  // Android/browser back closes whichever overlay is open instead of
  // leaving the runner app.
  useBackClose(showProfile, () => setShowProfile(false));
  useBackClose(showMessages, () => { setShowMessages(false); setHasMessages(false); });

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

  // A shareable "I'm Running" card, sized for Instagram/WhatsApp stories —
  // available to any registered runner, not just finishers, since its point
  // is pre-race hype rather than a record of completion (that's what the
  // certificate is for).
  const handleShareCard = async () => {
    setSharing(true);
    try {
      const W = 1080, H = 1920;
      const NAVY = '#1B2A5B';
      const NAVY_DARK = '#111c40';
      const ORANGE = '#F5821F';

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.textAlign = 'center';

      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, NAVY);
      bg.addColorStop(1, NAVY_DARK);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Soft orange glow accents, top-right and bottom-left
      const glow1 = ctx.createRadialGradient(W - 100, 200, 0, W - 100, 200, 420);
      glow1.addColorStop(0, 'rgba(245,130,31,0.25)');
      glow1.addColorStop(1, 'rgba(245,130,31,0)');
      ctx.fillStyle = glow1;
      ctx.fillRect(0, 0, W, H);
      const glow2 = ctx.createRadialGradient(80, H - 200, 0, 80, H - 200, 420);
      glow2.addColorStop(0, 'rgba(16,185,129,0.18)');
      glow2.addColorStop(1, 'rgba(16,185,129,0)');
      ctx.fillStyle = glow2;
      ctx.fillRect(0, 0, W, H);

      // Logo lockup
      try {
        const [isaLogo, nrcLogo] = await Promise.all([loadImage(logoDark), loadImage(nrcGroupLogo)]);
        const logoH = 84;
        const isaW = (isaLogo.width / isaLogo.height) * logoH;
        const nrcW = (nrcLogo.width / nrcLogo.height) * logoH;
        const gap = 32;
        const totalW = nrcW + isaW + gap;
        const startX = W / 2 - totalW / 2;
        const logoY = 100;
        const pad = 16;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.roundRect(startX - pad, logoY - pad, nrcW + pad * 2, logoH + pad * 2, 16);
        ctx.fill();
        ctx.drawImage(nrcLogo, startX, logoY, nrcW, logoH);
        ctx.beginPath();
        ctx.roundRect(startX + nrcW + gap - pad, logoY - pad, isaW + pad * 2, logoH + pad * 2, 16);
        ctx.fill();
        ctx.drawImage(isaLogo, startX + nrcW + gap, logoY, isaW, logoH);
      } catch {
        // Logos are a nice-to-have — a failed image load shouldn't block
        // the share card itself from generating.
      }

      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '700 26px Inter, sans-serif';
      ctx.fillText('INDORE SOFTWARE ASSOCIATION', W / 2, 300);

      // Big statement
      ctx.fillStyle = '#fff';
      ctx.font = '800 88px Georgia, serif';
      ctx.fillText("I'M RUNNING", W / 2, 470);

      ctx.fillStyle = ORANGE;
      ctx.font = '800 52px Georgia, serif';
      ctx.fillText('ISA TECH MARATHON 2026', W / 2, 550);

      // Runner name card
      const name = details?.name || 'Runner';
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(120, 660, W - 240, 260, 28);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245,130,31,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(120, 660, W - 240, 260, 28);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '700 22px Inter, sans-serif';
      ctx.fillText('RUNNER', W / 2, 730);

      ctx.fillStyle = '#fff';
      ctx.font = '800 56px Georgia, serif';
      ctx.fillText(name, W / 2, 800);

      const catLabel = (details?.category || category) === 'RUN_5K' ? '5K Challenge' : '3K Fun Run';
      ctx.fillStyle = ORANGE;
      ctx.font = '700 30px Inter, sans-serif';
      ctx.fillText(`BIB #${details?.bibNumber || bibNumber}  ·  ${catLabel}`, W / 2, 870);

      // Race day details
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 32px Inter, sans-serif';
      ctx.fillText('27th September 2026 · 6:30 AM', W / 2, 1010);
      ctx.fillText('Indore, Madhya Pradesh', W / 2, 1054);

      // Runner icon (simple)
      ctx.save();
      ctx.translate(W / 2, 1230);
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-6, -110, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -70); ctx.lineTo(-10, 20); ctx.lineTo(-60, 70);
      ctx.moveTo(-10, 20); ctx.lineTo(40, 60);
      ctx.moveTo(0, -70); ctx.lineTo(50, -50); ctx.lineTo(30, -100);
      ctx.moveTo(-10, -55); ctx.lineTo(-60, -40);
      ctx.stroke();
      ctx.restore();

      // Green mission tagline
      ctx.fillStyle = 'rgba(16,185,129,0.9)';
      ctx.font = '700 30px Inter, sans-serif';
      ctx.fillText('Run for a Greener Tomorrow 🌱', W / 2, 1420);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '22px Inter, sans-serif';
      ctx.fillText('Every 5km plants a tree', W / 2, 1462);

      // Footer
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(W / 2 - 260, 1780);
      ctx.lineTo(W / 2 + 260, 1780);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '600 26px Inter, sans-serif';
      ctx.fillText('marathon.theisa.in', W / 2, 1830);

      const link = document.createElement('a');
      link.download = `im-running-${details?.bibNumber || bibNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch {
      // Best-effort — nothing to show the runner if canvas generation
      // itself fails, so just don't leave them stuck on a spinner.
    }
    setSharing(false);
  };

  return (
    <div style={{
      height: '100dvh',
      overflowY: 'auto',
      WebkitOverflowScrolling: 'touch',
      background: '#f0f4f8',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <BrandHeader />

      <button
        onClick={() => setShowMessages(true)}
        aria-label="Messages"
        style={{
          position: 'fixed',
          top: 'calc(64px + env(safe-area-inset-top))',
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
          top: 'calc(64px + env(safe-area-inset-top))',
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

          <button
            type="button"
            onClick={handleShareCard}
            disabled={sharing}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '13px',
              borderRadius: '14px',
              border: '1.5px solid #1B2A5B',
              background: '#fff',
              color: '#1B2A5B',
              fontSize: '14px',
              fontWeight: 700,
              cursor: sharing ? 'not-allowed' : 'pointer',
              opacity: sharing ? 0.6 : 1,
              marginBottom: '20px',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#1B2A5B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
              <path d="M12 3v13M7 8l5-5 5 5" />
            </svg>
            {sharing ? 'Preparing your card…' : "Download \"I'm Running\" Card"}
          </button>

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
