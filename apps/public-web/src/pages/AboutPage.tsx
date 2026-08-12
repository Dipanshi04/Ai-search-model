export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-white mb-8">About ISA Tech Marathon</h1>

      <div className="space-y-8">
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-3">Our Mission</h2>
          <p className="text-slate-300">
            The ISA Tech Marathon brings together the technology community for a day of fitness,
            networking, and environmental impact. We believe in running for a cause — every kilometer
            contributes to making our planet greener.
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-3">The Green Mission</h2>
          <p className="text-slate-300">
            Partnering with reforestation organizations, we plant one tree for every kilometer run
            by all participants. With thousands of runners across multiple categories, we aim to
            plant over 15,000 trees this year alone.
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-3">Race Categories</h2>
          <ul className="text-slate-300 space-y-2">
            <li><span className="text-blue-400 font-semibold">3K Fun Run</span> — Perfect for beginners and families</li>
            <li><span className="text-emerald-400 font-semibold">5K Challenge</span> — A step up for intermediate runners</li>
          </ul>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-3">Real-Time Tracking</h2>
          <p className="text-slate-300">
            Our platform provides live GPS tracking, real-time leaderboard updates, and instant
            check-in via QR codes. Spectators can follow runners live, and the LED dashboard
            at the venue displays race progress for everyone.
          </p>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
          <h2 className="text-xl font-bold text-emerald-400 mb-3">Contact</h2>
          <p className="text-slate-300">
            For questions about the marathon, reach out to us at<br />
            <span className="text-white font-medium">marathon@isa-tech.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}