// src/domain/validation.ts
import { z } from 'zod';

export const Confidence = z.enum(['high', 'medium', 'low']);
export const SourceType = z.enum([
  'official_document',
  'official_verified',
  'support_confirmed',
  'user_entered',
  'estimated',
  'unknown',
]);
export const Verification = z.enum(['auto_extracted', 'manually_verified', 'unverified']);
export const LimitStatus = z.enum(['known', 'unlimited', 'unknown']);

export const ModelSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1),
  monthlyLimitUsd: z.number().nonnegative().nullable(),
  limitStatus: LimitStatus.optional(),
  unlimited: z.boolean().optional(),
  priceInputUsd: z.number().nonnegative().optional(),
  priceOutputUsd: z.number().nonnegative().optional(),
  sourceUrl: z.string().url(),
  checkedAt: z.string().datetime(),
  sourceType: SourceType,
  verification: Verification.optional(),
  verifiedAt: z.string().datetime().optional(),
  verifiedBy: z.string().min(1).optional(),
  confidence: Confidence,
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
);

export const ConsumptionEntrySchema = z.object({
  modelId: z.string().min(1),
  consumptionUsd: z.number().nonnegative(),
});

export function isFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
