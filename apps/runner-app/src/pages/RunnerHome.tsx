import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import logoDark from '../components/logo-dark.png';

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

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#f0f4f8',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
      }}>
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

          <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', margin: 0, marginTop: '16px' }}>
            Make sure GPS is enabled before starting
          </p>
        </div>
      </div>

      <div style={{ paddingBottom: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#94a3b8' }}>ISA Tech Marathon 2026</p>
      </div>
    </div>
  );
}
