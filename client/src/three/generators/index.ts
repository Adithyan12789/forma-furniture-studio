import * as THREE from 'three';
import type { FurnitureConfig } from '@shared/types/furniture';
import { generateChair, DEFAULT_CHAIR_CONFIG } from './seating/ChairGenerator';
import { generateOfficeChair, DEFAULT_OFFICE_CHAIR_CONFIG } from './seating/OfficeChairGenerator';
import { generateSofa, DEFAULT_SOFA_CONFIG, DEFAULT_ARMCHAIR_CONFIG } from './seating/SofaGenerator';
import { generateTable, DEFAULT_TABLE_CONFIG } from './tables/TableGenerator';
import { generateBed, DEFAULT_BED_CONFIG } from './beds/BedGenerator';
import {
  generateWardrobe, DEFAULT_WARDROBE_CONFIG,
  generateCabinet, DEFAULT_CABINET_CONFIG,
  generateBookshelf, DEFAULT_BOOKSHELF_CONFIG,
} from './storage/StorageGenerators';

/**
 * Generator registry. The modeling engine is deliberately independent of
 * the AI layer and of React: config in, THREE.Group out.
 */
export type GeneratorFn = (config: FurnitureConfig) => THREE.Group;

const REGISTRY: Record<string, GeneratorFn> = {
  chair: generateChair,
  'office-chair': generateOfficeChair,
  armchair: generateSofa,
  sofa: generateSofa,
  table: generateTable,
  bed: generateBed,
  wardrobe: generateWardrobe,
  cabinet: generateCabinet,
  bookshelf: generateBookshelf,
};

export interface GeneratorInfo {
  id: string;
  label: string;
  defaultConfig: FurnitureConfig;
}

export const GENERATORS: GeneratorInfo[] = [
  { id: 'chair', label: 'Dining Chair', defaultConfig: DEFAULT_CHAIR_CONFIG },
  { id: 'office-chair', label: 'Office Chair', defaultConfig: DEFAULT_OFFICE_CHAIR_CONFIG },
  { id: 'armchair', label: 'Armchair', defaultConfig: DEFAULT_ARMCHAIR_CONFIG },
  { id: 'sofa', label: 'Sofa', defaultConfig: DEFAULT_SOFA_CONFIG },
  { id: 'table', label: 'Table', defaultConfig: DEFAULT_TABLE_CONFIG },
  { id: 'bed', label: 'Bed', defaultConfig: DEFAULT_BED_CONFIG },
  { id: 'wardrobe', label: 'Wardrobe', defaultConfig: DEFAULT_WARDROBE_CONFIG },
  { id: 'cabinet', label: 'Cabinet', defaultConfig: DEFAULT_CABINET_CONFIG },
  { id: 'bookshelf', label: 'Bookshelf', defaultConfig: DEFAULT_BOOKSHELF_CONFIG },
];

export function generateFurniture(config: FurnitureConfig): THREE.Group {
  const fn = REGISTRY[config.generator] ?? REGISTRY.chair;
  return fn(config);
}

export function registeredGenerators(): string[] {
  return Object.keys(REGISTRY);
}
