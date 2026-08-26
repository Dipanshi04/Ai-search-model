import { useState, useRef, FormEvent } from 'react';
import { api } from '../lib/api';
import logoDark from '../components/logo-dark.png';

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
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
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {pinRefs.map((ref, i) => (
                  <input
                    key={i}
                    ref={ref}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={pin[i]}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const newPin = [...pin];
                      newPin[i] = val;
                      setPin(newPin);
                      setError('');
                      setResetSent(false);
                      if (val && i < 3) pinRefs[i + 1]?.current?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !pin[i] && i > 0) {
                        pinRefs[i - 1]?.current?.focus();
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
                      if (pasted) {
                        const newPin = pasted.split('').concat(Array(4).fill('')).slice(0, 4);
                        setPin(newPin);
                        const focusIdx = Math.min(pasted.length, 3);
                        pinRefs[focusIdx]?.current?.focus();
                      }
                    }}
                    style={{
                      width: '56px',
                      height: '60px',
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '14px',
                      color: '#1e293b',
                      fontSize: '24px',
                      fontWeight: 700,
                      textAlign: 'center',
                      outline: 'none',
                      caretColor: '#10b981',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#10b981'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
                  />
                ))}
              </div>
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

      <div style={{ paddingBottom: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '11px', color: '#94a3b8' }}>ISA Tech Marathon 2026</p>
      </div>
    </div>
  );
}
