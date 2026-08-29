import { ReactNode } from 'react';
import logoDark from './logo-dark.png';
import Footer from './Footer';

interface Section {
  heading: string;
  body: ReactNode;
}

interface LegalPageProps {
  title: string;
  lastUpdated: string;
  intro: ReactNode;
  sections: Section[];
}

export default function LegalPage({ title, lastUpdated, intro, sections }: LegalPageProps) {
  return (
    <div className="min-h-screen bg-brand-cream">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <a href="/" className="hero-body inline-flex items-center gap-1 text-sm text-brand-navy/60 hover:text-brand-navy transition mb-8">
          &larr; Back to Home
        </a>

        <div className="flex items-center gap-3 mb-2">
          <img src={logoDark} alt="ISA Marathon" className="h-8 w-auto object-contain" />
        </div>
        <h1 className="hero-title text-4xl font-bold text-brand-navy mb-2">{title}</h1>
        <p className="hero-body text-brand-navy/50 text-sm mb-8">Last Updated: {lastUpdated}</p>

        <div className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm mb-6">
          <div className="hero-body text-brand-navy/80 space-y-3">{intro}</div>
        </div>

        <div className="space-y-6">
          {sections.map((s) => (
            <div key={s.heading} className="bg-white p-6 rounded-xl border border-brand-navy/10 shadow-sm">
              <h2 className="hero-title text-xl font-bold text-brand-orange mb-3">{s.heading}</h2>
              <div className="hero-body text-brand-navy/80 text-sm space-y-3">{s.body}</div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
