import { formatDuration } from '@isa/utils';
import logoDark from './components/logo-dark.png';
import liseInfoTechLogo from './components/Lise Logo 2.png';
import nrcGroupLogo from './components/nrc-group-logo.png';
import solugenixLogo from './components/solugenix-logo.png';
import { useLedDashboardData, colorForGender, MALE_COLOR, FEMALE_COLOR } from './useLedDashboardData';
import { SponsorTicker, SponsorGrid } from './components/SponsorDisplay';

// Same engine as LEDScreenDark (via useLedDashboardData) — this is purely a
// restyle to the runner-app's light/cream palette instead of the dark LED
// wall theme, still showing 3K and 5K side by side.
export default function LEDScreenLight() {
  const d = useLedDashboardData('mapbox://styles/mapbox/light-v11');

  return (
    <div className="w-screen h-screen bg-[#f0f4f8] text-[#1B2A5B] flex flex-col overflow-hidden select-none font-sans">
      {/* Header */}
      <header className="h-[104px] bg-white border-b border-[#1B2A5B]/10 flex items-center justify-between px-10 shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div className="bg-white border border-[#1B2A5B]/10 rounded-lg px-2.5 py-1.5">
              <img src={nrcGroupLogo} alt="NRC Group" className="h-11 w-auto object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-[9px] font-bold text-[#1B2A5B]/45 uppercase tracking-[0.25em]">Title Sponsor</p>
              <p className="text-sm font-extrabold text-[#1B2A5B] uppercase tracking-wide">NRC Group</p>
            </div>
          </div>
          <div className="w-px h-10 bg-[#1B2A5B]/10" />
          <img src={logoDark} alt="ISA Marathon" className="h-16 w-auto max-w-full object-contain" />
          <div className="w-px h-10 bg-[#1B2A5B]/10" />
          <div className="leading-tight">
            <p className="text-[9px] font-bold text-[#1B2A5B]/45 uppercase tracking-[0.25em] mb-1">Co-Sponsored By</p>
            <img src={solugenixLogo} alt="Solugenix" className="h-6 w-auto object-contain" />
          </div>
        </div>
        <div className="flex items-center gap-10">
          <div className="text-center">
            <p className="text-4xl font-mono font-black text-emerald-600 leading-none">{formatDuration(d.elapsedTime)}</p>
            <p className="text-[11px] text-[#1B2A5B]/45 uppercase tracking-widest mt-1.5">Elapsed</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-[#1B2A5B] leading-none">{d.totalRunners}</p>
            <p className="text-[11px] text-[#1B2A5B]/45 uppercase tracking-widest mt-1.5">Runners</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-violet-600 leading-none">{d.totalFinished}</p>
            <p className="text-[11px] text-[#1B2A5B]/45 uppercase tracking-widest mt-1.5">Finished</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-green-600 leading-none">{d.treeCount}</p>
            <p className="text-[11px] text-green-600/70 uppercase tracking-widest mt-1.5">Trees</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-black text-emerald-500 leading-none">{Math.round(d.co2Offset)}</p>
            <p className="text-[11px] text-[#1B2A5B]/45 uppercase tracking-widest mt-1.5">kg CO2</p>
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
            <div className="w-full h-full flex items-center justify-center bg-[#eef2f7]">
              <div className="text-center text-[#1B2A5B]/25">
                <p className="text-6xl mb-4">MAP</p>
                <p className="text-lg">Set VITE_MAPBOX_TOKEN to enable map</p>
              </div>
            </div>
          )}

          {d.mapLoaded && d.routePointCount > 0 && (
            <div className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-md border border-[#1B2A5B]/10 rounded-xl px-6 py-4 z-10 pointer-events-none shadow-lg">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-emerald-500" style={{ boxShadow: '0 0 8px rgba(16,185,129,0.5)' }} />
                  <span className="text-sm text-[#1B2A5B]/70">Route Active</span>
                </div>
                <div className="w-px h-6 bg-[#1B2A5B]/10" />
                <span className="text-sm text-[#1B2A5B]/50">{d.routePointCount} points mapped</span>
                <div className="w-px h-6 bg-[#1B2A5B]/10" />
                <span className="text-sm text-emerald-600 font-bold">{d.trackedCount} runners tracked</span>
                <div className="w-px h-6 bg-[#1B2A5B]/10" />
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: MALE_COLOR }} />
                  <span className="text-sm text-[#1B2A5B]/60">Male</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: FEMALE_COLOR }} />
                  <span className="text-sm text-[#1B2A5B]/60">Female</span>
                </div>
              </div>
            </div>
          )}

          {d.announcement && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#F5821F] to-orange-400 text-white px-10 py-4 rounded-xl shadow-2xl z-20 animate-fade-in-up">
              <p className="font-black text-lg">{d.announcement.title}</p>
              <p className="text-base font-medium">{d.announcement.message}</p>
            </div>
          )}
        </main>

        {/* Sidebar */}
        <aside className="w-[360px] xl:w-[400px] bg-white border-l border-[#1B2A5B]/10 flex flex-col shrink-0">
          <div className="flex-1 min-h-0 relative">
            {/* 3K and 5K leaderboards, both visible at once. */}
            <div className={`absolute inset-0 transition-all duration-400 ${d.sidebarView === 'leaderboard' && !d.fadeSidebar ? 'opacity-100 translate-x-0' : d.sidebarView === 'leaderboard' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4 pointer-events-none'}`} style={{ transitionDuration: '400ms' }}>
              <div className="p-5 h-full flex flex-col gap-4">
                {([
                  { label: '3K', color: 'sky', list: d.leaderboard3k },
                  { label: '5K', color: 'orange', list: d.leaderboard5k },
                ] as const).map(({ label, color, list }) => (
                  <div key={label} className="flex-1 min-h-0 flex flex-col">
                    <div className="flex items-center justify-between mb-2.5 shrink-0">
                      <h2 className={`text-base font-extrabold uppercase tracking-widest ${color === 'sky' ? 'text-sky-600' : 'text-[#F5821F]'}`}>{label} Leaderboard</h2>
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider ${color === 'sky' ? 'bg-sky-100 text-sky-600' : 'bg-orange-100 text-[#F5821F]'}`}>{list.length} shown</span>
                    </div>
                    <div className="space-y-1.5 flex-1 min-h-0 overflow-hidden">
                      {list.map((entry) => {
                        const tStatus = d.trackingStatus(entry);
                        return (
                          <div key={entry.rank} className={`flex items-center gap-3 px-3.5 py-2 rounded-lg border ${entry.rank === 1 ? 'bg-amber-50 border-amber-300' : 'bg-[#f8fafc] border-[#1B2A5B]/5'}`}>
                            <span className={`text-sm font-bold w-6 text-center shrink-0 ${entry.rank === 1 ? 'text-amber-500' : entry.rank === 2 ? 'text-[#1B2A5B]/50' : entry.rank === 3 ? 'text-[#F5821F]' : 'text-[#1B2A5B]/35'}`}>{entry.rank}</span>
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: colorForGender(entry.gender) }}
                              title={entry.gender === 'MALE' ? 'Male' : entry.gender === 'FEMALE' ? 'Female' : undefined}
                            />
                            {tStatus && (
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${tStatus === 'live' ? 'bg-emerald-500' : tStatus === 'delayed' ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={tStatus === 'live' ? { boxShadow: '0 0 6px rgba(16,185,129,0.7)' } : undefined}
                                title={tStatus === 'live' ? 'Live' : tStatus === 'delayed' ? 'Signal delayed' : 'Tracking stopped'}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate leading-tight text-[#1B2A5B]">{entry.name}</p>
                              <p className="text-xs text-[#1B2A5B]/45 truncate">#{entry.bibNumber}{entry.companyName ? ` · ${entry.companyName}` : ''}</p>
                            </div>
                            <span className="text-sm font-mono font-bold text-emerald-600 shrink-0">{entry.distance.toFixed(2)} km</span>
                          </div>
                        );
                      })}
                      {list.length === 0 && <div className="h-16 flex items-center justify-center"><p className="text-[#1B2A5B]/35 text-sm">Waiting for runners...</p></div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sponsors */}
            <div className={`absolute inset-0 transition-all duration-400 ${d.sidebarView === 'sponsors' && !d.fadeSidebar ? 'opacity-100 translate-x-0' : d.sidebarView === 'sponsors' ? 'opacity-0 translate-x-4' : 'opacity-0 -translate-x-4 pointer-events-none'}`} style={{ transitionDuration: '400ms' }}>
              <div className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4 shrink-0">
                  <h2 className="text-lg font-extrabold text-emerald-600 uppercase tracking-widest">Our Sponsors</h2>
                  <span className="text-sm bg-emerald-100 text-emerald-600 px-4 py-1.5 rounded-full font-semibold uppercase tracking-wider">{d.sponsors.length} Partners</span>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden">
                  <SponsorGrid sponsors={d.sponsors} theme="light" />
                </div>
              </div>
            </div>
          </div>
          {/* Developer Credit */}
          <div className="mt-auto p-5 shrink-0">
            <div className="flex items-center justify-center gap-3 px-5 py-3 rounded-lg border border-[#1B2A5B]/10 bg-[#f8fafc]">
              <span className="text-sm sm:text-base text-[#1B2A5B]/50 whitespace-nowrap">Technology Partner</span>
              <img src={liseInfoTechLogo} alt="Lise InfoTech" className="h-8 sm:h-10 w-auto max-w-[120px] object-contain" />
            </div>
          </div>
        </aside>
      </div>

      {/* Announcement Banner */}
      {d.announcement && (
        <div className="h-16 bg-gradient-to-r from-orange-50 via-orange-100 to-orange-50 border-t border-orange-200 flex items-center justify-center px-12 shrink-0">
          <span className="text-[#F5821F] font-bold mr-4 text-xl">{d.announcement.title}:</span>
          <span className="text-[#F5821F]/70 text-lg">{d.announcement.message}</span>
        </div>
      )}

      {/* Sponsors Ticker */}
      <div className="h-16 bg-white border-t border-[#1B2A5B]/10 flex items-center px-10 shrink-0">
        <SponsorTicker sponsors={d.sponsors} theme="light" />
      </div>
    </div>
  );
}
