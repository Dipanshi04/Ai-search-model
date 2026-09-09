import Footer from '../components/Footer';

const STEPS = [
  {
    title: 'Register Online',
    body: 'Pick your race — 3K or 5K — fill in your details, and complete payment online. Bulk offers and ISA Premium Member discounts are applied automatically.',
  },
  {
    title: 'Get Your BIB & Confirmation',
    body: 'You’ll receive an email confirmation with your unique BIB number and QR code — this is your entry pass for race day.',
  },
  {
    title: 'Collect Your Kit',
    body: 'Race kits are handed out on 26th September 2026, the day before the marathon, at the venue.',
  },
  {
    title: 'Race Day Check-In',
    body: 'Arrive at BBC Basketball Club, Indore by 6:30 AM. Scan your QR code at check-in to activate live GPS tracking for your run.',
  },
  {
    title: 'Run & Track Live',
    body: 'Your pace and distance update in real time. Every 5 kilometers run by all participants combined plants a tree — track the live counter on our Green Mission page.',
  },
  {
    title: 'Finish & Get Certified',
    body: 'Cross the finish line and get your digital finisher certificate automatically, with your official time and distance.',
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <a href="/" className="hero-body inline-flex items-center gap-1 text-sm text-brand-navy/60 hover:text-brand-navy transition mb-8">
          &larr; Back to Home
        </a>

        <h1 className="hero-title text-4xl font-bold text-brand-navy mb-2">How It Works</h1>
        <p className="hero-body text-brand-navy/70 mb-10">
          From registration to finish line — here’s everything that happens along the way.
        </p>

        <div className="space-y-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm flex gap-4">
              <div
                className="hero-title shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white"
                style={{ background: '#1B2A5B' }}
              >
                {i + 1}
              </div>
              <div>
                <h2 className="hero-title text-lg font-bold text-brand-orange mb-1.5">{step.title}</h2>
                <p className="hero-body text-brand-navy/80">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <a
            href="/register"
            className="hero-body inline-flex items-center gap-2 px-7 py-3 rounded-full text-base font-bold text-white hover:opacity-90 transition"
            style={{ background: '#F5821F' }}
          >
            Register Now
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
