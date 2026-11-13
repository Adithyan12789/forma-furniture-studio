import { z } from 'zod';

/** Runtime validation for FurnitureConfig (mirrors types/furniture.ts). */
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
