import { useState } from 'react';

export default function SettingsPage() {
  const [eventBranding, setEventBranding] = useState({
    eventName: 'ISA Tech Marathon 2026',
    tagline: 'Run. Track. Green.',
    primaryColor: '#10b981',
    logoUrl: '',
  });

  const [gpsSettings, setGpsSettings] = useState({
    updateIntervalMs: 5000,
    snapToleranceMeters: 50,
    accuracyThresholdMeters: 30,
  });

  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-white font-semibold mb-4">Event Branding</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Event Name</label>
            <input
              value={eventBranding.eventName}
              onChange={(e) => setEventBranding({ ...eventBranding, eventName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Tagline</label>
            <input
              value={eventBranding.tagline}
              onChange={(e) => setEventBranding({ ...eventBranding, tagline: e.target.value })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Primary Color</label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={eventBranding.primaryColor}
                onChange={(e) => setEventBranding({ ...eventBranding, primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <span className="text-white text-sm font-mono">{eventBranding.primaryColor}</span>
            </div>
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Logo URL</label>
            <input
              value={eventBranding.logoUrl}
              onChange={(e) => setEventBranding({ ...eventBranding, logoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-white font-semibold mb-4">GPS Tracking Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-1">Update Interval (ms)</label>
            <input
              type="number"
              value={gpsSettings.updateIntervalMs}
              onChange={(e) => setGpsSettings({ ...gpsSettings, updateIntervalMs: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Snap Tolerance (meters)</label>
            <input
              type="number"
              value={gpsSettings.snapToleranceMeters}
              onChange={(e) => setGpsSettings({ ...gpsSettings, snapToleranceMeters: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-slate-400 text-sm mb-1">Accuracy Threshold (meters)</label>
            <input
              type="number"
              value={gpsSettings.accuracyThresholdMeters}
              onChange={(e) => setGpsSettings({ ...gpsSettings, accuracyThresholdMeters: Number(e.target.value) })}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium"
        >
          Save Settings
        </button>
        {saved && <span className="text-green-400 text-sm">Saved successfully</span>}
      </div>
    </div>
  );
}
