import Footer from '../components/Footer';
import PageHeader from '../components/PageHeader';

export default function RegistrationClosedPage() {
  return (
    <div className="min-h-screen bg-brand-cream flex flex-col relative">
      <div className="hero-grain" />
      <PageHeader />
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="bg-white border border-brand-navy/10 shadow-sm p-8 sm:p-10 rounded-3xl max-w-md w-full text-center relative z-10">
          <h1 className="hero-title text-2xl sm:text-3xl font-bold text-brand-navy mb-3">
            Registration Closed
          </h1>
          <p className="hero-body text-brand-navy/70 text-base sm:text-lg mb-6">
            Registrations for the ISA Marathon are now closed. Thank you to everyone who signed up — see you on race day!
          </p>
          <a
            href="/"
            className="inline-block bg-brand-orange text-white hover:opacity-90 transition px-6 sm:px-8 py-3 rounded-xl text-base font-bold"
          >
            Back to Home
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
