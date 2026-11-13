/**
 * Shared furniture configuration types.
 *
 * These types are the contract between the AI analysis layer, the REST API
 * and the procedural modeling engine. The engine consumes ONLY
 * `FurnitureConfig` — it never sees raw AI output.
 *
 * Coordinate system: X = width, Y = height, Z = depth. Units: meters.
 * Origin: base center (floor level, center of the footprint).
 */

export type FurnitureCategory =
  | 'chair' | 'office-chair' | 'dining-chair' | 'armchair'
  | 'sofa' | 'sectional-sofa'
  | 'dining-table' | 'coffee-table' | 'desk'
  | 'bed' | 'wardrobe' | 'cabinet' | 'bookshelf' | 'storage' | 'other';

export interface Dimensions {
  width: number;  // X, meters
  height: number; // Y, meters
  depth: number;  // Z, meters
}

export type MaterialKind =
  | 'oak' | 'walnut' | 'mahogany' | 'teak' | 'pine' | 'birch'
  | 'cotton' | 'linen' | 'velvet' | 'leather' | 'synthetic-leather'
  | 'stainless-steel' | 'aluminum' | 'iron' | 'glass' | 'plastic'
  | 'marble' | 'concrete' | 'custom';

export interface MaterialAssignment {
  /** Key of the component this material applies to, e.g. "frame", "seat". */
  component: string;
  material: MaterialKind;
  /** Hex color override, e.g. "#8a6844". */
  color?: string;
  finish?: 'matte' | 'satin' | 'gloss' | 'raw';
}

export interface ComponentConfig {
  /** Stable component key, e.g. "legs", "backrest", "armrests", "cushions". */
  key: string;
  enabled: boolean;
  /** Component-local parameters (counts, thicknesses, styles...). */
  params: Record<string, number | string | boolean>;
}

export interface FurnitureConfig {
  category: FurnitureCategory;
  /** Generator id that builds this config, e.g. "chair", "sofa", "table". */
  generator: string;
  dimensions: Dimensions;
  components: ComponentConfig[];
  materials: MaterialAssignment[];
  style?: string;
}

/** A single extracted property with its confidence and provenance. */
export interface AnalyzedProperty<T> {
  value: T;
  /** 0..1 */
  confidence: number;
  /** 'observed' = clearly visible, 'estimated' = inferred, 'unknown' = not determinable */
  source: 'observed' | 'estimated' | 'unknown';
}

/** Structured result of the vision-AI analysis step (Phase 4). */
export interface FurnitureAnalysis {
  category: AnalyzedProperty<FurnitureCategory>;
  subcategory: AnalyzedProperty<string>;
  style: AnalyzedProperty<string>;
  primaryColor: AnalyzedProperty<string>;
  secondaryColors: AnalyzedProperty<string[]>;
  materials: AnalyzedProperty<MaterialKind[]>;
  finish: AnalyzedProperty<string>;
  dimensions: AnalyzedProperty<Dimensions>;
  components: AnalyzedProperty<string[]>;
  notes: string;
}
