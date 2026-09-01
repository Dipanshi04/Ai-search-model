import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <a href="/" className="hero-body inline-flex items-center gap-1 text-sm text-brand-navy/60 hover:text-brand-navy transition mb-8">
          &larr; Back to Home
        </a>

      <h1 className="hero-title text-4xl font-bold text-brand-navy mb-8">About ISA Tech Marathon</h1>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm">
          <h2 className="hero-title text-xl font-bold text-brand-orange mb-3">Our Mission</h2>
          <p className="hero-body text-brand-navy/80">
            The ISA Tech Marathon brings together the technology community for a day of fitness,
            networking, and environmental impact. We believe in running for a cause — every kilometer
            contributes to making our planet greener.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm">
          <h2 className="hero-title text-xl font-bold text-brand-orange mb-3">The Green Mission</h2>
          <p className="hero-body text-brand-navy/80">
            Partnering with reforestation organizations, we plant one tree for every 5 kilometers run
            by all participants combined &mdash; 3K and 5K runners alike. With thousands of runners across
            both categories, we aim to plant over 9,000 trees this year alone.
          </p>
          <a href="/green" className="hero-body inline-block mt-4 text-emerald-600 hover:text-emerald-700 text-sm font-bold transition">
            View live tree counter &rarr;
          </a>
        </div>

        <div className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm">
          <h2 className="hero-title text-xl font-bold text-brand-orange mb-3">Race Categories</h2>
          <ul className="hero-body text-brand-navy/80 space-y-2">
            <li><span className="text-brand-navy font-bold">3K Fun Run</span> — Perfect for beginners and families</li>
            <li><span className="text-brand-orange font-bold">5K Challenge</span> — A step up for intermediate runners</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm">
          <h2 className="hero-title text-xl font-bold text-brand-orange mb-3">Real-Time Tracking</h2>
          <p className="hero-body text-brand-navy/80">
            Our platform provides live GPS tracking, real-time leaderboard updates, and instant
            check-in via QR codes. Spectators can follow runners live, and the LED dashboard
            at the venue displays race progress for everyone.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm">
          <h2 className="hero-title text-xl font-bold text-brand-orange mb-3">Contact</h2>
          <p className="hero-body text-brand-navy/80">
            For questions about the marathon, reach out to us at<br />
            <span className="text-brand-navy font-bold">marathon@isa-tech.com</span>
          </p>
        </div>
      </div>
      </div>
      <Footer />
    </div>
  );
}