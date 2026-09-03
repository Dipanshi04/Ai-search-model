import { useState, FormEvent } from 'react';
import { api } from '../lib/api';
import logoDark from '../components/logo-dark.png';
import PinInput from '../components/PinInput';
import BrandHeader from '../components/BrandHeader';
import SponsorStrip from '../components/SponsorStrip';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login(email, pin.join(''));
      if (res.success) {
        api.setToken(res.data.tokens.accessToken);
        onLogin();
      } else {
        setError(res.message || 'Invalid credentials');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleResetPin = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Enter your email first');
      return;
    }
    setResetLoading(true);
    setError('');
    try {
      const res = await api.resetPin(email);
      if (res.success) {
        setResetSent(true);
      } else {
        setError(res.message || 'Failed to reset PIN');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setResetLoading(false);
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
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 20px 24px',
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
            Login to your Account
          </h2>

          {error && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              fontSize: '13px',
              color: '#dc2626',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          {resetSent && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              fontSize: '13px',
              color: '#059669',
              textAlign: 'center',
            }}>
              PIN sent to your email. Check your inbox (and spam folder).
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); setResetSent(false); }}
                required
                autoComplete="email"
                autoCapitalize="none"
                placeholder="Email"
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  color: '#1e293b',
                  fontSize: '15px',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#10b981'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#64748b',
                marginBottom: '10px',
              }}>
                4-Digit PIN
              </label>
              <PinInput
                value={pin}
                onChange={(next) => { setPin(next); setError(''); setResetSent(false); }}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || pin.some(d => !d)}
              style={{
                width: '100%',
                padding: '16px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: 700,
                borderRadius: '14px',
                border: 'none',
                background: loading || !email || pin.some(d => !d) ? '#94d8b3' : '#10b981',
                cursor: loading || !email || pin.some(d => !d) ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
                boxShadow: loading || !email || pin.some(d => !d) ? 'none' : '0 4px 14px rgba(16,185,129,0.35)',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <button
            type="button"
            onClick={handleResetPin}
            disabled={resetLoading || !email}
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: '20px',
              fontSize: '13px',
              color: resetLoading || !email ? '#cbd5e1' : '#10b981',
              background: 'none',
              border: 'none',
              cursor: resetLoading || !email ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              width: '100%',
            }}
          >
            {resetLoading ? 'Sending PIN...' : 'Reset PIN'}
          </button>
        </div>
      </div>

      <div style={{ padding: '4px 0 16px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#94a3b8' }}>ISA Tech Marathon 2026</p>
      </div>

      <SponsorStrip />
    </div>
  );
}
