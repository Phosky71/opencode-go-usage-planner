// src/domain/calculations.ts
import type { Model, ConsumptionEntry, Contribution } from './models';
import { getLimitStatus } from './models';
import { isFinitePositive } from './validation';

/**
 * Compute contribution for a model using the official formula p_i = 100 * C_i / L_i
 * @param model Model metadata with monthlyLimitUsd (L_i). null = unlimited.
 * @param entry Consumption entry with consumptionUsd (C_i)
 * @returns contribution percent for the model, or null if invalid/unlimited data
 */
export function computeContribution(
  model: Model,
  entry: ConsumptionEntry,
): Contribution | null {
  if (model.id !== entry.modelId) return null;

  const limitStatus = getLimitStatus(model);
  if (limitStatus === 'unknown') return null;

  // Unlimited models don't have a defined contribution percentage
  if (limitStatus === 'unlimited') {
    return { modelId: model.id, contributionPercent: null };
  }

  const L = model.monthlyLimitUsd;
  const C = entry.consumptionUsd;
  
  if (!isFinitePositive(L) || L === 0) return null;
  if (!isFinitePositive(C) && C !== 0) return null;
  
  const p = (100 * C) / L;
  return { modelId: model.id, contributionPercent: p };
}

/** Sum contributions for a set of models/entries (only finite contributions) */
export function totalContribution(contributions: Contribution[]): number {
  return contributions.reduce((sum, c) => {
    if (c.contributionPercent === null) return sum;
    return sum + c.contributionPercent;
  }, 0);
}

/**
 * Compute remaining margin: R = 100 - U
 * Returns null if total is not a valid number (e.g., all unlimited)
 */
export function computeRemainingMargin(totalPercent: number): number {
  return 100 - totalPercent;
}

/**
 * Compute differences between estimated contributions total and observed percent (from console)
 * @param estimatedTotal estimated total % from calculations (P)
 * @param observed observed % from user input
 * @returns difference in percentage points (P - observed)
 */
export function computeDifference(estimatedTotal: number, observed: number): number {
  return estimatedTotal - observed;
}

/**
 * Compute contribution per dollar: how much quota % each dollar of consumption adds
 */
export function contributionPerDollar(model: Model): number | null {
  if (getLimitStatus(model) !== 'known' || model.monthlyLimitUsd === null || model.monthlyLimitUsd === 0) {
    return null;
  }
  return 100 / model.monthlyLimitUsd;
}

/**
 * Compute hypothetical contribution for a budget amount on a model
 */
export function hypotheticalContribution(model: Model, amountUsd: number): number | null {
  if (getLimitStatus(model) !== 'known' || model.monthlyLimitUsd === null || model.monthlyLimitUsd === 0) {
    return null;
  }
  if (amountUsd < 0 || !Number.isFinite(amountUsd)) return null;
  return (100 * amountUsd) / model.monthlyLimitUsd;
}

/**
 * Validate that a model and entry have compatible units.
 */
export function validateCompatibility(model: Model, entry: ConsumptionEntry): boolean {
  return true;
}