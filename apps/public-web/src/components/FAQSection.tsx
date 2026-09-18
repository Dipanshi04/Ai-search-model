import { useState } from 'react';

const FAQS = [
  {
    q: 'What is the ISA Tech Marathon 2026?',
    a: 'It’s a 3K and 5K run organized by the Indore Software Association on 27th September 2026, bringing together 280+ IT companies in Indore for a day of technology, fitness, and sustainability. Every 5km run plants a tree.',
  },
  {
    q: 'When and where is the marathon happening?',
    a: 'The race starts at 6:30 AM on 27th September 2026 at BBC Basketball Club, Indore.',
  },
  {
    q: 'What are the race categories and pricing?',
    a: 'There are two categories: 3 KM for ₹299 and 5 KM for ₹499. Bulk bookings of 25+ passes get 50% off, and ISA Premium Member companies also get a flat 50% discount.',
  },
  {
    q: 'How do I register?',
    a: 'Click Register Now on the homepage, fill in your details, choose your race category, and complete payment online. You’ll receive a confirmation email with your BIB number.',
  },
  {
    q: 'When and where do I collect my race kit?',
    a: 'Race kits can be collected on 26th September 2026, the day before the event, at the designated collection point in Indore. Details are shared via email after registration.',
  },
  {
    q: 'Will I get a finisher certificate?',
    a: 'Yes. Every runner who completes their race gets a digital finisher certificate, generated automatically after the race using your tracked distance and time.',
  },
  {
    q: 'Can I track my run live?',
    a: 'Yes. The event uses real-time GPS tracking, so your pace and distance update live during the race, and spectators can follow the leaderboard as it happens.',
  },
  {
    q: 'Is there a refund if I can’t attend?',
    a: 'Registration fees are strictly non-refundable and non-transferable, in line with the event Terms & Conditions.',
  },
  {
    q: 'How does the tree-planting work?',
    a: 'For every 5 kilometers run by all participants combined — across both 3K and 5K categories — we plant one tree in partnership with reforestation organizations. Every rupee from your registration fee also goes toward this mission. You can follow the live tree counter on our Green Mission page.',
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="hero-anim px-4 sm:px-8 pb-8 sm:pb-10 relative z-10 max-w-3xl mx-auto w-full" style={{ animationDelay: '650ms' }}>
      <h2 className="hero-title text-2xl sm:text-3xl font-extrabold text-center mb-6 sm:mb-8" style={{ color: '#1B2A5B' }}>
        Frequently Asked Questions
      </h2>
      <div className="space-y-2.5">
        {FAQS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <div
              key={item.q}
              className="bg-white rounded-xl border overflow-hidden"
              style={{ borderColor: 'rgba(27,42,91,0.1)' }}
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="hero-body w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 sm:px-5 sm:py-4"
                aria-expanded={isOpen}
              >
                <span className="text-sm sm:text-base font-bold" style={{ color: '#1B2A5B' }}>{item.q}</span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0 transition-transform"
                  style={{ color: '#1B2A5B', opacity: 0.5, transform: isOpen ? 'rotate(180deg)' : 'none' }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {isOpen && (
                <p className="hero-body px-4 pb-4 sm:px-5 sm:pb-5 text-sm sm:text-base" style={{ color: '#1B2A5B', opacity: 0.7 }}>
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { FAQS };
