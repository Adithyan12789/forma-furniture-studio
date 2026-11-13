import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Box, Camera, Download, Eye, Grid3X3, History, Lightbulb, RotateCcw, RotateCw, Save, Undo2, Redo2,
} from 'lucide-react';
import { useStudioStore, type CameraPreset } from '@/store/studioStore';
import { modelGroupRef } from '@/three/scene/modelRegistry';
import { api } from '@/services/api';
import { exportModel, downloadBlob } from '@/three/export/exportModel';
import { GENERATORS } from '@/three/generators';
import { PARAM_SLIDERS, PARAM_OPTIONS, TOGGLEABLE } from '@/three/generators/controls';
import { WOOD_SPECS } from '@/three/textures/proceduralTextures';
import { fetchHealth } from '@/services/api';
import type { MaterialKind } from '@shared/types/furniture';

// Heavy 3D modules load lazily (development rule #16).
const Viewport = lazy(() => import('@/three/scene/Viewport'));

const PRESETS: { id: CameraPreset; label: string }[] = [
  { id: 'perspective', label: '3/4 View' },
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'top', label: 'Top' },
];

const WOODS = Object.keys(WOOD_SPECS);
const FABRIC_COLORS = ['#66755f', '#7a4a3a', '#44506b', '#8a5a3b', '#b0a696', '#4c4c50', '#946b81', '#2f4f4f'];
const label = (key: string) => key.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

function Slider({
  label: text, value, min, max, step = 0.005, onChange, format,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (v: number) => string;
}) {
  const shown = format ? format(value) : `${Math.round(value * 100)} cm`;
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-mist">{text}</span>
        <span className="font-medium text-zinc-200">{shown}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

export default function StudioPage() {
  const config = useStudioStore((s) => s.config);
  const loadConfig = useStudioStore((s) => s.loadConfig);
  const setDimension = useStudioStore((s) => s.setDimension);
  const setMaterial = useStudioStore((s) => s.setMaterial);
  const setMaterialColor = useStudioStore((s) => s.setMaterialColor);
  const setMaterialFinish = useStudioStore((s) => s.setMaterialFinish);
  const setComponentEnabled = useStudioStore((s) => s.setComponentEnabled);
  const setComponentParam = useStudioStore((s) => s.setComponentParam);
  const applyPreset = useStudioStore((s) => s.applyPreset);
  const preset = useStudioStore((s) => s.preset);
  const showGrid = useStudioStore((s) => s.showGrid);
  const setShowGrid = useStudioStore((s) => s.setShowGrid);
  const autoRotate = useStudioStore((s) => s.autoRotate);
  const setAutoRotate = useStudioStore((s) => s.setAutoRotate);
  const selected = useStudioStore((s) => s.selectedComponent);
  const setSelected = useStudioStore((s) => s.setSelectedComponent);
  const reset = useStudioStore((s) => s.reset);
  const undo = useStudioStore((s) => s.undo);
  const redo = useStudioStore((s) => s.redo);
  const canUndo = useStudioStore((s) => s.past.length > 0);
  const canRedo = useStudioStore((s) => s.future.length > 0);
  const keyLight = useStudioStore((s) => s.keyLight);
  const setKeyLight = useStudioStore((s) => s.setKeyLight);
  const envIntensity = useStudioStore((s) => s.envIntensity);
  const setEnvIntensity = useStudioStore((s) => s.setEnvIntensity);
  const projectContext = useStudioStore((s) => s.projectContext);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState('');
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<{ version: number; createdAt: string; hasConfig: boolean; generator: string | null }[]>([]);

  const handleSave = async () => {
    if (!projectContext || saving) return;
    setSaving(true);
    try {
      const res = await api.post(`/models/${projectContext.projectId}/save`, { config });
      setSavedNote(`Saved as v${res.data.version}`);
      setTimeout(() => setSavedNote(''), 3500);
    } catch {
      setSavedNote('Save failed');
      setTimeout(() => setSavedNote(''), 3500);
    } finally {
      setSaving(false);
    }
  };

  const toggleVersions = async () => {
    if (!projectContext) return;
    if (!showVersions) {
      try {
        const res = await api.get(`/models/${projectContext.projectId}/versions`);
        setVersions(res.data.versions);
      } catch { setVersions([]); }
    }
    setShowVersions((v) => !v);
  };

  const loadVersion = async (version: number) => {
    if (!projectContext) return;
    try {
      const res = await api.get(`/models/${projectContext.projectId}/versions/${version}`);
      if (res.data.model?.config) loadConfig(res.data.model.config);
      setShowVersions(false);
    } catch { /* keep panel open on failure */ }
  };

  const [exporting, setExporting] = useState<'glb' | 'gltf' | null>(null);
  const [exportError, setExportError] = useState('');

  const handleExport = async (format: 'glb' | 'gltf') => {
    const group = modelGroupRef.current;
    if (!group || exporting) return;
    setExporting(format);
    setExportError('');
    try {
      const blob = await exportModel(group, format === 'glb');
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `forma-${config.generator}-${stamp}.${format}`);
    } catch {
      setExportError('Export failed — the model could not be serialized.');
    } finally {
      setExporting(null);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const [apiState, setApiState] = useState('checking…');
  useEffect(() => {
    fetchHealth().then((h) => setApiState(h ? `API online · DB ${h.db}` : 'API offline (design mode)'));
  }, []);

  const dims = config.dimensions;
  const gen = config.generator;
  const genLabel = GENERATORS.find((g) => g.id === gen)?.label ?? label(gen);
  const toggleable = TOGGLEABLE[gen] ?? [];
  const sliders = PARAM_SLIDERS[gen] ?? [];
  const optionSets = PARAM_OPTIONS[gen] ?? [];
  const paramValue = (component: string, param: string) =>
    config.components.find((c) => c.key === component)?.params[param];
  const enabledOf = (key: string) => config.components.find((c) => c.key === key)?.enabled ?? true;

  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar */}
      <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-coal px-4 py-2">
        <Box size={16} className="text-brass" />
        <span className="text-sm font-medium">{genLabel}</span>
        <span className="hidden rounded-full border border-line px-2.5 py-0.5 text-[11px] text-mist sm:inline">
          {apiState}
        </span>
        <div className="order-3 flex w-full flex-wrap gap-1.5 lg:order-none lg:w-auto lg:flex-1 lg:justify-center">
          {GENERATORS.map((g) => (
            <button
              key={g.id}
              onClick={() => loadConfig(g.defaultConfig)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                gen === g.id
                  ? 'border-brass bg-brass/10 text-brass'
                  : 'border-line text-zinc-300 hover:border-zinc-600 hover:text-white'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className="rounded-md p-2 transition enabled:hover:bg-panel2 enabled:text-zinc-200 disabled:text-zinc-700">
            <Undo2 size={16} />
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)"
            className="rounded-md p-2 transition enabled:hover:bg-panel2 enabled:text-zinc-200 disabled:text-zinc-700">
            <Redo2 size={16} />
          </button>
          <span className="mx-0.5 h-5 w-px bg-line" />
          <button onClick={() => handleExport('glb')} disabled={!!exporting} title="Export binary glTF"
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium transition hover:bg-panel2 disabled:opacity-50">
            <Download size={13} /> GLB
          </button>
          <button onClick={() => handleExport('gltf')} disabled={!!exporting} title="Export JSON glTF"
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium transition hover:bg-panel2 disabled:opacity-50">
            <Download size={13} /> glTF
          </button>
          {projectContext && (
            <>
              <span className="mx-0.5 h-5 w-px bg-line" />
              <button onClick={handleSave} disabled={saving} title={`Save edits to "${projectContext.projectName}" as a new version`}
                className="inline-flex items-center gap-1.5 rounded-md bg-brass px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#e6cb9c] disabled:opacity-50">
                <Save size={13} /> {saving ? 'Saving…' : savedNote || 'Save'}
              </button>
              <div className="relative">
                <button onClick={toggleVersions} title="Model version history"
                  className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium transition hover:bg-panel2">
                  <History size={13} /> Versions
                </button>
                {showVersions && (
                  <div className="absolute right-0 top-9 z-30 w-64 rounded-xl border border-line bg-coal p-2 shadow-xl shadow-black/50">
                    {versions.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-mist">No versions yet.</p>
                    ) : versions.map((v) => (
                      <div key={v.version} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-panel2">
                        <span className="font-semibold text-zinc-100">v{v.version}</span>
                        <span className="flex-1 text-zinc-500">
                          {new Date(v.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          {v.hasConfig ? '' : ' · analysis only'}
                        </span>
                        {v.hasConfig && (
                          <button onClick={() => loadVersion(v.version)} className="text-brass hover:underline">Load</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <button
            onClick={reset}
            className="ml-1 inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-medium transition hover:bg-panel2"
          >
            <RotateCcw size={13} /> Reset model
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left: hierarchy from the live config */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-coal md:flex">
          <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Components
          </p>
          <div className="space-y-1 px-2 py-2">
            {config.components.map((comp) => {
              const canToggle = toggleable.includes(comp.key);
              return (
                <div
                  key={comp.key}
                  onClick={() => setSelected(comp.key)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition ${
                    selected === comp.key ? 'bg-panel2 text-white' : 'text-zinc-300 hover:bg-panel'
                  }`}
                >
                  <Box size={14} className={comp.enabled ? 'text-brass' : 'text-zinc-600'} />
                  <span className={`flex-1 ${comp.enabled ? '' : 'text-zinc-500 line-through decoration-zinc-700'}`}>
                    {label(comp.key)}
                  </span>
                  {canToggle && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setComponentEnabled(comp.key, !comp.enabled);
                      }}
                      className="rounded p-1 text-mist transition hover:text-white"
                      title={comp.enabled ? 'Disable component' : 'Enable component'}
                    >
                      <Eye size={14} className={comp.enabled ? '' : 'opacity-40'} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-auto border-t border-line p-4 text-[11px] leading-relaxed text-zinc-500">
            Generated procedurally by the <span className="text-zinc-300">{genLabel} generator</span> —
            real geometry from code. No imported meshes, no image-to-3D.
          </div>
        </aside>

        {/* Center: viewport */}
        <section className="relative min-w-0 flex-1 bg-ink">
          <Suspense
            fallback={<div className="grid h-full place-items-center text-sm text-mist">Loading 3D engine…</div>}
          >
            <Viewport />
          </Suspense>

          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-2">
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-xl border border-line bg-coal/90 p-1.5 backdrop-blur">
              <Camera size={14} className="ml-1.5 mr-1 text-zinc-500" />
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                    preset === p.id ? 'bg-brass text-black' : 'text-zinc-300 hover:bg-panel2'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <span className="mx-1 h-5 w-px bg-line" />
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`rounded-lg p-2 transition ${showGrid ? 'bg-panel2 text-brass' : 'text-zinc-400 hover:bg-panel2'}`}
                title="Toggle grid"
              >
                <Grid3X3 size={14} />
              </button>
              <span className="mx-1 h-5 w-px bg-line" />
              <span className="flex items-center gap-1.5 px-1" title="Key light intensity">
                <Lightbulb size={13} className="text-zinc-500" />
                <input type="range" min={0} max={2} step={0.05} value={keyLight}
                  onChange={(e) => setKeyLight(parseFloat(e.target.value))}
                  className="w-16 accent-[#d8b98a]" />
              </span>
              <span className="flex items-center gap-1.5 px-1" title="Environment reflection intensity">
                <span className="text-[10px] uppercase tracking-wide text-zinc-500">Env</span>
                <input type="range" min={0} max={1.5} step={0.05} value={envIntensity}
                  onChange={(e) => setEnvIntensity(parseFloat(e.target.value))}
                  className="w-16 accent-[#d8b98a]" />
              </span>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className={`rounded-lg p-2 transition ${autoRotate ? 'bg-panel2 text-brass' : 'text-zinc-400 hover:bg-panel2'}`}
                title="Auto-rotate"
              >
                <RotateCw size={14} />
              </button>
            </div>
          </div>

          {exportError && (
            <div className="absolute right-4 top-4 rounded-lg border border-red-900/60 bg-red-950/70 px-3 py-2 text-[11px] text-red-300 backdrop-blur">
              {exportError}
            </div>
          )}
          <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-line bg-coal/85 px-3 py-2 text-[11px] leading-relaxed text-mist backdrop-blur">
            Drag to orbit · Scroll to zoom · Click a part to select it
            <br />
            {Math.round(dims.width * 100)} × {Math.round(dims.depth * 100)} × {Math.round(dims.height * 100)} cm
            {config.style ? ` · ${config.style}` : ''}
          </div>
        </section>

        {/* Right: properties, driven by the live config */}
        <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-line bg-coal p-4 lg:flex">
          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Dimensions</p>
            <div className="space-y-3.5">
              <Slider label="Width" value={dims.width} min={0.3} max={3} onChange={(v) => setDimension('width', v)} />
              <Slider label="Depth" value={dims.depth} min={0.25} max={2.6} onChange={(v) => setDimension('depth', v)} />
              <Slider label="Height" value={dims.height} min={0.3} max={2.6} onChange={(v) => setDimension('height', v)} />
            </div>
          </div>

          {sliders.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Design</p>
              <div className="space-y-3.5">
                {sliders.map((s) => (
                  <Slider
                    key={s.component + s.param}
                    label={s.label}
                    value={Number(paramValue(s.component, s.param) ?? s.min)}
                    min={s.min} max={s.max} step={s.step}
                    onChange={(v) => setComponentParam(s.component, s.param, v)}
                    format={
                      s.format === 'int' ? (v) => `${Math.round(v)}`
                      : s.format === 'mm' ? (v) => `${Math.round(v * 1000)} mm`
                      : undefined
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {optionSets.map((os) => (
            <div key={os.component + os.param}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{os.label}</p>
              <div className="flex flex-wrap gap-2">
                {os.options.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => setComponentParam(os.component, os.param, o.value)}
                    className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                      paramValue(os.component, os.param) === o.value
                        ? 'border-brass bg-brass/10 text-brass'
                        : 'border-line text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {config.materials.map((assignment) => {
            const kind = assignment.material;
            const isWood = (WOODS as string[]).includes(kind);
            return (
              <div key={assignment.component}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  {label(assignment.component)} · material
                </p>
                <select
                  value={kind}
                  onChange={(e) => setMaterial(assignment.component, e.target.value as MaterialKind)}
                  className="w-full rounded-lg border border-line bg-panel2 px-2.5 py-2 text-sm capitalize text-zinc-100 outline-none focus:border-brass"
                >
                  <optgroup label="Wood">
                    {WOODS.map((w) => <option key={w} value={w}>{w}</option>)}
                  </optgroup>
                  <optgroup label="Upholstery">
                    {['cotton', 'linen', 'velvet', 'leather', 'synthetic-leather'].map((u) => (
                      <option key={u} value={u}>{u.replace('-', ' ')}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Metal">
                    {['stainless-steel', 'aluminum', 'iron'].map((m) => (
                      <option key={m} value={m}>{m.replace('-', ' ')}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Stone, glass & synthetic">
                    {['marble', 'concrete', 'glass', 'plastic'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </optgroup>
                </select>

                {!isWood && (
                  <div className="mt-2.5 flex items-center gap-2">
                    {FABRIC_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setMaterialColor(assignment.component, c)}
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          assignment.color === c ? 'border-brass' : 'border-transparent hover:border-zinc-500'
                        }`}
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                    <input
                      type="color"
                      value={assignment.color ?? '#888888'}
                      onChange={(e) => setMaterialColor(assignment.component, e.target.value)}
                      className="h-7 w-9 cursor-pointer rounded border border-line bg-transparent"
                      title="Custom color"
                    />
                  </div>
                )}

                <div className="mt-2.5 flex gap-1.5">
                  {(['raw', 'matte', 'satin', 'gloss'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setMaterialFinish(assignment.component, f)}
                      className={`flex-1 rounded-md border px-1 py-1.5 text-[11px] capitalize transition ${
                        (assignment.finish ?? 'satin') === f
                          ? 'border-brass bg-brass/10 text-brass'
                          : 'border-line text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {toggleable.length > 0 && (
            <div>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">Components</p>
              <div className="space-y-2">
                {toggleable.map((key) => (
                  <button
                    key={key}
                    onClick={() => setComponentEnabled(key, !enabledOf(key))}
                    className="flex w-full items-center justify-between rounded-lg border border-line bg-panel2 px-3 py-2 text-xs transition hover:border-zinc-600"
                  >
                    <span className="text-zinc-300">{label(key)}</span>
                    <span className="relative rounded-full transition" style={{ height: 18, width: 32, background: enabledOf(key) ? 'var(--color-brass)' : '#3f3f46' }}>
                      <span
                        className="absolute top-0.5 rounded-full bg-white transition-all"
                        style={{ left: enabledOf(key) ? 16 : 2, width: 14, height: 14 }}
                      />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
