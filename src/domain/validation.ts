// src/domain/validation.ts
import { z } from 'zod';

export const Confidence = z.enum(['high', 'medium', 'low']);
export const SourceType = z.enum([
  'official_verified',
  'support_confirmed',
  'user_entered',
  'estimated',
  'unknown',
]);

export const ModelSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  provider: z.string().min(1),
  monthlyLimitUsd: z.number().nonnegative().nullable(),
  unlimited: z.boolean().optional(),
  priceInputUsd: z.number().nonnegative().optional(),
  priceOutputUsd: z.number().nonnegative().optional(),
  sourceUrl: z.string().url(),
  checkedAt: z.string().datetime(),
  sourceType: SourceType,
  confidence: Confidence,
  notes: z.string().optional(),
  active: z.boolean().optional(),
}).refine(
  (data) => {
    // If monthlyLimitUsd is null, unlimited should be true
    if (data.monthlyLimitUsd === null) {
      return data.unlimited === true || data.unlimited === undefined;
    }
    // If monthlyLimitUsd is a number, unlimited should be false or undefined
    if (data.monthlyLimitUsd !== null) {
      return data.unlimited !== true;
    }
    return true;
  },
  {
    message: 'Inconsistent unlimited/monthlyLimitUsd: null limit requires unlimited=true, number limit requires unlimited≠true',
  }
);

export const ConsumptionEntrySchema = z.object({
  modelId: z.string().min(1),
  consumptionUsd: z.number().nonnegative(),
});

export function isFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}