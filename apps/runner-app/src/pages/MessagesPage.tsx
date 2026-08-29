import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Announcement {
  id: string;
  title: string;
  message: string;
  location?: string | null;
  url?: string | null;
  phone?: string | null;
  eventDate?: string | null;
  createdAt: string;
}

interface Props {
  eventId: string;
  onBack: () => void;
}

export default function MessagesPage({ eventId, onBack }: Props) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Announcement[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!eventId) {
      setMessages([]);
      return;
    }
    api.getAnnouncements(eventId).then((res) => {
      if (res.success && res.data) {
        setMessages(res.data);
      } else {
        setError(res.message || 'Failed to load messages');
        setMessages([]);
      }
    }).catch(() => {
      setError('Network error. Please try again.');
      setMessages([]);
    });
  }, [eventId]);

  const handleBack = () => {
    setMounted(false);
    setTimeout(onBack, 280);
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
          Messages
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px calc(24px + env(safe-area-inset-bottom))' }}>
        {messages === null && (
          <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '13px', marginTop: '40px' }}>Loading…</p>
        )}

        {error && (
          <div style={{
            background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: '14px',
            padding: '14px 16px', marginBottom: '16px', textAlign: 'center',
          }}>
            <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {messages && messages.length === 0 && !error && (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <span style={{ fontSize: '36px', display: 'block', marginBottom: '12px' }}>📭</span>
            <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>No messages yet</p>
            <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '4px 0 0' }}>
              Race-day updates will show up here.
            </p>
          </div>
        )}

        {messages && messages.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  background: '#fff',
                  borderRadius: '18px',
                  padding: '18px 18px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                }}
              >
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: 0 }}>{m.title}</h3>
                <p style={{ fontSize: '13.5px', color: '#475569', margin: '6px 0 0', lineHeight: 1.5 }}>{m.message}</p>

                {(m.location || m.eventDate || m.phone || m.url) && (
                  <div style={{
                    marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f1f5f9',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                  }}>
                    {m.eventDate && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>📅</span>
                        <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                          {new Date(m.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    )}
                    {m.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>📍</span>
                        <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>{m.location}</span>
                      </div>
                    )}
                    {m.phone && (
                      <a
                        href={`tel:${m.phone}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                      >
                        <span style={{ fontSize: '15px' }}>📞</span>
                        <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600 }}>{m.phone}</span>
                      </a>
                    )}
                    {m.url && (
                      <a
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                      >
                        <span style={{ fontSize: '15px' }}>🔗</span>
                        <span style={{ fontSize: '13px', color: '#10b981', fontWeight: 600, wordBreak: 'break-all' }}>
                          {m.url.replace(/^https?:\/\//, '')}
                        </span>
                      </a>
                    )}
                  </div>
                )}

                <p style={{ fontSize: '11px', color: '#cbd5e1', margin: '12px 0 0' }}>
                  {new Date(m.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
