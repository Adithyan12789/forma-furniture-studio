import type { FurnitureAnalysis } from '@shared/types/furniture';

/**
 * Clearly-labelled demo data for previewing the review UI without an API
 * key. It is NOT an AI result — the page banners it as a sample.
 */
export const SAMPLE_ANALYSIS: FurnitureAnalysis = {
  category: { value: 'dining-chair', confidence: 0.92, source: 'observed' },
  subcategory: { value: 'wooden dining chair', confidence: 0.85, source: 'observed' },
  style: { value: 'Scandinavian', confidence: 0.7, source: 'estimated' },
  primaryColor: { value: '#a97c46', confidence: 0.8, source: 'observed' },
  secondaryColors: { value: [], confidence: 0.5, source: 'estimated' },
  materials: { value: ['teak'], confidence: 0.66, source: 'estimated' },
  finish: { value: 'satin', confidence: 0.6, source: 'estimated' },
  dimensions: { value: { width: 0.46, height: 0.9, depth: 0.52 }, confidence: 0.45, source: 'estimated' },
  components: { value: ['legs', 'seat', 'backrest', 'stretchers'], confidence: 0.9, source: 'observed' },
  notes: 'Sample data for UI preview. Rear legs partly occluded in the reference photo; dimensions are typical for this chair type.',
};
