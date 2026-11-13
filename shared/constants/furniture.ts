import type { MaterialKind } from '../types/furniture';

export const FURNITURE_CATEGORIES = [
  { id: 'chair', label: 'Chair', generator: 'chair' },
  { id: 'office-chair', label: 'Office Chair', generator: 'office-chair' },
  { id: 'dining-chair', label: 'Dining Chair', generator: 'chair' },
  { id: 'armchair', label: 'Armchair', generator: 'armchair' },
  { id: 'sofa', label: 'Sofa', generator: 'sofa' },
  { id: 'sectional-sofa', label: 'Sectional Sofa', generator: 'sofa' },
  { id: 'dining-table', label: 'Dining Table', generator: 'table' },
  { id: 'coffee-table', label: 'Coffee Table', generator: 'table' },
  { id: 'desk', label: 'Desk', generator: 'table' },
  { id: 'bed', label: 'Bed', generator: 'bed' },
  { id: 'wardrobe', label: 'Wardrobe', generator: 'wardrobe' },
  { id: 'cabinet', label: 'Cabinet', generator: 'cabinet' },
  { id: 'bookshelf', label: 'Bookshelf', generator: 'bookshelf' },
  { id: 'storage', label: 'Storage', generator: 'cabinet' },
  { id: 'other', label: 'Other', generator: 'chair' },
] as const;

export const WOOD_SPECIES = ['oak', 'walnut', 'mahogany', 'teak', 'pine', 'birch'] as const;
export const UPHOLSTERY_KINDS = ['cotton', 'linen', 'velvet', 'leather', 'synthetic-leather'] as const;

/** Meters, keyed by generator id. Used when an analysis marks dimensions unknown. */
export const DEFAULT_DIMENSIONS: Record<string, { width: number; height: number; depth: number }> = {
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

/** All material kinds the engine supports, grouped for pickers. */
export const MATERIAL_KIND_GROUPS = {
  wood: ['oak', 'walnut', 'mahogany', 'teak', 'pine', 'birch'],
  upholstery: ['cotton', 'linen', 'velvet', 'leather', 'synthetic-leather'],
  metal: ['stainless-steel', 'aluminum', 'iron'],
  surface: ['marble', 'concrete', 'glass', 'plastic'],
} as const;

export const ALL_MATERIAL_KINDS: MaterialKind[] = [
  ...MATERIAL_KIND_GROUPS.wood,
  ...MATERIAL_KIND_GROUPS.upholstery,
  ...MATERIAL_KIND_GROUPS.metal,
  ...MATERIAL_KIND_GROUPS.surface,
];
