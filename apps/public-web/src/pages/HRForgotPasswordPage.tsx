import { useState } from 'react';
import { api } from '../lib/api';
import logoDark from '../components/logo-dark.png';

export function HRForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.hrForgotPassword(email);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.message || 'Failed to send reset link');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const s = {
    page: { minHeight: '100dvh', display: 'flex' as const, flexDirection: 'column' as const, background: '#f8fafc' },
    center: { flex: 1, display: 'flex' as const, flexDirection: 'column' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: '24px 20px', width: '100%' },
    card: { width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' },
    logo: { marginBottom: '24px', display: 'flex' as const, justifyContent: 'center' as const },
    title: { textAlign: 'center' as const, fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' },
    subtitle: { textAlign: 'center' as const, fontSize: '14px', color: '#64748b', marginBottom: '32px' },
    error: { marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '14px', fontWeight: 500 },
    successMsg: { marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '14px', fontWeight: 500, textAlign: 'center' as const },
    field: { marginBottom: '20px' },
    label: { display: 'block' as const, fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' },
    input: { width: '100%', padding: '14px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' },
    btn: { width: '100%', padding: '16px', marginTop: '8px', color: '#fff', fontSize: '16px', fontWeight: 700, borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
    backLink: { marginTop: '24px', textAlign: 'center' as const, fontSize: '14px', color: '#64748b' },
  };

  return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={s.card}>
          <div style={s.logo}>
            <img src={logoDark} alt="ISA Marathon" className="h-14" />
          </div>
          <h1 style={s.title}>Forgot Password</h1>
          <p style={s.subtitle}>Enter your email to receive a password reset link</p>

          {error && <div style={s.error}>{error}</div>}
          {success && <div style={s.successMsg}>If the email exists, a password reset link has been sent.</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div style={s.field}>
              <label style={s.label}>Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                style={s.input}
                placeholder="hr@company.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              style={{
                ...s.btn,
                background: loading || !email ? '#94a3b8' : '#1e293b',
                cursor: loading || !email ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p style={s.backLink}>
            <a href="/hr-portal" style={{ color: '#64748b', textDecoration: 'underline' }}>Back to Login</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export function HRResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = new URLSearchParams(window.location.search).get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await api.hrResetPassword(token, password);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.message || 'Failed to reset password');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const s = {
    page: { minHeight: '100dvh', display: 'flex' as const, flexDirection: 'column' as const, background: '#f8fafc' },
    center: { flex: 1, display: 'flex' as const, flexDirection: 'column' as const, alignItems: 'center' as const, justifyContent: 'center' as const, padding: '24px 20px', width: '100%' },
    card: { width: '100%', maxWidth: '400px', background: '#fff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' },
    logo: { marginBottom: '24px', display: 'flex' as const, justifyContent: 'center' as const },
    title: { textAlign: 'center' as const, fontSize: '24px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' },
    subtitle: { textAlign: 'center' as const, fontSize: '14px', color: '#64748b', marginBottom: '32px' },
    error: { marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '14px', fontWeight: 500 },
    successMsg: { marginBottom: '20px', padding: '12px 16px', borderRadius: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '14px', fontWeight: 500, textAlign: 'center' as const },
    field: { marginBottom: '20px' },
    label: { display: 'block' as const, fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' },
    input: { width: '100%', padding: '14px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '12px', color: '#1f2937', fontSize: '16px', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' },
    btn: { width: '100%', padding: '16px', marginTop: '8px', color: '#fff', fontSize: '16px', fontWeight: 700, borderRadius: '12px', border: 'none', cursor: 'pointer', transition: 'all 0.2s' },
    backLink: { marginTop: '24px', textAlign: 'center' as const, fontSize: '14px', color: '#64748b' },
  };

  if (!token) {
    return (
      <div style={s.page}>
        <div style={s.center}>
          <div style={s.card}>
            <div style={s.logo}>
              <img src={logoDark} alt="ISA Marathon" className="h-14" />
            </div>
            <h1 style={s.title}>Invalid Reset Link</h1>
            <p style={s.subtitle}>This password reset link is invalid or has expired.</p>
            <div style={s.error}>Please request a new password reset link.</div>
            <p style={s.backLink}>
              <a href="/hr-forgot-password" style={{ color: '#64748b', textDecoration: 'underline' }}>Request New Link</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.center}>
        <div style={s.card}>
          <div style={s.logo}>
            <img src={logoDark} alt="ISA Marathon" className="h-14" />
          </div>
          <h1 style={s.title}>Reset Password</h1>
          <p style={s.subtitle}>Enter your new password below</p>

          {error && <div style={s.error}>{error}</div>}
          {success && <div style={s.successMsg}>Password reset successfully! Redirecting to login...</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div style={s.field}>
              <label style={s.label}>New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                style={s.input}
                placeholder="Enter new password"
                minLength={6}
              />
            </div>

            <div style={s.field}>
              <label style={s.label}>Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
                style={s.input}
                placeholder="Confirm new password"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password || !confirmPassword}
              style={{
                ...s.btn,
                background: loading || !password || !confirmPassword ? '#94a3b8' : '#1e293b',
                cursor: loading || !password || !confirmPassword ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          {!success && <p style={s.backLink}>
            <a href="/hr-portal" style={{ color: '#64748b', textDecoration: 'underline' }}>Back to Login</a>
          </p>}
        </div>
      </div>
    </div>
  );
}