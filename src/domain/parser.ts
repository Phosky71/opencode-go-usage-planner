import { z } from 'zod';
import { ConsumptionEntry, Model } from './models';

export const ConsumptionSchema = z.object({
  modelId: z.string(),
  consumptionUsd: z.number().nonnegative(),
});

// Duplicate import removed

export function parseForm(form: Record<string, unknown>): ConsumptionEntry {
  return ConsumptionSchema.parse(form) as ConsumptionEntry;
}

export function getModelById(catalog: Model[], id: string): Model | undefined {
  return catalog.find(m => m.id === id);
}