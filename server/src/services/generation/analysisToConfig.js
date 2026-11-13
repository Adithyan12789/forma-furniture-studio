import { z } from 'zod';

/**
 * JavaScript mirror of shared/conversion/analysisToConfig.ts — keep in sync.
 * Deterministic rules: validated analysis in, editable FurnitureConfig out.
 * Unknown properties fall back to per-generator defaults.
 */

export const furnitureConfigSchema = z.object({
  category: z.string(),
  generator: z.string(),
  dimensions: z.object({
    width: z.number().positive().max(10),
    height: z.number().positive().max(10),
    depth: z.number().positive().max(10),
  }),
  components: z.array(z.object({
    key: z.string(),
    label: z.string().optional(),
    enabled: z.boolean(),
    params: z.record(z.union([z.number(), z.string(), z.boolean()])),
  })),
  materials: z.array(z.object({
    component: z.string(),
    material: z.string(),
    color: z.string().optional(),
    finish: z.enum(['matte', 'satin', 'gloss', 'raw']).optional(),
  })),
  style: z.string().optional(),
});

const CATEGORY_GENERATOR = {
  chair: 'chair', 'office-chair': 'office-chair', 'dining-chair': 'chair',
  armchair: 'armchair', sofa: 'sofa', 'sectional-sofa': 'sofa',
  'dining-table': 'table', 'coffee-table': 'table', desk: 'table',
  bed: 'bed', wardrobe: 'wardrobe', cabinet: 'cabinet',
  bookshelf: 'bookshelf', storage: 'cabinet', other: 'chair',
};

const DEFAULT_DIMENSIONS = {
  chair: { width: 0.46, height: 0.9, depth: 0.52 },
  'office-chair': { width: 0.62, height: 1.05, depth: 0.62 },
  armchair: { width: 0.86, height: 0.88, depth: 0.88 },
  table: { width: 1.4, height: 0.75, depth: 0.8 },
  sofa: { width: 2.0, height: 0.85, depth: 0.9 },
  bed: { width: 1.6, height: 1.0, depth: 2.1 },
  wardrobe: { width: 1.2, height: 2.0, depth: 0.6 },
  cabinet: { width: 1.4, height: 0.82, depth: 0.45 },
  bookshelf: { width: 0.9, height: 1.8, depth: 0.32 },
};

const WOODS = ['oak', 'walnut', 'mahogany', 'teak', 'pine', 'birch'];
const FABRICS = ['cotton', 'linen', 'velvet', 'leather', 'synthetic-leather'];
const METALS = ['stainless-steel', 'aluminum', 'iron'];
const SURFACES = ['marble', 'glass', 'concrete'];

const TEMPLATES = {
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
const SYNONYMS = {
  cushion: ['cushion', 'cushions'],
  armrests: ['armrests', 'armrest', 'arms'],
  stretchers: ['stretchers', 'stretcher', 'rungs'],
  drawers: ['drawers', 'drawer'],
  shelf: ['shelf', 'lower shelf'],
};
const FINISH_MAP = {
  matte: 'matte', satin: 'satin', gloss: 'gloss', glossy: 'gloss', raw: 'raw',
  oiled: 'satin', lacquered: 'gloss', polished: 'gloss', painted: 'satin',
  waxed: 'satin', unfinished: 'raw',
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isHex = (s) => /^#[0-9a-f]{6}$/i.test(s);

export function analysisToConfig(analysis) {
  const category = analysis.category.value;
  const generator = CATEGORY_GENERATOR[category] ?? 'chair';
  const template = structuredClone(TEMPLATES[generator] ?? TEMPLATES.chair);

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
  const setParam = (key, param, value) => {
    const comp = components.find((c) => c.key === key);
    if (comp) comp.params = { ...(comp.params ?? {}), [param]: value };
  };
  const setEnabled = (key, enabled) => {
    const comp = components.find((c) => c.key === key);
    if (comp) comp.enabled = enabled;
  };

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
    setParam('shelves', 'levels', clamp(Math.round(dimensions.height / 0.42), 2, 6));
  }

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
    if (generator === 'bed' && detected.includes('footboard')) setParam('frame', 'footboard', true);
  }

  const found = analysis.materials.value;
  const firstWood = found.find((m) => WOODS.includes(m));
  const firstFabric = found.find((m) => FABRICS.includes(m));
  const firstMetal = found.find((m) => METALS.includes(m));
  const firstSurface = found.find((m) => SURFACES.includes(m));
  const primaryColor = analysis.primaryColor.value;
  const finish = FINISH_MAP[String(analysis.finish.value).toLowerCase()] ?? 'satin';

  const materials = template.materials.map((assignment) => {
    const next = { ...assignment, finish };
    if (UPHOLSTERY_COMPONENTS.includes(assignment.component)) {
      if (firstFabric) next.material = firstFabric;
      if (isHex(primaryColor)) next.color = primaryColor;
    } else if (assignment.component === 'top' && firstSurface) {
      next.material = firstSurface;
    } else if (HARDWARE_COMPONENTS.includes(assignment.component)) {
      if (firstMetal) next.material = firstMetal;
    } else if (WOODS.includes(assignment.material) && firstWood) {
      next.material = firstWood;
    }
    return next;
  });

  const config = {
    category,
    generator,
    dimensions,
    components,
    materials,
    style: analysis.style.source === 'unknown' ? 'contemporary' : analysis.style.value,
  };

  return furnitureConfigSchema.parse(config);
}
