import { z } from 'zod';

/**
 * Runtime mirror of shared/schemas/analysisSchema.ts.
 * Every AI response is validated against this before it is stored or used
 * (development rule #10). Keep the two in sync.
 */
const analyzed = (value) =>
  z.object({
    value,
    confidence: z.number().min(0).max(1),
    source: z.enum(['observed', 'estimated', 'unknown']),
  });

export const dimensionsSchema = z.object({
  width: z.number().positive().max(10),
  height: z.number().positive().max(10),
  depth: z.number().positive().max(10),
});

export const furnitureAnalysisSchema = z.object({
  category: analyzed(z.enum([
    'chair', 'office-chair', 'dining-chair', 'armchair', 'sofa',
    'sectional-sofa', 'dining-table', 'coffee-table', 'desk', 'bed',
    'wardrobe', 'cabinet', 'bookshelf', 'storage', 'other',
  ])),
  subcategory: analyzed(z.string()),
  style: analyzed(z.string()),
  primaryColor: analyzed(z.string()),
  secondaryColors: analyzed(z.array(z.string())),
  materials: analyzed(z.array(z.string())),
  finish: analyzed(z.string()),
  dimensions: analyzed(dimensionsSchema),
  components: analyzed(z.array(z.string())),
  notes: z.string().default(''),
});
