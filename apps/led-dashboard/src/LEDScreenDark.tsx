import { formatDuration } from '@isa/utils';
import logoLight from './components/logo-light.png';
import liseInfoTechLogo from './components/Lise Logo 2.png';
import nrcGroupLogo from './components/nrc-group-logo.png';
import { useLedDashboardData, colorForGender, MALE_COLOR, FEMALE_COLOR } from './useLedDashboardData';
import { SponsorTicker, SponsorGrid } from './components/SponsorDisplay';

export default function LEDScreenDark() {
  const d = useLedDashboardData('mapbox://styles/mapbox/dark-v11');

  return (
    <div className="w-screen h-screen bg-[#0a0f1a] text-white flex flex-col overflow-hidden select-none font-sans">
      {/* Header */}
      <header className="h-[104px] bg-[#0d1320] border-b border-slate-800/60 flex items-center justify-between px-10 shrink-0 z-30">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="bg-white rounded-lg px-2.5 py-1.5">
              <img src={nrcGroupLogo} alt="NRC Group" className="h-11 w-auto object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.25em]">Title Sponsor</p>
              <p className="text-sm font-extrabold text-white uppercase tracking-wide">NRC Group</p>
            </div>
          </div>
          <div className="w-px h-10 bg-slate-700/60" />
          <img src={logoLight} alt="ISA Marathon" className="h-16 w-auto max-w-full object-contain drop-shadow-md" />
        </div>
        <div className="flex items-center gap-10">
          <div className="text-center">
            <p className="text-4xl font-mono font-black text-emerald-400 leading-none">{formatDuration(d.elapsedTime)}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-1.5">Elapsed</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-white leading-none">{d.totalRunners}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-1.5">Runners</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-violet-400 leading-none">{d.totalFinished}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-1.5">Finished</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-green-400 leading-none">{d.treeCount}</p>
            <p className="text-[11px] text-green-400/80 uppercase tracking-widest mt-1.5">Trees</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-emerald-300 leading-none">{Math.round(d.co2Offset)}</p>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-1.5">kg CO2</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <main className="flex-1 relative min-w-0">
          {d.MAPBOX_TOKEN ? (
            <div ref={d.mapContainer} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-900/50">
              <div className="text-center text-slate-700">
                <p className="text-6xl mb-4">MAP</p>
                <p className="text-lg">Set VITE_MAPBOX_TOKEN to enable map</p>
              </div>
            </div>
          )}

          {d.mapLoaded && d.routePointCount > 0 && (
            <div className="absolute bottom-8 left-8 bg-[#0d1320]/90 backdrop-blur-md border border-slate-700/50 rounded-xl px-6 py-4 z-10 pointer-events-none">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.6)' }} />
                  <span className="text-sm text-slate-300">Route Active</span>
                </div>
                <div className="w-px h-6 bg-slate-700" />
                <span className="text-sm text-slate-400">{d.routePointCount} points mapped</span>
                <div className="w-px h-6 bg-slate-700" />
                <span className="text-sm text-emerald-400 font-bold">{d.trackedCount} runners tracked</span>
                <div className="w-px h-6 bg-slate-700" />
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: MALE_COLOR }} />
                  <span className="text-sm text-slate-400">Male</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: FEMALE_COLOR }} />
                  <span className="text-sm text-slate-400">Female</span>
                </div>
              </div>
            </div>
          )}

          {d.announcement && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 px-10 py-4 rounded-xl shadow-2xl z-20 animate-fade-in-up">
              <p className="font-black text-lg">{d.announcement.title}</p>
              <p className="text-base font-medium">{d.announcement.message}</p>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-[360px] xl:w-[400px] bg-[#0d1320] border-l border-slate-800/60 flex flex-col shrink-0">
          <div className="flex-1 min-h-0 relative">
            {/* 3K and 5K leaderboards, both visible at once — stacked rather
                than merged into one ranking or cycled between, so a runner
                in either race can see where they stand without waiting. */}
            <div className={`absolute inset-0 transition-all duration-400 ${d.sidebarView === 'leaderboard' && !d.fadeSidebar ? 'opacity-100 translate-x-0' : d.sidebarView === 'leaderboard' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4 pointer-events-none'}`} style={{ transitionDuration: '400ms' }}>
              <div className="p-5 h-full flex flex-col gap-4">
                {([
                  { label: '3K', color: 'sky', list: d.leaderboard3k },
                  { label: '5K', color: 'orange', list: d.leaderboard5k },
                ] as const).map(({ label, color, list }) => (
                  <div key={label} className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2.5 shrink-0">
                      <h2 className={`text-base font-extrabold uppercase tracking-widest ${color === 'sky' ? 'text-sky-400' : 'text-orange-400'}`}>{label} Leaderboard</h2>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider ${color === 'sky' ? 'bg-sky-500/15 text-sky-400' : 'bg-orange-500/15 text-orange-400'}`}>{list.length} shown</span>
                    </div>
                    <div className="space-y-1.5 flex-1 min-h-0 overflow-hidden">
                      {list.map((entry) => {
                        const tStatus = d.trackingStatus(entry);
                        return (
                          <div key={entry.rank} className={`flex items-center gap-3 px-3.5 py-2 rounded-lg ${entry.rank === 1 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-900/40'}`}>
                            <span className={`text-sm font-bold w-6 text-center shrink-0 ${entry.rank === 1 ? 'text-amber-400' : entry.rank === 2 ? 'text-slate-300' : entry.rank === 3 ? 'text-orange-400' : 'text-slate-500'}`}>{entry.rank}</span>
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: colorForGender(entry.gender) }}
                              title={entry.gender === 'MALE' ? 'Male' : entry.gender === 'FEMALE' ? 'Female' : undefined}
                            />
                            {tStatus && (
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${tStatus === 'live' ? 'bg-emerald-400' : tStatus === 'delayed' ? 'bg-amber-400' : 'bg-red-500'}`}
                                style={tStatus === 'live' ? { boxShadow: '0 0 6px rgba(52,211,153,0.8)' } : undefined}
                                title={tStatus === 'live' ? 'Live' : tStatus === 'delayed' ? 'Signal delayed' : 'Tracking stopped'}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate leading-tight text-white">{entry.name}</p>
                              <p className="text-xs text-slate-400 truncate">#{entry.bibNumber}{entry.companyName ? ` · ${entry.companyName}` : ''}</p>
                            </div>
                            <span className="text-sm font-mono font-bold text-emerald-400 shrink-0">{entry.distance.toFixed(2)} km</span>
                          </div>
                        );
                      })}
                      {list.length === 0 && <div className="h-16 flex items-center justify-center"><p className="text-slate-500 text-sm">Waiting for runners...</p></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sponsors */}
            <div className={`absolute inset-0 transition-all duration-400 ${d.sidebarView === 'sponsors' && !d.fadeSidebar ? 'opacity-100 translate-x-0' : d.sidebarView === 'sponsors' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4 pointer-events-none'}`} style={{ transitionDuration: '400ms' }}>
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h2 className="text-lg font-extrabold text-emerald-400 uppercase tracking-widest">Our Sponsors</h2>
                  <span className="text-sm bg-emerald-500/20 text-emerald-400 px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider">{d.sponsors.length} Partners</span>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <SponsorGrid sponsors={d.sponsors} theme="dark" />
                </div>
              </div>
            </div>
          </div>
          {/* Developer Credit */}
          <div className="mt-auto p-5 shrink-0">
            <div className="flex items-center justify-center gap-3 px-5 py-3 rounded-lg border border-slate-700/60 bg-[#0a0f1a]/80">
              <span className="text-sm sm:text-base text-slate-400 whitespace-nowrap">Technology Partner</span>
              <img src={liseInfoTechLogo} alt="Lise InfoTech" className="h-8 sm:h-10 w-auto max-w-[120px] object-contain" />
            </div>
          </div>
        </aside>
      </div>

      {/* Announcement Banner */}
      {d.announcement && (
        <div className="h-16 bg-gradient-to-r from-amber-500/20 via-amber-500/30 to-amber-500/20 border-t border-amber-500/30 flex items-center justify-center px-12 shrink-0">
          <span className="text-amber-400 font-bold mr-4 text-xl">{d.announcement.title}:</span>
          <span className="text-amber-200/80 text-lg">{d.announcement.message}</span>
        </div>
      )}

      {/* Sponsors Ticker */}
      <div className="h-16 bg-[#0d1320] border-t border-slate-800/40 flex items-center px-10 shrink-0">
        <SponsorTicker sponsors={d.sponsors} theme="dark" />
      </div>
    </div>
  );
}
