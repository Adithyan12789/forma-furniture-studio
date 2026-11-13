import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Armchair } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

function errorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
  return anyErr.response?.data?.message ?? anyErr.message ?? 'Something went wrong';
}

function AuthShell({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-6 py-16">
      <span className="mb-5 grid h-11 w-11 place-items-center rounded-xl bg-brass/15 text-brass">
        <Armchair size={20} />
      </span>
      <h1 className="font-display text-2xl font-semibold">{title}</h1>
      <div className="mt-7">{children}</div>
      <p className="mt-6 text-sm text-mist">{footer}</p>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-line bg-panel2 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-brass placeholder:text-zinc-600';
const btnCls =
  'w-full rounded-lg bg-brass px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e6cb9c] disabled:opacity-50';

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell
      title="Welcome back"
      footer={<>No account yet? <Link to="/register" className="text-brass hover:underline">Create one</Link></>}
    >
      <form
        className="space-y-3.5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true); setError('');
          try { await login(email, password); navigate('/analyze'); }
          catch (err) { setError(errorMessage(err)); }
          finally { setBusy(false); }
        }}
      >
        <input className={inputCls} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button className={btnCls} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <AuthShell
      title="Create your account"
      footer={<>Already registered? <Link to="/login" className="text-brass hover:underline">Sign in</Link></>}
    >
      <form
        className="space-y-3.5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true); setError('');
          try { await register(name, email, password); navigate('/analyze'); }
          catch (err) { setError(errorMessage(err)); }
          finally { setBusy(false); }
        }}
      >
        <input className={inputCls} required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} type="password" required minLength={8} placeholder="Password (8+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
        <button className={btnCls} disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}
