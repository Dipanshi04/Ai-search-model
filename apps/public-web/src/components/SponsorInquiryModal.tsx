import { useState } from 'react';
import { api } from '../lib/api';

export default function SponsorInquiryModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', companyName: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await api.submitSponsorInquiry(form);
    if (res.success) {
      setSubmitted(true);
    } else {
      setError(res.message || 'Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8" style={{ background: 'rgba(27,42,91,0.45)' }} onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-xl max-w-md w-full p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-brand-navy/50 hover:text-brand-navy hover:bg-brand-navy/5 transition"
        >
          &times;
        </button>

        {submitted ? (
          <div className="text-center py-6">
            <h2 className="hero-title text-2xl font-bold text-brand-navy mb-2">Thank you!</h2>
            <p className="hero-body text-brand-navy/60 text-sm mb-6">
              We've received your inquiry and will get back to you soon.
            </p>
            <button
              onClick={onClose}
              className="bg-brand-orange text-white hover:opacity-90 transition px-6 py-2.5 rounded-xl text-sm font-bold"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 className="hero-title text-2xl font-bold text-brand-navy mb-1">Become a Sponsor</h2>
            <p className="hero-body text-brand-navy/60 text-sm mb-6">
              Tell us a bit about your company and we'll be in touch.
            </p>

            {error && (
              <div className="hero-body bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                  placeholder="Name"
                />
              </div>
              <div>
                <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Company Name *</label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                  placeholder="Company"
                />
              </div>
              <div>
                <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                  placeholder="Email"
                />
              </div>
              <div>
                <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="hero-body block text-xs font-medium text-brand-navy/60 mb-1">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-brand-cream border border-brand-navy/15 rounded-lg text-brand-navy placeholder-brand-navy/30 focus:ring-2 focus:ring-brand-orange focus:border-brand-orange outline-none text-sm transition resize-none"
                  placeholder="Tell us about your sponsorship interest (optional)"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 bg-brand-orange text-white hover:opacity-90 disabled:opacity-50 font-bold rounded-xl transition-all text-sm"
            >
              {loading ? 'Sending...' : 'Submit Inquiry'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
