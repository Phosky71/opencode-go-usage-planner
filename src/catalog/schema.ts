// src/catalog/schema.ts
// Client-safe: only Zod schema, no Node.js imports.
import { Model } from '../domain/models';
import { z } from 'zod';

export const CatalogSchema = z.array(z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1),
  monthlyLimitUsd: z.number().nonnegative().nullable(),
  unlimited: z.boolean().optional(),
  priceInputUsd: z.number().nonnegative().optional(),
  priceOutputUsd: z.number().nonnegative().optional(),
  sourceUrl: z.string().url(),
  checkedAt: z.string().datetime(),
  sourceType: z.enum([
    'official_verified', 'support_confirmed', 'user_entered', 'estimated', 'unknown',
  ]),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string().optional(),
  active: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.monthlyLimitUsd === null) {
      return data.unlimited === true || data.unlimited === undefined;
    }
    if (data.monthlyLimitUsd !== null) {
      return data.unlimited !== true;
    }
    return true;
  },
  {
    message: 'Inconsistent unlimited/monthlyLimitUsd',
  }
));

// Re-export for convenience
export type { Model };