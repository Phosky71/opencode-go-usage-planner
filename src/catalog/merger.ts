// src/catalog/merger.ts
// Merges limit models (from /console/go.md) with price models (from /docs/console/models.md)
// into a unified catalog with independent provenance for limits and prices.

import { Model, PlanName } from '../domain/models';
import { MarkdownLimitsResult, MarkdownPricesResult } from './parsers';
import { normalizeName } from './normalizer';
import { matchAllLimits } from './matcher';

/**
 * A merged model record that combines limit and price information.
 * Extends Model with independent provenance fields.
 */
export interface MergedModel extends Model {
  plan: PlanName;
  priceSource: string;
  limitsSource: string;
}

/**
 * Metrics about the merge operation.
 */
export interface MergeMetrics {
  /** Total limit models processed (unique display names) */
  limitModelsProcessed: number;
  /** Total price models available */
  priceModelsAvailable: number;
  /** Models with exact match */
  exactMatches: number;
  /** Models with normalized match */
  normalizedMatches: number;
  /** Models with explicit correspondence */
  explicitMatches: number;
  /** Models with context variants (1 limit → 2 prices) */
  contextVariantMatches: number;
  /** Models with no price found */
  noPriceMatches: number;
  /** Models with dubious correspondence (not associated) */
  dubiousMatches: number;
  /** Models with ambiguous match (multiple non-context prices) */
  ambiguousMatches: number;
  /** Total merged records produced (Go + Go Plus, with context variants expanded) */
  totalMergedRecords: number;
  /** Warnings during merge */
  warnings: string[];
}

/**
 * Merge limit and price data into a unified catalog.
 *
 * For each limit model:
 * - If exact/normalized/explicit match: combine limit + price data.
 * - If context variant: create 2 records per plan (≤ tokens, > tokens).
 * - If no price: create records with price fields undefined.
 * - If dubious: create records with price fields undefined (do NOT associate).
 *
 * Each limit model produces 2 records (Go + Go Plus).
 * Context variants produce 4 records (Go ≤, Go >, Go Plus ≤, Go Plus >).
 */
export function mergeLimitsAndPrices(
  limitsResult: MarkdownLimitsResult,
  pricesResult: MarkdownPricesResult,
): { models: MergedModel[]; metrics: MergeMetrics } {
  const warnings: string[] = [];

  // Deduplicate limit models by display name
  const limitByName = new Map<string, Model[]>();
  for (const lm of limitsResult.models) {
    if (!limitByName.has(lm.displayName)) {
      limitByName.set(lm.displayName, []);
    }
    limitByName.get(lm.displayName)!.push(lm);
  }

  // Match all unique limit names against prices
  const allLimitModels = limitsResult.models;
  const allPriceModels = pricesResult.models;
  const matchResults = matchAllLimits(allLimitModels, allPriceModels);

  // Count metrics
  let exactMatches = 0;
  let normalizedMatches = 0;
  let explicitMatches = 0;
  let contextVariantMatches = 0;
  let noPriceMatches = 0;
  let dubiousMatches = 0;
  let ambiguousMatches = 0;

  for (const mr of matchResults) {
    switch (mr.matchType) {
      case 'exact': exactMatches++; break;
      case 'normalized': normalizedMatches++; break;
      case 'explicit': explicitMatches++; break;
      case 'context-variant': contextVariantMatches++; break;
      case 'no-price': noPriceMatches++; break;
      case 'dubious': dubiousMatches++; break;
      case 'ambiguous':
        ambiguousMatches++;
        warnings.push(`Ambiguous match for "${mr.limitName}": ${mr.priceModels.length} price models matched`);
        break;
    }
  }

  const models: MergedModel[] = [];
  const now = new Date().toISOString();

  for (const mr of matchResults) {
    // Get Go and Go Plus limit models for this display name
    const goLimit = limitsResult.models.find(
      (m) => m.displayName === mr.limitName && !m.id.includes('Go Plus'),
    );
    const goPlusLimit = limitsResult.models.find(
      (m) => m.displayName === mr.limitName && m.id.includes('Go Plus'),
    );

    if (!goLimit || !goPlusLimit) {
      warnings.push(`Missing Go/Go Plus pair for "${mr.limitName}"`);
      continue;
    }

    if (mr.matchType === 'context-variant') {
      // Context variant: create 4 records (Go ≤, Go >, Go Plus ≤, Go Plus >)
      const lowContext = mr.priceModels.find((p) => p.displayName.includes('≤'));
      const highContext = mr.priceModels.find((p) => p.displayName.includes('>'));

      if (!lowContext || !highContext) {
        warnings.push(`Context variant "${mr.limitName}" missing ≤ or > price`);
        // Fall back to no-price behavior
        addModel(models, goLimit, 'Go', null, now, limitsResult, pricesResult);
        addModel(models, goPlusLimit, 'Go Plus', null, now, limitsResult, pricesResult);
      } else {
        // Go ≤ tokens
        const goLow = addModel(models, goLimit, 'Go', lowContext, now, limitsResult, pricesResult);
        goLow.id = `${goLimit.id}-low`;
        goLow.displayName = lowContext.displayName;
        goLow.notes = `${goLow.plan} plan · Context variant: ${lowContext.displayName}`;
        // Go > tokens
        const goHigh = addModel(models, goLimit, 'Go', highContext, now, limitsResult, pricesResult);
        goHigh.id = `${goLimit.id}-high`;
        goHigh.displayName = highContext.displayName;
        goHigh.notes = `${goHigh.plan} plan · Context variant: ${highContext.displayName}`;
        // Go Plus ≤ tokens
        const gpLow = addModel(models, goPlusLimit, 'Go Plus', lowContext, now, limitsResult, pricesResult);
        gpLow.id = `${goPlusLimit.id}-low`;
        gpLow.displayName = lowContext.displayName;
        gpLow.notes = `${gpLow.plan} plan · Context variant: ${lowContext.displayName}`;
        // Go Plus > tokens
        const gpHigh = addModel(models, goPlusLimit, 'Go Plus', highContext, now, limitsResult, pricesResult);
        gpHigh.id = `${goPlusLimit.id}-high`;
        gpHigh.displayName = highContext.displayName;
        gpHigh.notes = `${gpHigh.plan} plan · Context variant: ${highContext.displayName}`;
      }
    } else if (mr.matchType === 'no-price' || mr.matchType === 'dubious') {
      // No price or dubious — create records with price fields undefined
      const notePrefix = mr.matchType === 'dubious' ? 'Dubious correspondence · ' : '';
      addModel(models, goLimit, 'Go', null, now, limitsResult, pricesResult, notePrefix);
      addModel(models, goPlusLimit, 'Go Plus', null, now, limitsResult, pricesResult, notePrefix);
    } else if (mr.matchType === 'ambiguous') {
      // Ambiguous — do NOT associate, treat as no-price
      warnings.push(`Skipping ambiguous match for "${mr.limitName}" — not associating prices`);
      addModel(models, goLimit, 'Go', null, now, limitsResult, pricesResult, 'Ambiguous match · ');
      addModel(models, goPlusLimit, 'Go Plus', null, now, limitsResult, pricesResult, 'Ambiguous match · ');
    } else {
      // Exact, normalized, or explicit — single price match
      const priceModel = mr.priceModels[0];
      addModel(models, goLimit, 'Go', priceModel, now, limitsResult, pricesResult);
      addModel(models, goPlusLimit, 'Go Plus', priceModel, now, limitsResult, pricesResult);
    }
  }

  return {
    models,
    metrics: {
      limitModelsProcessed: limitByName.size,
      priceModelsAvailable: pricesResult.models.length,
      exactMatches,
      normalizedMatches,
      explicitMatches,
      contextVariantMatches,
      noPriceMatches,
      dubiousMatches,
      ambiguousMatches,
      totalMergedRecords: models.length,
      warnings,
    },
  };
}

/**
 * Create a merged model record from a limit model and optional price model.
 */
function addModel(
  models: MergedModel[],
  limitModel: Model,
  plan: PlanName,
  priceModel: Model | null,
  now: string,
  limitsResult: MarkdownLimitsResult,
  pricesResult: MarkdownPricesResult,
  notePrefix: string = '',
): MergedModel {
  const limitsSource = limitsResult.models[0]?.sourceUrl || '';
  const priceSource = priceModel?.sourceUrl || pricesResult.models[0]?.sourceUrl || '';

  // Build notes from limit model
  let notes = limitModel.notes || `${plan} plan`;
  if (notePrefix) {
    notes = `${notePrefix}${notes}`;
  }
  if (priceModel) {
    // Append price notes if present
    if (priceModel.notes && !notes.includes(priceModel.notes)) {
      notes = `${notes} · ${priceModel.notes}`;
    }
  }

  const merged: MergedModel = {
    ...limitModel,
    // limitModel.id already includes "(Go Plus)" suffix for Go Plus models from the parser.
    // Do NOT append it again.
    id: limitModel.id,
    plan,
    priceSource,
    limitsSource,
    checkedAt: now,
    notes,
    // Price fields — only set if price model exists
    priceInputUsd: priceModel?.priceInputUsd,
    priceOutputUsd: priceModel?.priceOutputUsd,
    cachedReadPrice: priceModel?.cachedReadPrice,
    cachedWritePrice: priceModel?.cachedWritePrice,
  };

  models.push(merged);
  return merged;
}

/**
 * Mark old catalog models as deprecated if they no longer appear in the merged catalog.
 */
export function markDeprecated(
  oldCatalog: Model[],
  mergedModels: MergedModel[],
): Model[] {
  const mergedNames = new Set(mergedModels.map((m) => normalizeName(m.displayName)));

  return oldCatalog.map((old) => {
    const oldNorm = normalizeName(old.displayName);
    const isActive = mergedNames.has(oldNorm);

    if (!isActive) {
      return { ...old, deprecated: true, active: false };
    }
    return old;
  });
}

/**
 * Merge old deprecated models with new merged models into a complete catalog.
 * Old models that still exist are replaced by the new merged models.
 * Old models that no longer exist are kept as deprecated.
 */
export function buildCompleteCatalog(
  oldCatalog: Model[],
  mergedModels: MergedModel[],
): Model[] {
  // Mark old models as deprecated where appropriate
  const markedOld = markDeprecated(oldCatalog, mergedModels);

  // Filter out old models that have been replaced by merged models
  const mergedNames = new Set(mergedModels.map((m) => normalizeName(m.displayName)));
  const deprecatedOnly = markedOld.filter((m) => !mergedNames.has(normalizeName(m.displayName)));

  // Combine: new merged models + deprecated old models
  return [...mergedModels, ...deprecatedOnly];
}
