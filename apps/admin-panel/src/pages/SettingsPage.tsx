import { useState } from 'react';

export default function SettingsPage() {
  const [eventBranding, setEventBranding] = useState({
    eventName: 'ISA Tech Marathon 2026',
    tagline: 'Run. Track. Green.',
    primaryColor: '#7c3aed',
    logoUrl: '',
  });

  const [gpsSettings, setGpsSettings] = useState({
    updateIntervalMs: 5000,
    snapToleranceMeters: 50,
    accuracyThresholdMeters: 30,
  });

  const [notifications, setNotifications] = useState({
    emailOnRegistration: true,
    emailOnCheckin: false,
    smsOnStart: false,
  });

  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Configure event branding, GPS tracking, and notifications</p>
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
        </div>
      </div>

      {/* GPS Settings */}
      <div className="glass rounded-[2rem] p-6 border border-white/20 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-500 mb-4">GPS Tracking</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">Update Interval (ms)</label>
            <input
              type="number"
              value={gpsSettings.updateIntervalMs}
              onChange={(e) => setGpsSettings({ ...gpsSettings, updateIntervalMs: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Snap Tolerance (meters)</label>
            <input
              type="number"
              value={gpsSettings.snapToleranceMeters}
              onChange={(e) => setGpsSettings({ ...gpsSettings, snapToleranceMeters: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-white/80 border border-white/70 rounded-3xl text-slate-950 text-sm focus:ring-2 focus:ring-violet-200 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">Accuracy Threshold (meters)</label>
            <input
              type="number"
              value={gpsSettings.accuracyThresholdMeters}
              onChange={(e) => setGpsSettings({ ...gpsSettings, accuracyThresholdMeters: Number(e.target.value) })}
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
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl text-sm font-medium transition-colors"
        >
          Save Settings
        </button>
        {saved && <span className="text-emerald-600 text-sm font-medium">Saved successfully</span>}
      </div>
    </div>
  );
}
