import { useEffect, useState } from 'react';
import { api } from '../lib/api';

const DEFAULT_TRACKING = {
  MAX_ACCURACY_METERS: 40,
  OUTLIER_DISTANCE_METERS: 50,
  FINISH_THRESHOLD_METERS: 30,
};

export default function SettingsPage() {
  const [eventBranding, setEventBranding] = useState({
    eventName: 'ISA Tech Marathon 2026',
    tagline: 'Run. Track. Green.',
    primaryColor: '#7c3aed',
    logoUrl: '',
  });

  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [tracking, setTracking] = useState(DEFAULT_TRACKING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const [notifications, setNotifications] = useState({
    emailOnRegistration: true,
    emailOnCheckin: false,
    smsOnStart: false,
  });

  useEffect(() => {
    api.getEvents().then((res) => {
      if (res.success && res.data?.length) {
        setEvents(res.data);
        setEventId(res.data[0].id);
      } else {
        setLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    api.getSettings(eventId).then((res) => {
      if (res.success && res.data) {
        setTracking({
          MAX_ACCURACY_METERS: res.data.MAX_ACCURACY_METERS ?? DEFAULT_TRACKING.MAX_ACCURACY_METERS,
          OUTLIER_DISTANCE_METERS: res.data.OUTLIER_DISTANCE_METERS ?? DEFAULT_TRACKING.OUTLIER_DISTANCE_METERS,
          FINISH_THRESHOLD_METERS: res.data.FINISH_THRESHOLD_METERS ?? DEFAULT_TRACKING.FINISH_THRESHOLD_METERS,
        });
      }
      setLoading(false);
    });
  }, [eventId]);

  async function handleSave() {
    if (!eventId) return;
    setSaving(true);
    setError('');
    try {
      const res = await api.updateSettings(eventId, tracking);
      if (res.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(res.message || 'Failed to save settings');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to save settings');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-950">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure event branding, GPS tracking, and notifications</p>
        </div>
        {events.length > 0 && (
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="px-4 py-2 bg-white/80 border border-white/60 rounded-3xl text-slate-900 text-sm outline-none"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Event Branding */}
      <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-500 mb-4">Event Branding</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Event Name</label>
            <input
              value={eventBranding.eventName}
              onChange={(e) => setEventBranding({ ...eventBranding, eventName: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Tagline</label>
            <input
              value={eventBranding.tagline}
              onChange={(e) => setEventBranding({ ...eventBranding, tagline: e.target.value })}
              className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Primary Color</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={eventBranding.primaryColor}
                onChange={(e) => setEventBranding({ ...eventBranding, primaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
              />
              <span className="text-sm text-slate-700 font-mono">{eventBranding.primaryColor}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Logo URL</label>
            <input
              value={eventBranding.logoUrl}
              onChange={(e) => setEventBranding({ ...eventBranding, logoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
          <p className="text-xs text-slate-400">Branding fields are a preview only — not wired to the site yet.</p>
        </div>
      </div>

      {/* GPS Tracking */}
      <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-500 mb-1">GPS Tracking</h3>
        <p className="text-xs text-slate-400 mb-4">
          Applied live to every GPS point as it comes in, for the event selected above.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Max Accuracy (meters)</label>
            <p className="text-xs text-slate-400 mb-1.5">A GPS fix worse than this is dropped before it can affect distance or the leaderboard.</p>
            <input
              type="number"
              min={1}
              value={tracking.MAX_ACCURACY_METERS}
              onChange={(e) => setTracking({ ...tracking, MAX_ACCURACY_METERS: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Outlier Jump (meters)</label>
            <p className="text-xs text-slate-400 mb-1.5">A jump from the last point bigger than this — and implying over 25 km/h — is rejected as a bad fix.</p>
            <input
              type="number"
              min={1}
              value={tracking.OUTLIER_DISTANCE_METERS}
              onChange={(e) => setTracking({ ...tracking, OUTLIER_DISTANCE_METERS: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Finish Threshold (meters)</label>
            <p className="text-xs text-slate-400 mb-1.5">Coming within this distance of the finish point auto-marks a runner FINISHED.</p>
            <input
              type="number"
              min={1}
              value={tracking.FINISH_THRESHOLD_METERS}
              onChange={(e) => setTracking({ ...tracking, FINISH_THRESHOLD_METERS: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-500 mb-4">Notifications</h3>
        <div className="space-y-4">
          {[
            { key: 'emailOnRegistration', label: 'Email on new registration' },
            { key: 'emailOnCheckin', label: 'Email on check-in' },
            { key: 'smsOnStart', label: 'SMS alert when race starts' },
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={(notifications as any)[item.key]}
                onChange={(e) => setNotifications({ ...notifications, [item.key]: e.target.checked })}
                className="rounded text-violet-600"
              />
              <span className="text-sm text-slate-700">{item.label}</span>
            </label>
          ))}
          <p className="text-xs text-slate-400">Notification toggles are a preview only — not wired yet.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-3xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving || loading || !eventId}
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save GPS Settings'}
        </button>
        {saved && <span className="text-emerald-600 text-sm font-medium">Saved successfully</span>}
      </div>
    </div>
  );
}
