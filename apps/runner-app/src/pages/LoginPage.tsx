import { useState, FormEvent } from 'react';
import { api } from '../lib/api';
import logoLight from '../components/logo-light.png';

const Logo = ({ size = 'h-16' }: { size?: string }) => (
  <img src={logoLight} alt="ISA Marathon" className={`${size} w-auto max-w-[200px] object-contain drop-shadow-md mx-auto block`} />
);

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login(email, password);
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

  const s = {
    page: {
      minHeight: '100dvh',
      display: 'flex' as const,
      flexDirection: 'column' as const,
      background: '#0a0f1a',
    },
    center: {
      flex: 1,
      display: 'flex' as const,
      flexDirection: 'column' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: '24px 20px',
      width: '100%',
    },
    card: {
      width: '100%',
      maxWidth: '360px',
    },
    logos: {
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: '12px',
    },
    subtitle: {
      textAlign: 'center' as const,
      fontSize: '11px',
      color: '#64748b',
      letterSpacing: '0.15em',
      textTransform: 'uppercase' as const,
      marginBottom: '40px',
    },
    error: {
      marginBottom: '20px',
      padding: '12px 16px',
      borderRadius: '12px',
      background: 'rgba(239,68,68,0.1)',
      border: '1px solid rgba(239,68,68,0.3)',
      display: 'flex' as const,
      alignItems: 'center' as const,
      gap: '12px',
    },
    errorIcon: {
      width: '32px',
      height: '32px',
      borderRadius: '8px',
      background: 'rgba(239,68,68,0.2)',
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexShrink: 0,
    },
    errorText: {
      fontSize: '14px',
      color: '#f87171',
      fontWeight: 500,
    },
    field: {
      marginBottom: '16px',
    },
    label: {
      display: 'block' as const,
      fontSize: '12px',
      fontWeight: 500,
      color: '#94a3b8',
      marginBottom: '6px',
      marginLeft: '4px',
    },
    input: {
      width: '100%',
      padding: '14px 16px',
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      color: '#fff',
      fontSize: '16px',
      outline: 'none',
    },
    btn: {
      width: '100%',
      padding: '15px',
      marginTop: '4px',
      color: '#fff',
      fontSize: '16px',
      fontWeight: 600,
      borderRadius: '12px',
      border: 'none',
    },
    footer: {
      paddingBottom: '24px',
      textAlign: 'center' as const,
    },
    footerText: {
      fontSize: '11px',
      color: '#475569',
    },
  };

  return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={s.card}>
          <div style={s.logos}>
            <Logo size="h-16" />
          </div>
          <p style={s.subtitle}>Runner Login</p>

          {error && (
            <div style={s.error}>
              <div style={s.errorIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <p style={s.errorText}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                required
                autoComplete="email"
                autoCapitalize="none"
                placeholder="you@example.com"
                style={s.input}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={s.label}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                style={s.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              style={{
                ...s.btn,
                background: loading || !email || !password ? 'rgba(16,185,129,0.4)' : '#10b981',
                cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      <div style={s.footer}>
        <p style={s.footerText}>ISA Tech Marathon 2026</p>
      </div>
    </div>
  );
}
