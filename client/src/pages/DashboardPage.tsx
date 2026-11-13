import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Boxes, Clock3, ImageOff, Loader2, Plus, ScanEye, Trash2 } from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { useStudioStore } from '@/store/studioStore';
import type { FurnitureConfig } from '@shared/types/furniture';

interface ProjectItem {
  _id: string;
  projectName: string;
  originalImage?: string;
  furnitureCategory?: string;
  furnitureType?: string;
  status: 'draft' | 'analyzed' | 'model-generated';
  updatedAt: string;
  modelVersion: number;
  hasConfig: boolean;
  hasAnalysis: boolean;
}

const STATUS_STYLES: Record<ProjectItem['status'], string> = {
  draft: 'border-zinc-700 bg-zinc-800/60 text-zinc-300',
  analyzed: 'border-amber-800 bg-amber-950/50 text-amber-300',
  'model-generated': 'border-emerald-800 bg-emerald-950/50 text-emerald-300',
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const navigate = useNavigate();
  const loadConfig = useStudioStore((s) => s.loadConfig);
  const setProjectContext = useStudioStore((s) => s.setProjectContext);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data.projects);
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message ?? 'Could not load your projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); else if (ready) setLoading(false); }, [user, ready]);

  const openInStudio = async (p: ProjectItem) => {
    setOpeningId(p._id);
    try {
      const res = await api.get(`/projects/${p._id}`);
      let config = res.data.model?.config as FurnitureConfig | null;
      if (!config && res.data.model?.analysis) {
        // Analyzed but never generated: generate now, then open.
        const gen = await api.post(`/models/${p._id}/generate`);
        config = gen.data.config as FurnitureConfig;
      }
      if (config) {
        loadConfig(config);
        setProjectContext({ projectId: p._id, projectName: p.projectName });
        navigate('/studio');
      } else {
        navigate('/analyze');
      }
    } catch {
      setError('Could not open that project');
    } finally {
      setOpeningId(null);
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch {
      setError('Delete failed');
    } finally {
      setConfirmDelete(null);
    }
  };

  if (!user && ready) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-semibold">Your projects live here</h1>
        <p className="mt-3 text-sm text-mist">
          Sign in to see saved furniture projects, reopen models in the Studio, and track versions.
        </p>
        <Link to="/login" className="mt-6 inline-block rounded-lg bg-brass px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#e6cb9c]">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1.5 text-sm text-mist">Every analyzed photo and generated model, saved and versioned.</p>
        </div>
        <Link to="/analyze" className="ml-auto inline-flex items-center gap-2 rounded-lg bg-brass px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e6cb9c]">
          <Plus size={15} /> New analysis
        </Link>
      </div>

      {error && <p className="mt-5 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-sm text-red-300">{error}</p>}

      {loading ? (
        <p className="flex items-center gap-2 py-16 text-sm text-mist"><Loader2 size={16} className="animate-spin" /> Loading projects…</p>
      ) : projects.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line bg-panel px-6 py-14 text-center">
          <ScanEye size={26} className="mx-auto text-zinc-600" />
          <p className="mt-3 text-sm text-mist">No projects yet — analyze your first furniture photo.</p>
          <Link to="/analyze" className="mt-4 inline-block text-sm text-brass hover:underline">Go to Analyze →</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <article key={p._id} className="overflow-hidden rounded-2xl border border-line bg-panel">
              <div className="grid aspect-[16/9] place-items-center bg-panel2">
                {p.originalImage ? (
                  <img src={p.originalImage} alt={p.projectName} className="h-full w-full object-cover" />
                ) : (
                  <ImageOff size={22} className="text-zinc-600" />
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start gap-2">
                  <h2 className="flex-1 truncate text-sm font-semibold text-zinc-100">{p.projectName}</h2>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[p.status]}`}>
                    {p.status.replace('-', ' ')}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs capitalize text-mist">
                  {p.furnitureType || p.furnitureCategory || 'Not analyzed yet'}
                  {p.modelVersion > 0 ? ` · model v${p.modelVersion}` : ''}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500">
                  <Clock3 size={11} /> Updated {new Date(p.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div className="mt-3.5 flex items-center gap-2">
                  <button onClick={() => openInStudio(p)} disabled={openingId === p._id}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brass px-3 py-2 text-xs font-semibold text-black transition hover:bg-[#e6cb9c] disabled:opacity-50">
                    {openingId === p._id ? <Loader2 size={13} className="animate-spin" /> : <Boxes size={13} />}
                    {p.hasConfig ? 'Open in Studio' : 'Continue'}
                  </button>
                  {confirmDelete === p._id ? (
                    <>
                      <button onClick={() => remove(p._id)} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="rounded-lg border border-line px-3 py-2 text-xs hover:bg-panel2">Keep</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(p._id)} title="Delete project"
                      className="rounded-lg border border-line p-2 text-zinc-400 transition hover:border-red-900 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
