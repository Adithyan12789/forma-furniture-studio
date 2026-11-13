import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Boxes, CheckCircle2, CloudUpload, FileImage, Loader2, RefreshCw, ScanEye, Sparkles, X,
} from 'lucide-react';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import { SAMPLE_ANALYSIS } from '@/features/furniture-analysis/sampleAnalysis';
import { ALL_MATERIAL_KINDS } from '@shared/constants/furniture';
import { useStudioStore } from '@/store/studioStore';
import { analysisToConfig } from '@shared/conversion/analysisToConfig';
import type { FurnitureAnalysis, FurnitureCategory, MaterialKind } from '@shared/types/furniture';
import { FURNITURE_CATEGORIES } from '@shared/constants/furniture';

const COMMON_COMPONENTS = [
  'legs', 'seat', 'backrest', 'armrests', 'cushions', 'top', 'apron',
  'drawers', 'doors', 'shelves', 'headboard', 'footboard', 'mattress',
  'stretchers', 'base', 'frame',
];
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 8;

type Phase = 'idle' | 'creating' | 'uploading' | 'analyzing' | 'done' | 'error';

function errMsg(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string };
  return e.response?.data?.message ?? e.message ?? fallback;
}

function ConfidenceBadge({ confidence, source }: { confidence: number; source: string }) {
  const styles =
    source === 'observed' ? 'border-emerald-800 bg-emerald-950/50 text-emerald-300'
    : source === 'estimated' ? 'border-amber-800 bg-amber-950/50 text-amber-300'
    : 'border-zinc-700 bg-zinc-800/60 text-zinc-400';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${styles}`}>
      {source} · {Math.round(confidence * 100)}%
    </span>
  );
}

function Row({ label, badge, children }: { label: string; badge: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-line py-3.5 last:border-0 sm:grid-cols-[150px_1fr] sm:gap-4">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <div className="mt-1.5">{badge}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

const inputCls =
  'w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-brass';
const chipCls = (on: boolean) =>
  `rounded-full border px-2.5 py-1 text-xs capitalize transition ${on ? 'border-brass bg-brass/10 text-brass' : 'border-line text-zinc-400 hover:border-zinc-600'}`;

export default function AnalyzePage() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const loadConfig = useStudioStore((s) => s.loadConfig);
  const setProjectContext = useStudioStore((s) => s.setProjectContext);
  const [generating, setGenerating] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [dragOver, setDragOver] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<FurnitureAnalysis | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isSample, setIsSample] = useState(false);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    setError('');
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setError('Only JPEG, PNG and WebP images are supported.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Image is larger than ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    if (!projectName) setProjectName(f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
    setAnalysis(null);
    setIsSample(false);
    setSaved(false);
  };

  const runAnalysis = async () => {
    if (!file || !user) return;
    setError('');
    setSaved(false);
    try {
      setPhase('creating');
      const created = await api.post('/projects', { projectName: projectName || 'Untitled project' });
      const id = created.data.project._id as string;
      setProjectId(id);

      setPhase('uploading');
      const form = new FormData();
      form.append('image', file);
      await api.post(`/projects/${id}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });

      setPhase('analyzing');
      const res = await api.post(`/projects/${id}/analyze`);
      setAnalysis(res.data.analysis as FurnitureAnalysis);
      setIsSample(false);
      setPhase('done');
    } catch (err) {
      setPhase('error');
      setError(errMsg(err, 'Analysis failed'));
    }
  };

  const saveAnalysis = async () => {
    if (!analysis) return;
    if (isSample || !projectId) {
      setSaved(true);
      return;
    }
    try {
      await api.put(`/projects/${projectId}/analysis`, { analysis });
      setSaved(true);
    } catch (err) {
      setError(errMsg(err, 'Could not save the confirmed analysis'));
    }
  };

  type AnalysisKey = Exclude<keyof FurnitureAnalysis, 'notes'>;
  const generateModel = async () => {
    if (!analysis) return;
    setGenerating(true);
    setError('');
    try {
      if (!isSample && projectId) {
        if (!saved) {
          await api.put(`/projects/${projectId}/analysis`, { analysis });
          setSaved(true);
        }
        const res = await api.post(`/models/${projectId}/generate`);
        loadConfig(res.data.config);
        setProjectContext({ projectId, projectName: projectName || 'Untitled project' });
      } else {
        // Sample preview: convert locally with the same rules engine.
        loadConfig(analysisToConfig(analysis));
        setProjectContext(null);
      }
      navigate('/studio');
    } catch (err) {
      setError(errMsg(err, 'Model generation failed'));
    } finally {
      setGenerating(false);
    }
  };

  const patch = <K extends AnalysisKey>(key: K, value: FurnitureAnalysis[K]['value']) => {
    setAnalysis((a) => (a ? { ...a, [key]: { ...a[key], value } } : a));
    setSaved(false);
  };

  const busy = phase === 'creating' || phase === 'uploading' || phase === 'analyzing';
  const phaseLabel =
    phase === 'creating' ? 'Creating project…'
    : phase === 'uploading' ? 'Uploading image…'
    : phase === 'analyzing' ? 'AI is analyzing the furniture…'
    : '';

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Analyze furniture</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mist">
        Upload a photo. The vision AI extracts structured properties — category, materials,
        colors, dimensions, components — each with a confidence score. You review and correct
        everything before anything is generated. The AI never builds geometry.
      </p>

      {!user && (
        <div className="mt-6 rounded-xl border border-brass/30 bg-brass/5 px-4 py-3 text-sm text-zinc-200">
          You're not signed in — uploads and AI analysis need an account.{' '}
          <Link to="/login" className="text-brass hover:underline">Sign in</Link> or{' '}
          <Link to="/register" className="text-brass hover:underline">create one</Link>.
          You can still preview the review screen with the sample below.
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Upload column */}
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0] ?? null); }}
            onClick={() => inputRef.current?.click()}
            className={`grid cursor-pointer place-items-center rounded-2xl border-2 border-dashed px-5 py-8 text-center transition ${
              dragOver ? 'border-brass bg-brass/5' : 'border-line bg-panel hover:border-zinc-600'
            }`}
          >
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            {preview ? (
              <img src={preview} alt="Furniture upload preview" className="max-h-64 rounded-lg object-contain" />
            ) : (
              <>
                <CloudUpload size={30} className="text-brass" />
                <p className="mt-3 text-sm font-medium">Drop a furniture photo here, or click to browse</p>
                <p className="mt-1 text-xs text-mist">JPEG, PNG or WebP · up to {MAX_MB} MB</p>
              </>
            )}
          </div>

          {file && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-mist">
              <FileImage size={14} className="shrink-0 text-brass" />
              <span className="flex-1 truncate">{file.name} · {(file.size / 1024).toFixed(0)} KB</span>
              <button onClick={() => { setFile(null); setPreview(''); }} className="rounded p-1 hover:text-white" title="Remove image">
                <X size={14} />
              </button>
            </div>
          )}

          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs text-mist">Project name</span>
            <input className={inputCls} value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="e.g. Oak dining chair" />
          </label>

          <button
            onClick={runAnalysis}
            disabled={!file || !user || busy}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brass px-4 py-3 text-sm font-semibold text-black transition hover:bg-[#e6cb9c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ScanEye size={16} />}
            {busy ? phaseLabel : 'Analyze furniture'}
          </button>

          <button
            onClick={() => { setAnalysis(SAMPLE_ANALYSIS); setIsSample(true); setSaved(false); setPhase('done'); }}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-xs font-medium text-zinc-300 transition hover:bg-panel2"
          >
            <Sparkles size={14} className="text-brass" /> Preview with a sample analysis (no AI call)
          </button>

          {error && (
            <p className="mt-4 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-sm leading-relaxed text-red-300">
              {error}
            </p>
          )}
          {phase === 'done' && !error && (
            <p className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/30 px-3 py-2.5 text-sm text-emerald-300">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              Analysis complete — review and correct the properties on the right.
            </p>
          )}
        </div>

        {/* Analysis column */}
        <div className="rounded-2xl border border-line bg-panel px-5 py-2">
          {!analysis ? (
            <div className="grid h-full min-h-64 place-items-center py-16 text-center">
              <div>
                <ScanEye size={26} className="mx-auto text-zinc-600" />
                <p className="mt-3 text-sm text-mist">
                  Extracted properties will appear here, with confidence scores —
                  ready for you to confirm or correct.
                </p>
              </div>
            </div>
          ) : (
            <>
              {isSample && (
                <p className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
                  Sample analysis for UI preview — not an AI result.
                </p>
              )}
              <Row label="Category" badge={<ConfidenceBadge {...analysis.category} />}>
                <select className={inputCls} value={analysis.category.value}
                  onChange={(e) => patch('category', e.target.value as FurnitureCategory)}>
                  {FURNITURE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
                <input className={`${inputCls} mt-2`} value={analysis.subcategory.value}
                  onChange={(e) => patch('subcategory', e.target.value)} placeholder="Subcategory" />
              </Row>

              <Row label="Design style" badge={<ConfidenceBadge {...analysis.style} />}>
                <input className={inputCls} value={analysis.style.value} onChange={(e) => patch('style', e.target.value)} />
              </Row>

              <Row label="Primary color" badge={<ConfidenceBadge {...analysis.primaryColor} />}>
                <div className="flex items-center gap-2.5">
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(analysis.primaryColor.value) ? analysis.primaryColor.value : '#888888'}
                    onChange={(e) => patch('primaryColor', e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border border-line bg-transparent" />
                  <input className={inputCls} value={analysis.primaryColor.value} onChange={(e) => patch('primaryColor', e.target.value)} />
                </div>
                <input className={`${inputCls} mt-2`} value={analysis.secondaryColors.value.join(', ')}
                  onChange={(e) => patch('secondaryColors', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  placeholder="Secondary colors (comma-separated hex)" />
              </Row>

              <Row label="Materials" badge={<ConfidenceBadge {...analysis.materials} />}>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_MATERIAL_KINDS.map((m) => {
                    const on = analysis.materials.value.includes(m);
                    return (
                      <button key={m} className={chipCls(on)}
                        onClick={() => patch('materials', on
                          ? analysis.materials.value.filter((x) => x !== m)
                          : [...analysis.materials.value, m])}>
                        {m.replace('-', ' ')}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-mist">Finish</span>
                  <select className="rounded-lg border border-line bg-panel2 px-2 py-1.5 text-xs capitalize"
                    value={analysis.finish.value} onChange={(e) => patch('finish', e.target.value)}>
                    {['matte', 'satin', 'gloss', 'raw', 'painted', 'oiled', 'lacquered'].map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </Row>

              <Row label="Dimensions" badge={<ConfidenceBadge {...analysis.dimensions} />}>
                <div className="grid grid-cols-3 gap-2">
                  {(['width', 'height', 'depth'] as const).map((axis) => (
                    <label key={axis} className="block">
                      <span className="mb-1 block text-[11px] capitalize text-mist">{axis} (cm)</span>
                      <input type="number" min={5} max={500} className={inputCls}
                        value={Math.round(analysis.dimensions.value[axis] * 100)}
                        onChange={(e) => patch('dimensions', {
                          ...analysis.dimensions.value,
                          [axis]: Math.max(0.05, (parseFloat(e.target.value) || 0) / 100),
                        })} />
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-zinc-500">
                  Estimated from the photo — correct these if you can measure the real piece.
                </p>
              </Row>

              <Row label="Components" badge={<ConfidenceBadge {...analysis.components} />}>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_COMPONENTS.map((c) => {
                    const on = analysis.components.value.includes(c);
                    return (
                      <button key={c} className={chipCls(on)}
                        onClick={() => patch('components', on
                          ? analysis.components.value.filter((x) => x !== c)
                          : [...analysis.components.value, c])}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Row>

              <Row label="AI notes" badge={<span className="text-[11px] text-zinc-500">Read-only</span>}>
                <p className="text-sm leading-relaxed text-mist">{analysis.notes || '—'}</p>
              </Row>

              <div className="flex items-center gap-3 py-4">
                <button onClick={saveAnalysis} disabled={saved}
                  className="inline-flex items-center gap-2 rounded-lg bg-brass px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#e6cb9c] disabled:opacity-50">
                  <CheckCircle2 size={15} /> {saved ? 'Analysis confirmed' : 'Confirm analysis'}
                </button>
                <span className="text-xs leading-relaxed text-zinc-500">
                  {saved
                    ? 'Saved with the project.'
                    : 'Nothing is generated until you confirm — corrections are saved with the project.'}
                </span>
              </div>
              <div className="flex items-center gap-3 pb-5">
                <button onClick={generateModel} disabled={generating}
                  className="inline-flex items-center gap-2 rounded-lg border border-brass bg-brass/10 px-4 py-2.5 text-sm font-semibold text-brass transition hover:bg-brass/20 disabled:opacity-50">
                  {generating ? <Loader2 size={15} className="animate-spin" /> : <Boxes size={15} />}
                  {generating ? 'Generating…' : 'Generate 3D model'}
                </button>
                <span className="text-xs leading-relaxed text-zinc-500">
                  Converts this analysis into a procedural model and opens it in the Studio,
                  where every part stays editable.
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-6 flex items-center gap-2 text-xs text-zinc-500">
        <RefreshCw size={12} /> AI output is validated against a strict schema before it is stored —
        invalid responses are rejected, never passed to the 3D engine.
      </p>
    </div>
  );
}
