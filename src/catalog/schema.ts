// src/catalog/schema.ts
// Client-safe: only Zod schema, no Node.js imports.
import { Model } from '../domain/models';
import { z } from 'zod';

export const CatalogSchema = z.array(z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1),
  monthlyLimitUsd: z.number().nonnegative().nullable(),
  limitStatus: z.enum(['known', 'unlimited', 'unknown']).optional(),
  unlimited: z.boolean().optional(),
  priceInputUsd: z.number().nonnegative().optional(),
  priceOutputUsd: z.number().nonnegative().optional(),
  sourceUrl: z.string().url(),
  checkedAt: z.string().datetime(),
  sourceType: z.enum([
    'official_document',
    'official_verified',
    'support_confirmed',
    'user_entered',
    'estimated',
    'unknown',
  ]),
  verification: z.enum(['auto_extracted', 'manually_verified', 'unverified']).optional(),
  verifiedAt: z.string().datetime().optional(),
  verifiedBy: z.string().min(1).optional(),
  confidence: z.enum(['high', 'medium', 'low']),
  notes: z.string().optional(),
  active: z.boolean().optional(),
}).refine(
  (data) => {
    const status = data.limitStatus
      ?? (data.unlimited ? 'unlimited' : data.monthlyLimitUsd === null ? 'unknown' : 'known');

    if (status === 'known') {
      return typeof data.monthlyLimitUsd === 'number' && data.monthlyLimitUsd >= 0 && data.unlimited !== true;
    }
    if (status === 'unlimited') {
      return data.monthlyLimitUsd === null;
    }
    if (status === 'unknown') {
      return data.monthlyLimitUsd === null && data.unlimited !== true;
    }
    return true;
  },
  {
    message: 'Inconsistent limitStatus/monthlyLimitUsd/unlimited',
  }
));

// Re-export for convenience
export type { Model };
