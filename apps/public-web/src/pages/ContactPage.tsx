import Footer from '../components/Footer';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <a href="/" className="hero-body inline-flex items-center gap-1 text-sm text-brand-navy/60 hover:text-brand-navy transition mb-8">
          &larr; Back to Home
        </a>

        <h1 className="hero-title text-4xl font-bold text-brand-navy mb-8">Contact Us</h1>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm">
            <h2 className="hero-title text-xl font-bold text-brand-orange mb-3">ISA Tech Marathon</h2>
            <p className="hero-body text-brand-navy/80">
              For questions about registration, race categories, or race day logistics, reach out to us at
              <br />
              <a href="mailto:marathon@isa-tech.com" className="text-brand-navy font-bold hover:text-brand-orange transition">
                marathon@isa-tech.com
              </a>
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm">
            <h2 className="hero-title text-xl font-bold text-brand-orange mb-3">Indore Software Association</h2>
            <p className="hero-body text-brand-navy/80">
              The ISA Tech Marathon is organized by the Indore Software Association (ISA).
            </p>
            <p className="hero-body text-brand-navy/80 mt-3">
              Vijay Nagar, Indore, Madhya Pradesh &ndash; 452009, India
            </p>
            <p className="hero-body text-brand-navy/80 mt-1">
              Email:{' '}
              <a href="mailto:info@theisa.in" className="text-brand-navy font-bold hover:text-brand-orange transition">
                info@theisa.in
              </a>
            </p>
            <p className="hero-body text-brand-navy/80 mt-1">
              Website:{' '}
              <a
                href="https://www.theisa.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-navy font-bold hover:text-brand-orange transition"
              >
                theisa.in
              </a>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
