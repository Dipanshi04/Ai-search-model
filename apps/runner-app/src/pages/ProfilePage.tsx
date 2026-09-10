import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import PinInput from '../components/PinInput';
import { convertHeicIfNeeded } from '@isa/shared';

interface Props {
  onBack: () => void;
}

interface ProfileDetails {
  name: string;
  email: string;
  phone: string;
  bibNumber: string;
  category: string;
  avatarUrl: string | null;
}

const API_URL = import.meta.env.VITE_API_URL || '';

type GpsStatus = 'unknown' | 'checking' | 'active' | 'denied' | 'unavailable' | 'timeout' | 'unsupported';

const CATEGORY_LABELS: Record<string, string> = {
  RUN_3K: '3K Fun Run',
  RUN_5K: '5K Challenge',
};

const GPS_META: Record<GpsStatus, { color: string; label: string; hint: (accuracy: number | null) => string }> = {
  unknown: { color: '#94a3b8', label: 'Not checked yet', hint: () => 'Tap "Check GPS Now" to test your location signal.' },
  checking: { color: '#f59e0b', label: 'Checking…', hint: () => 'Getting a location fix — this can take a few seconds.' },
  active: { color: '#10b981', label: 'GPS Active', hint: (a) => (a != null ? `Accuracy: ~${Math.round(a)}m` : 'Location signal is working.') },
  denied: { color: '#ef4444', label: 'Permission Denied', hint: () => 'Enable Location for this app in your browser/device settings, then check again.' },
  unavailable: { color: '#ef4444', label: 'Position Unavailable', hint: () => 'Move to an open area away from tall buildings and try again.' },
  timeout: { color: '#ef4444', label: 'Timed Out', hint: () => 'Signal took too long. Try again, ideally outdoors.' },
  unsupported: { color: '#ef4444', label: 'Not Supported', hint: () => 'This device/browser does not support location tracking.' },
};

export default function ProfilePage({ onBack }: Props) {
  const [mounted, setMounted] = useState(false);
  const [details, setDetails] = useState<ProfileDetails | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('unknown');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);

  const [showPinForm, setShowPinForm] = useState(false);
  const [currentPin, setCurrentPin] = useState(['', '', '', '']);
  const [newPin, setNewPin] = useState(['', '', '', '']);
  const [pinSaving, setPinSaving] = useState(false);
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));

    api.getMe().then((res) => {
      if (res.success && res.data) {
        const p = res.data.participants?.[0];
        setDetails({
          name: res.data.name,
          email: res.data.email,
          phone: res.data.phone,
          bibNumber: p?.bibNumber || '—',
          category: p?.category || '',
          avatarUrl: res.data.avatarUrl || null,
        });
      }
    });

    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }

    let statusRef: PermissionStatus | null = null;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          statusRef = status;
          const apply = () => {
            if (status.state === 'denied') setGpsStatus('denied');
          };
          apply();
          status.onchange = apply;
        })
        .catch(() => {});
    }

    return () => {
      if (statusRef) statusRef.onchange = null;
    };
  }, []);

  const handleBack = () => {
    setMounted(false);
    setTimeout(onBack, 280);
  };

  const checkGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }
    setGpsStatus('checking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsAccuracy(pos.coords.accuracy);
        setGpsStatus('active');
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsStatus('denied');
        else if (err.code === err.TIMEOUT) setGpsStatus('timeout');
        else setGpsStatus('unavailable');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const g = GPS_META[gpsStatus];

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    e.target.value = '';
    if (!rawFile) return;
    setPhotoError('');
    setPhotoUploading(true);
    try {
      // iPhone photos are HEIC by default, which the server's upload
      // filter rejects — convert to JPEG here first.
      const file = await convertHeicIfNeeded(rawFile);
      const res = await api.uploadMyPhoto(file);
      if (res.success && res.data?.avatarUrl) {
        setDetails((d) => (d ? { ...d, avatarUrl: res.data.avatarUrl } : d));
      } else {
        setPhotoError(res.message || 'Failed to upload photo');
      }
    } catch {
      setPhotoError('Network error. Please try again.');
    }
    setPhotoUploading(false);
  };

  const togglePinForm = () => {
    setShowPinForm((s) => {
      const next = !s;
      if (!next) {
        setCurrentPin(['', '', '', '']);
        setNewPin(['', '', '', '']);
      }
      return next;
    });
    setPinMsg(null);
  };

  const handleChangePin = async () => {
    setPinMsg(null);
    if (currentPin.some((d) => !d) || newPin.some((d) => !d)) {
      setPinMsg({ type: 'error', text: 'Enter both your current and new 4-digit PIN.' });
      return;
    }
    setPinSaving(true);
    try {
      const res = await api.changePin(currentPin.join(''), newPin.join(''));
      if (res.success) {
        setPinMsg({ type: 'success', text: 'PIN updated. Use your new PIN next time you log in.' });
        setCurrentPin(['', '', '', '']);
        setNewPin(['', '', '', '']);
      } else {
        setPinMsg({ type: 'error', text: res.message || 'Failed to update PIN' });
      }
    } catch {
      setPinMsg({ type: 'error', text: 'Network error. Please try again.' });
    }
    setPinSaving(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#f0f4f8',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        transform: `translateX(${mounted ? '0' : '100%'})`,
        transition: 'transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 8px',
        paddingTop: 'calc(10px + env(safe-area-inset-top))',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0',
        flexShrink: 0,
      }}>
        <button
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'none',
            border: 'none',
            padding: '10px',
            cursor: 'pointer',
            color: '#10b981',
            borderRadius: '10px',
            transition: 'background 0.15s',
            touchAction: 'manipulation',
          }}
          onMouseDown={(e) => { e.currentTarget.style.background = '#f0fdf4'; }}
          onMouseUp={(e) => { e.currentTarget.style.background = 'none'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: 0, flex: 1, textAlign: 'center', marginRight: '42px' }}>
          Profile
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px calc(24px + env(safe-area-inset-bottom))' }}>
        <div style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '24px 20px',
          marginBottom: '20px',
          textAlign: 'center',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <label style={{ position: 'relative', display: 'inline-block', margin: '0 auto 12px', cursor: 'pointer' }}>
            {/* No `capture` attribute — that forces the camera open directly
                on Android with no way to pick an existing photo instead. */}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif" style={{ display: 'none' }} onChange={handlePhotoChange} />
            {details?.avatarUrl ? (
              <img
                src={`${API_URL}${details.avatarUrl}`}
                alt=""
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', display: 'block', opacity: photoUploading ? 0.5 : 1 }}
              />
            ) : (
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 800,
                color: '#fff',
                opacity: photoUploading ? 0.5 : 1,
              }}>
                {(details?.name || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div style={{
              position: 'absolute', bottom: '-2px', right: '-2px',
              width: '22px', height: '22px', borderRadius: '50%',
              background: '#fff', border: '1.5px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
          </label>
          {photoError && (
            <p style={{ fontSize: '11px', color: '#dc2626', margin: '0 0 8px' }}>{photoError}</p>
          )}
          <p style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{details?.name || 'Runner'}</p>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0' }}>{details?.email || ''}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', background: '#ecfdf5', padding: '5px 12px', borderRadius: '999px', fontFamily: 'monospace' }}>
              {details?.bibNumber}
            </span>
            {details?.category && (
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569', background: '#f1f5f9', padding: '5px 12px', borderRadius: '999px' }}>
                {CATEGORY_LABELS[details.category] || details.category}
              </span>
            )}
          </div>
        </div>

        <p style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 4px 8px' }}>
          Location Services
        </p>
        <div style={{
          background: '#fff',
          borderRadius: '18px',
          padding: '18px 20px',
          marginBottom: '20px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: g.color,
              flexShrink: 0,
              boxShadow: gpsStatus === 'checking' ? `0 0 0 4px ${g.color}22` : 'none',
              transition: 'background 0.2s',
            }} />
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>{g.label}</span>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 14px', lineHeight: 1.4 }}>{g.hint(gpsAccuracy)}</p>
          <button
            onClick={checkGps}
            disabled={gpsStatus === 'checking'}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: '12px',
              border: 'none',
              background: gpsStatus === 'checking' ? '#e2e8f0' : '#eef2ff',
              color: gpsStatus === 'checking' ? '#94a3b8' : '#4338ca',
              fontSize: '14px',
              fontWeight: 700,
              cursor: gpsStatus === 'checking' ? 'not-allowed' : 'pointer',
              transition: 'transform 0.1s, background 0.2s',
              touchAction: 'manipulation',
            }}
            onMouseDown={(e) => { if (gpsStatus !== 'checking') e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {gpsStatus === 'checking' ? 'Checking GPS…' : 'Check GPS Now'}
          </button>
        </div>

        <p style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 4px 8px' }}>
          Security
        </p>
        <div style={{
          background: '#fff',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>
          <button
            onClick={togglePinForm}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              touchAction: 'manipulation',
            }}
          >
            <span style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>Change PIN</span>
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: showPinForm ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>

          {showPinForm && (
            <div style={{
              padding: '4px 20px 22px',
              borderTop: '1px solid #f1f5f9',
              animation: 'profileFadeIn 0.2s ease-out',
            }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', margin: '16px 0 10px' }}>Current PIN</p>
              <PinInput value={currentPin} onChange={setCurrentPin} autoFocus />

              <p style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', margin: '20px 0 10px' }}>New PIN</p>
              <PinInput value={newPin} onChange={setNewPin} />

              {pinMsg && (
                <div style={{
                  marginTop: '16px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: pinMsg.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  border: `1px solid ${pinMsg.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                  fontSize: '12.5px',
                  color: pinMsg.type === 'success' ? '#059669' : '#dc2626',
                  textAlign: 'center',
                }}>
                  {pinMsg.text}
                </div>
              )}

              <button
                onClick={handleChangePin}
                disabled={pinSaving}
                style={{
                  width: '100%',
                  marginTop: '18px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: 'none',
                  background: pinSaving ? '#94d8b3' : '#10b981',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: pinSaving ? 'not-allowed' : 'pointer',
                  boxShadow: pinSaving ? 'none' : '0 4px 14px rgba(16,185,129,0.3)',
                  touchAction: 'manipulation',
                }}
              >
                {pinSaving ? 'Saving…' : 'Save New PIN'}
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => { api.clearToken(); window.location.href = '/'; }}
          style={{
            display: 'block',
            width: '100%',
            marginTop: '24px',
            padding: '14px',
            borderRadius: '14px',
            border: '1.5px solid #fecaca',
            background: '#fff',
            color: '#dc2626',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          Log Out
        </button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '20px' }}>
          ISA Tech Marathon 2026
        </p>
      </div>

      <style>{`@keyframes profileFadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}
