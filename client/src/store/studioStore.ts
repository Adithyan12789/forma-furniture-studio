import { create } from 'zustand';
import type { FurnitureConfig, MaterialKind } from '@shared/types/furniture';
import { DEFAULT_CHAIR_CONFIG } from '@/three/generators/seating/ChairGenerator';

export type CameraPreset = 'perspective' | 'front' | 'back' | 'left' | 'right' | 'top';

interface StudioState {
  config: FurnitureConfig;
  defaultConfig: FurnitureConfig; // reset target for the loaded generator
  preset: CameraPreset;
  presetNonce: number;
  showGrid: boolean;
  autoRotate: boolean;
  selectedComponent: string | null;
  past: FurnitureConfig[];
  future: FurnitureConfig[];
  keyLight: number;     // multiplier 0..2
  envIntensity: number; // 0..1.5
  projectContext: { projectId: string; projectName: string } | null;

  loadConfig: (config: FurnitureConfig) => void;
  setDimension: (key: 'width' | 'height' | 'depth', value: number) => void;
  setMaterial: (component: string, material: MaterialKind, color?: string) => void;
  setMaterialColor: (component: string, color: string) => void;
  setMaterialFinish: (component: string, finish: 'matte' | 'satin' | 'gloss' | 'raw') => void;
  setComponentEnabled: (key: string, enabled: boolean) => void;
  setComponentParam: (key: string, param: string, value: number | string) => void;
  applyPreset: (preset: CameraPreset) => void;
  setShowGrid: (v: boolean) => void;
  setAutoRotate: (v: boolean) => void;
  setSelectedComponent: (key: string | null) => void;
  setProjectContext: (ctx: { projectId: string; projectName: string } | null) => void;
  setKeyLight: (v: number) => void;
  setEnvIntensity: (v: number) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

const clone = (c: FurnitureConfig): FurnitureConfig => JSON.parse(JSON.stringify(c));
const HISTORY_LIMIT = 50;

/**
 * History bookkeeping with burst coalescing: rapid repeated actions of the
 * same kind (e.g. dragging a dimension slider) collapse into one entry,
 * whose snapshot is the state before the burst began.
 */
let lastPushAt = 0;
let lastAction = '';
function hist(s: StudioState, action: string): Partial<StudioState> {
  const now = Date.now();
  const coalesce = now - lastPushAt < 700 && lastAction === action;
  lastPushAt = now;
  lastAction = action;
  if (coalesce) return { future: [] };
  return { past: [...s.past.slice(-(HISTORY_LIMIT - 1)), clone(s.config)], future: [] };
}

export const useStudioStore = create<StudioState>((set) => ({
  config: clone(DEFAULT_CHAIR_CONFIG),
  defaultConfig: clone(DEFAULT_CHAIR_CONFIG),
  preset: 'perspective',
  presetNonce: 0,
  showGrid: true,
  autoRotate: false,
  selectedComponent: null,
  past: [],
  future: [],
  keyLight: 1,
  envIntensity: 0.55,
  projectContext: null,

  loadConfig: (config) => {
    lastAction = '';
    set({
      config: clone(config), defaultConfig: clone(config),
      selectedComponent: null, past: [], future: [],
    });
  },

  setProjectContext: (ctx) => set({ projectContext: ctx }),

  setDimension: (key, value) =>
    set((s) => {
      const config = clone(s.config);
      config.dimensions[key] = value;
      return { config, ...hist(s, `dimension:${key}`) };
    }),

  setMaterial: (component, material, color) =>
    set((s) => {
      const config = clone(s.config);
      const found = config.materials.find((m) => m.component === component);
      if (found) {
        found.material = material;
        if (color !== undefined) found.color = color;
      } else {
        config.materials.push({ component, material, color });
      }
      return { config, ...hist(s, `material:${component}`) };
    }),

  setMaterialColor: (component, color) =>
    set((s) => {
      const config = clone(s.config);
      const found = config.materials.find((m) => m.component === component);
      if (found) found.color = color;
      return { config, ...hist(s, `matcolor:${component}`) };
    }),

  setMaterialFinish: (component, finish) =>
    set((s) => {
      const config = clone(s.config);
      const found = config.materials.find((m) => m.component === component);
      if (found) found.finish = finish;
      return { config, ...hist(s, `finish:${component}`) };
    }),

  setComponentEnabled: (key, enabled) =>
    set((s) => {
      const config = clone(s.config);
      const comp = config.components.find((c) => c.key === key);
      if (comp) comp.enabled = enabled;
      return { config, ...hist(s, `enabled:${key}`) };
    }),

  setComponentParam: (key, param, value) =>
    set((s) => {
      const config = clone(s.config);
      const comp = config.components.find((c) => c.key === key);
      if (comp) comp.params[param] = value;
      return { config, ...hist(s, `param:${key}:${param}`) };
    }),

  applyPreset: (preset) => set((s) => ({ preset, presetNonce: s.presetNonce + 1 })),
  setShowGrid: (v) => set({ showGrid: v }),
  setAutoRotate: (v) => set({ autoRotate: v }),
  setSelectedComponent: (key) => set({ selectedComponent: key }),
  setKeyLight: (v) => set({ keyLight: v }),
  setEnvIntensity: (v) => set({ envIntensity: v }),

  undo: () =>
    set((s) => {
      if (s.past.length === 0) return s;
      lastAction = '';
      const previous = s.past[s.past.length - 1];
      return {
        config: clone(previous),
        past: s.past.slice(0, -1),
        future: [clone(s.config), ...s.future].slice(0, HISTORY_LIMIT),
        selectedComponent: null,
      };
    }),

  redo: () =>
    set((s) => {
      if (s.future.length === 0) return s;
      lastAction = '';
      const [next, ...rest] = s.future;
      return {
        config: clone(next),
        past: [...s.past, clone(s.config)].slice(-HISTORY_LIMIT),
        future: rest,
        selectedComponent: null,
      };
    }),

  reset: () =>
    set((s) => ({
      config: clone(s.defaultConfig),
      selectedComponent: null,
      ...hist(s, 'reset'),
    })),
}));
