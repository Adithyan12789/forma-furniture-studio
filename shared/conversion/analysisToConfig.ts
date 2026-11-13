import type {
  FurnitureAnalysis, FurnitureConfig, MaterialKind,
} from '../types/furniture';
import { FURNITURE_CATEGORIES, DEFAULT_DIMENSIONS } from '../constants/furniture';
import { furnitureConfigSchema } from '../schemas/configSchema';

/**
 * Analysis → FurnitureConfig conversion (Phase 5).
 *
 * This is a deterministic rules engine, not AI: a validated analysis goes
 * in, an editable procedural configuration comes out. Unknown properties
 * fall back to per-generator defaults — nothing is invented beyond the
 * documented defaults, and the result is validated before it is returned.
 *
 * The server keeps a JavaScript mirror of this file
 * (server/src/services/generation/analysisToConfig.js). Keep them in sync.
 */

const WOODS: MaterialKind[] = ['oak', 'walnut', 'mahogany', 'teak', 'pine', 'birch'];
const FABRICS: MaterialKind[] = ['cotton', 'linen', 'velvet', 'leather', 'synthetic-leather'];
const METALS: MaterialKind[] = ['stainless-steel', 'aluminum', 'iron'];
const SURFACES: MaterialKind[] = ['marble', 'glass', 'concrete'];

type Template = Pick<FurnitureConfig, 'components' | 'materials'>;

const TEMPLATES: Record<string, Template> = {
  chair: {
    components: [
      { key: 'legs', enabled: true, params: { legHeight: 0.45, legTaper: 0.6 } },
      { key: 'seat', enabled: true, params: { thickness: 0.04 } },
      { key: 'backrest', enabled: true, params: { height: 0.47, slats: 3 } },
      { key: 'stretchers', enabled: true, params: {} },
      { key: 'cushion', enabled: false, params: { thickness: 0.035 } },
    ],
    materials: [
      { component: 'frame', material: 'oak' },
      { component: 'cushion', material: 'cotton', color: '#b8ab90' },
    ],
  },
  'office-chair': {
    components: [
      { key: 'base', enabled: true, params: {} },
      { key: 'lift', enabled: true, params: {} },
      { key: 'seat', enabled: true, params: { seatHeight: 0.48 } },
      { key: 'backrest', enabled: true, params: { backHeight: 0.55 } },
      { key: 'armrests', enabled: true, params: {} },
    ],
    materials: [
      { component: 'upholstery', material: 'synthetic-leather', color: '#3c4043' },
      { component: 'base', material: 'aluminum' },
      { component: 'shell', material: 'plastic', color: '#242628' },
    ],
  },
  armchair: {
    components: [
      { key: 'frame', enabled: true, params: { armHeight: 0.62, seatHeight: 0.42 } },
      { key: 'cushions', enabled: true, params: { seats: 1 } },
      { key: 'armrests', enabled: true, params: {} },
      { key: 'backrest', enabled: true, params: {} },
      { key: 'feet', enabled: true, params: { height: 0.1 } },
    ],
    materials: [
      { component: 'upholstery', material: 'leather', color: '#8a5a3b' },
      { component: 'feet', material: 'oak' },
    ],
  },
  sofa: {
    components: [
      { key: 'frame', enabled: true, params: { armHeight: 0.66, seatHeight: 0.44 } },
      { key: 'cushions', enabled: true, params: { seats: 3 } },
      { key: 'armrests', enabled: true, params: {} },
      { key: 'backrest', enabled: true, params: {} },
      { key: 'feet', enabled: true, params: { height: 0.1 } },
    ],
    materials: [
      { component: 'upholstery', material: 'velvet', color: '#66755f' },
      { component: 'feet', material: 'walnut' },
    ],
  },
  table: {
    components: [
      { key: 'top', enabled: true, params: { thickness: 0.035, shape: 'rect' } },
      { key: 'legs', enabled: true, params: { legStyle: 'tapered' } },
      { key: 'apron', enabled: true, params: {} },
      { key: 'drawers', enabled: false, params: { count: 2 } },
      { key: 'shelf', enabled: false, params: {} },
    ],
    materials: [
      { component: 'top', material: 'walnut' },
      { component: 'legs', material: 'walnut' },
      { component: 'drawers', material: 'walnut' },
    ],
  },
  bed: {
    components: [
      { key: 'frame', enabled: true, params: { headboardHeight: 1.05, footboard: false, headboardStyle: 'panel' } },
      { key: 'slats', enabled: true, params: {} },
      { key: 'mattress', enabled: true, params: { thickness: 0.2 } },
      { key: 'pillows', enabled: true, params: { count: 2 } },
    ],
    materials: [
      { component: 'frame', material: 'oak' },
      { component: 'mattress', material: 'cotton', color: '#e8e4da' },
      { component: 'pillows', material: 'linen', color: '#ddd5c3' },
    ],
  },
  wardrobe: {
    components: [
      { key: 'carcass', enabled: true, params: {} },
      { key: 'doors', enabled: true, params: { count: 2 } },
      { key: 'cornice', enabled: true, params: {} },
    ],
    materials: [
      { component: 'body', material: 'oak' },
      { component: 'doors', material: 'oak' },
      { component: 'hardware', material: 'iron' },
    ],
  },
  cabinet: {
    components: [
      { key: 'carcass', enabled: true, params: {} },
      { key: 'drawers', enabled: true, params: { count: 2 } },
      { key: 'doors', enabled: true, params: { count: 2 } },
      { key: 'legs', enabled: true, params: { height: 0.12 } },
    ],
    materials: [
      { component: 'body', material: 'walnut' },
      { component: 'drawers', material: 'walnut' },
      { component: 'doors', material: 'walnut' },
      { component: 'hardware', material: 'stainless-steel' },
    ],
  },
  bookshelf: {
    components: [
      { key: 'carcass', enabled: true, params: {} },
      { key: 'shelves', enabled: true, params: { levels: 4 } },
    ],
    materials: [
      { component: 'body', material: 'oak' },
      { component: 'shelves', material: 'oak' },
    ],
  },
};

const UPHOLSTERY_COMPONENTS = ['upholstery', 'cushion', 'mattress', 'pillows'];
const HARDWARE_COMPONENTS = ['hardware', 'base'];
const GATED_COMPONENTS = ['cushion', 'armrests', 'stretchers', 'drawers', 'shelf'];

const SYNONYMS: Record<string, string[]> = {
  cushion: ['cushion', 'cushions'],
  armrests: ['armrests', 'armrest', 'arms'],
  stretchers: ['stretchers', 'stretcher', 'rungs'],
  drawers: ['drawers', 'drawer'],
  shelf: ['shelf', 'lower shelf'],
};

const FINISH_MAP: Record<string, 'matte' | 'satin' | 'gloss' | 'raw'> = {
  matte: 'matte', satin: 'satin', gloss: 'gloss', glossy: 'gloss', raw: 'raw',
  oiled: 'satin', lacquered: 'gloss', polished: 'gloss', painted: 'satin',
  waxed: 'satin', unfinished: 'raw',
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const isHex = (s: string) => /^#[0-9a-f]{6}$/i.test(s);

export function generatorForCategory(category: string): string {
  return FURNITURE_CATEGORIES.find((c) => c.id === category)?.generator ?? 'chair';
}

export function analysisToConfig(analysis: FurnitureAnalysis): FurnitureConfig {
  const category = analysis.category.value;
  const generator = generatorForCategory(category);
  const template = structuredClone(TEMPLATES[generator] ?? TEMPLATES.chair);

  /* ---- dimensions: analysis value, else per-type default -------------- */
  let dimensions = { ...(DEFAULT_DIMENSIONS[generator] ?? DEFAULT_DIMENSIONS.chair) };
  if (analysis.dimensions.source !== 'unknown') {
    const d = analysis.dimensions.value;
    dimensions = {
      width: clamp(d.width || dimensions.width, 0.25, 3.5),
      height: clamp(d.height || dimensions.height, 0.25, 3),
      depth: clamp(d.depth || dimensions.depth, 0.25, 3),
    };
  }
  if (category === 'coffee-table') dimensions.height = clamp(dimensions.height, 0.3, 0.55);
  if (category === 'sectional-sofa') dimensions.width = clamp(dimensions.width, 2.2, 3.5);

  const components = template.components;
  const setParam = (key: string, param: string, value: number | string | boolean) => {
    const comp = components.find((c) => c.key === key);
    if (comp) comp.params = { ...(comp.params ?? {}), [param]: value };
  };
  const setEnabled = (key: string, enabled: boolean) => {
    const comp = components.find((c) => c.key === key);
    if (comp) comp.enabled = enabled;
  };

  /* ---- category-specific parameters ------------------------------------ */
  if (generator === 'sofa' || generator === 'armchair') {
    const sub = `${analysis.subcategory.value} ${analysis.notes}`.toLowerCase();
    let seats = generator === 'armchair' ? 1 : 3;
    if (/love ?seat|two|2-seat/.test(sub)) seats = 2;
    if (/four|4-seat|sectional/.test(sub)) seats = 4;
    if (category === 'sectional-sofa') seats = 4;
    setParam('cushions', 'seats', seats);
  }
  if (generator === 'table') {
    if (category === 'desk') { setEnabled('drawers', true); setParam('drawers', 'count', 2); }
    if (category === 'coffee-table' && /round|circular/.test(analysis.subcategory.value.toLowerCase())) {
      setParam('top', 'shape', 'round');
    }
  }
  if (generator === 'wardrobe') {
    if (dimensions.width >= 1.5) setParam('doors', 'count', 3);
    if (dimensions.width >= 2.0) setParam('doors', 'count', 4);
  }
  if (generator === 'bookshelf') {
    const levels = clamp(Math.round(dimensions.height / 0.42), 2, 6);
    setParam('shelves', 'levels', levels);
  }

  /* ---- component gating from detected components ----------------------- */
  if (analysis.components.source !== 'unknown') {
    const detected = analysis.components.value.map((c) => c.toLowerCase().trim());
    for (const key of GATED_COMPONENTS) {
      const synonyms = SYNONYMS[key] ?? [key];
      const seen = detected.some((d) => synonyms.includes(d));
      if (key === 'cushion') setEnabled('cushion', seen);
      else if (key === 'drawers' && generator === 'table') {
        if (category !== 'desk') setEnabled('drawers', seen);
      } else if (components.some((c) => c.key === key)) {
        setEnabled(key, seen);
      }
    }
    if (generator === 'bed' && detected.includes('footboard')) {
      setParam('frame', 'footboard', true);
    }
  }

  /* ---- materials -------------------------------------------------------- */
  const found = analysis.materials.value as MaterialKind[];
  const firstWood = found.find((m) => WOODS.includes(m));
  const firstFabric = found.find((m) => FABRICS.includes(m));
  const firstMetal = found.find((m) => METALS.includes(m));
  const firstSurface = found.find((m) => SURFACES.includes(m));
  const primaryColor = analysis.primaryColor.value;
  const finish = FINISH_MAP[analysis.finish.value.toLowerCase()] ?? 'satin';

  const materials = template.materials.map((assignment) => {
    const next = { ...assignment, finish };
    if (UPHOLSTERY_COMPONENTS.includes(assignment.component)) {
      if (firstFabric) next.material = firstFabric;
      if (isHex(primaryColor)) next.color = primaryColor;
    } else if (assignment.component === 'top' && firstSurface) {
      next.material = firstSurface;
    } else if (HARDWARE_COMPONENTS.includes(assignment.component)) {
      if (firstMetal) next.material = firstMetal;
    } else if (WOODS.includes(assignment.material as MaterialKind) && firstWood) {
      next.material = firstWood;
    }
    return next;
  });

  const config: FurnitureConfig = {
    category: category as FurnitureConfig['category'],
    generator,
    dimensions,
    components,
    materials,
    style: analysis.style.source === 'unknown' ? 'contemporary' : analysis.style.value,
  };

  // Never hand an invalid configuration to the engine.
  return furnitureConfigSchema.parse(config) as FurnitureConfig;
}
