import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import logoDark from './logo-dark.png';

const Logo = ({ size = 'h-14' }: { size?: string }) => (
  <img
    src={logoDark}
    alt="ISA Marathon"
    className={`${size} w-auto max-w-[200px] object-contain drop-shadow-sm`}
  />
);

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/events', label: 'Events' },
  { to: '/participants', label: 'Participants' },
  { to: '/companies', label: 'Companies' },
  { to: '/sponsors', label: 'Sponsors' },
  { to: '/bulk-registration', label: 'Bulk Registration' },
  { to: '/checkin', label: 'Check-in' },
  { to: '/tracking', label: 'Race Control' },
  { to: '/route-builder', label: 'Route Builder' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/green', label: 'Green Mission' },
  { to: '/certificates', label: 'Certificates' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/settings', label: 'Settings' },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-transparent flex">
      <aside className="w-72 glass flex flex-col border border-white/20">
        <div className="px-5 py-5 border-b border-white/10">
          <a href="/" className="flex justify-center">
            <Logo size="h-20" />
          </a>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-3xl px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? 'bg-violet-50 text-violet-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 bg-white/60">
          <div className="flex items-center gap-3 rounded-3xl bg-white/90 px-4 py-3 shadow-sm border border-white/70">
            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-sm font-bold">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-950 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="text-sm font-semibold text-slate-600 transition hover:text-red-500">
              Logout
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-transparent">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
