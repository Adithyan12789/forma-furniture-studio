import { useEffect, lazy, Suspense } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Armchair, LogOut } from 'lucide-react';
import LandingPage from './pages/LandingPage';
const StudioPage = lazy(() => import('./pages/StudioPage'));
const AnalyzePage = lazy(() => import('./pages/AnalyzePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { useAuthStore } from './store/authStore';

function PageFallback() {
  return <div className="grid min-h-[50vh] place-items-center text-sm text-mist">Loading…</div>;
}

export default function App() {
  const location = useLocation();
  const inStudio = location.pathname.startsWith('/studio');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const restore = useAuthStore((s) => s.restore);

  useEffect(() => { restore(); }, [restore]);

  return (
    <div className="flex h-full flex-col bg-ink text-zinc-100">
      <header className="z-20 flex h-14 shrink-0 items-center gap-6 border-b border-line bg-coal/90 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brass/15 text-brass">
            <Armchair size={18} />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight">
            Forma <span className="font-normal text-mist">· 3D Furniture Studio</span>
          </span>
        </Link>
        <nav className="ml-2 flex items-center gap-1 text-sm">
          <NavLink
            to="/studio"
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 transition ${isActive ? 'bg-panel2 text-white' : 'text-mist hover:text-white'}`
            }
          >
            Studio
          </NavLink>
          {user && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `rounded-md px-3 py-1.5 transition ${isActive ? 'bg-panel2 text-white' : 'text-mist hover:text-white'}`
              }
            >
              Projects
            </NavLink>
          )}
          <NavLink
            to="/analyze"
            className={({ isActive }) =>
              `rounded-md px-3 py-1.5 transition ${isActive ? 'bg-panel2 text-white' : 'text-mist hover:text-white'}`
            }
          >
            Analyze
          </NavLink>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-xs text-mist">
          <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1 md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Phase 7 · Production
          </span>
          {user ? (
            <span className="flex items-center gap-2.5">
              <span className="hidden sm:inline">{user.name}</span>
              <button onClick={logout} className="flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 transition hover:bg-panel2 hover:text-white">
                <LogOut size={12} /> Sign out
              </button>
            </span>
          ) : (
            <Link to="/login" className="rounded-md border border-line px-3 py-1.5 transition hover:bg-panel2 hover:text-white">
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className={inStudio ? 'min-h-0 flex-1' : 'flex-1 overflow-y-auto'}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/studio" element={<Suspense fallback={<PageFallback />}><StudioPage /></Suspense>} />
          <Route path="/analyze" element={<Suspense fallback={<PageFallback />}><AnalyzePage /></Suspense>} />
          <Route path="/dashboard" element={<Suspense fallback={<PageFallback />}><DashboardPage /></Suspense>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </main>
    </div>
  );
}
