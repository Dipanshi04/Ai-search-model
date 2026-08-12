import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="bg-marathon min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 sm:py-20 md:py-24 px-4">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="glass-dark inline-block px-4 sm:px-5 py-2 rounded-full mb-6">
            <span className="text-xs sm:text-sm text-slate-800 font-medium">Join 5,000+ Runners</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-4 sm:mb-6 tracking-tight text-slate-800 drop-shadow-lg">
            THE ISA
            <br />
            <span className="gradient-text">MARATHON 2026</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-700 mb-8 sm:mb-10 max-w-3xl mx-auto font-light px-4">
            Run for a <span className="text-pink-600 font-semibold">Greener</span> Tomorrow. 
            Every kilometer you run plants a tree.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
            <Link
              to="/register"
              className="white-btn px-8 sm:px-10 py-3 sm:py-4 rounded-xl text-base sm:text-lg shadow-xl"
            >
              Register Now
            </Link>
            <Link
              to="/leaderboard"
              className="glass-dark px-8 sm:px-10 py-3 sm:py-4 rounded-xl text-slate-800 font-semibold text-base sm:text-lg hover:bg-white/60 transition-all"
            >
              View Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { value: '5,000+', label: 'Runners', color: 'from-pink-500 to-purple-500' },
              { value: '15,000+', label: 'Trees to Plant', color: 'from-green-500 to-teal-500' },
              { value: '2', label: 'Categories', color: 'from-blue-500 to-cyan-500' },
              { value: '13L+', label: 'Prize Pool', color: 'from-orange-500 to-yellow-500' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-2xl p-4 sm:p-6 text-center hover:scale-105 transition-transform">
                <p className={`text-2xl sm:text-3xl md:text-4xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-2`}>
                  {stat.value}
                </p>
                <p className="text-slate-700 text-xs sm:text-sm font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Race Categories */}
      <section className="py-16 sm:py-20 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 mb-4">
              Race <span className="gradient-text">Categories</span>
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">Choose your challenge</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto px-4">
            {[
              { 
                name: '3K Fun Run', 
                distance: '3 km', 
                price: '500',
                gradient: 'from-pink-500 via-purple-500 to-blue-500',
                description: 'Perfect for beginners and families'
              },
              { 
                name: '5K Challenge', 
                distance: '5 km', 
                price: '800',
                gradient: 'from-orange-500 via-pink-500 to-purple-500',
                description: 'Test your limits with this exciting run'
              },
            ].map((cat) => (
              <div key={cat.name} className="group relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${cat.gradient} rounded-3xl opacity-20 group-hover:opacity-30 transition-opacity`} />
                <div className="relative glass rounded-3xl p-6 sm:p-8 h-full">
                  <div className="flex items-start justify-between mb-4 sm:mb-6">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">{cat.name}</h3>
                      <p className="text-slate-600 text-sm sm:text-base">{cat.description}</p>
                    </div>
                    <div className={`bg-gradient-to-r ${cat.gradient} px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl`}>
                      <span className="text-lg sm:text-2xl font-black text-white">{cat.distance}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-slate-200/50">
                    <div>
                      <p className="text-slate-500 text-xs sm:text-sm">Registration Fee</p>
                      <p className="text-2xl sm:text-3xl font-black text-slate-800">Rs. {cat.price}</p>
                    </div>
                    <Link
                      to="/register"
                      className="white-btn px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base"
                    >
                      Register
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 px-4 relative z-10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 mb-4">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">Three simple steps to make a difference</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
            {[
              { 
                step: '01', 
                title: 'Register', 
                description: 'Sign up and get your BIB number with a unique QR code',
                gradient: 'from-pink-500 to-purple-500',
              },
              { 
                step: '02', 
                title: 'Run', 
                description: 'Track your GPS in real-time. Every kilometer plants a tree',
                gradient: 'from-purple-500 to-blue-500',
              },
              { 
                step: '03', 
                title: 'Earn', 
                description: 'Complete the race and earn your certificate and goodies',
                gradient: 'from-blue-500 to-cyan-500',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative group">
                <div className="glass rounded-3xl p-6 sm:p-8 h-full text-center hover:scale-105 transition-transform">
                  <div className={`inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r ${item.gradient} mb-5 sm:mb-6`}>
                    <span className="text-xl sm:text-2xl font-black text-white">{item.step}</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-800 mb-3 sm:mb-4">{item.title}</h3>
                  <p className="text-slate-600 text-sm sm:text-base">{item.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-2xl text-slate-400">
                    +
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="glass-strong rounded-3xl p-8 sm:p-12 md:p-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-800 mb-4 sm:mb-6">
              Ready to Make a <span className="gradient-text">Difference</span>?
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-6 sm:mb-8 max-w-2xl mx-auto">
              Join thousands of runners who are not just running for themselves, but for a greener planet. 
              Every step counts!
            </p>
            <Link
              to="/register"
              className="white-btn inline-block px-10 sm:px-12 py-4 sm:py-5 rounded-xl text-lg sm:text-xl shadow-xl"
            >
              Register Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 relative z-10">
        <div className="max-w-6xl mx-auto text-center">
          <div className="glass-dark inline-block px-5 sm:px-6 py-2 sm:py-3 rounded-2xl mb-5 sm:mb-6">
            <span className="text-xs sm:text-sm font-semibold tracking-wider text-slate-800">INDORE SOFTWARE ASSOCIATION</span>
          </div>
          <p className="text-slate-600 text-xs sm:text-sm mb-3 sm:mb-4">
            THE ISA MARATHON 2026 - Indore, India
          </p>
          <p className="text-slate-500 text-xs">
            2026 ISA Marathon. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
