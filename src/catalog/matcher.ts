// src/catalog/matcher.ts
// Matches limit models (from /console/go.md) with price models (from /docs/console/models.md).
// Uses the normalizer to resolve name differences.

import { Model } from '../domain/models';
import {
  normalizeName,
  getPriceBaseName,
  DUBIOUS_CORRESPONDENCES,
  CONTEXT_VARIANT_MODELS,
  findPriceMatches,
} from './normalizer';

/** Result of matching a single limit model against price models. */
export interface MatchResult {
  /** The limit model display name */
  limitName: string;
  /** Match type: 'exact' | 'normalized' | 'explicit' | 'context-variant' | 'no-price' | 'dubious' */
  matchType: string;
  /** Matching price model(s) */
  priceModels: Model[];
  /** Has context variants (≤ tokens / > tokens) */
  hasContextVariants: boolean;
}

/**
 * Match a single limit model against all available price models.
 * Returns the match result with type and matched prices.
 */
export function matchSingleLimit(
  limitModel: Model,
  allPriceModels: Model[],
): MatchResult {
  const limitName = limitModel.displayName;

  // Check if this is a dubious correspondence — do NOT associate
  if (DUBIOUS_CORRESPONDENCES.has(limitName)) {
    return {
      limitName,
      matchType: 'dubious',
      priceModels: [],
      hasContextVariants: false,
    };
  }

  // Find all matching price names
  const priceNames = allPriceModels.map((p) => p.displayName);
  const matchedNames = findPriceMatches(limitName, priceNames);

  if (matchedNames.length === 0) {
    return {
      limitName,
      matchType: 'no-price',
      priceModels: [],
      hasContextVariants: false,
    };
  }

  // Filter to actual models
  const matchedModels = allPriceModels.filter((p) => matchedNames.includes(p.displayName));

  // Determine if this is a context variant match
  const hasContextVariants =
    CONTEXT_VARIANT_MODELS.has(limitName) && matchedModels.length > 1;

  // Determine match type
  let matchType: string;
  if (matchedModels.length === 1) {
    const single = matchedModels[0];
    if (limitName === single.displayName) {
      matchType = 'exact';
    } else if (normalizeName(limitName) === normalizeName(getPriceBaseName(single.displayName))) {
      matchType = 'normalized';
    } else {
      matchType = 'explicit';
    }
  } else if (hasContextVariants) {
    matchType = 'context-variant';
  } else {
    // Multiple matches but not context variants — ambiguous
    matchType = 'ambiguous';
  }

  return {
    limitName,
    matchType,
    priceModels: matchedModels,
    hasContextVariants,
  };
}

/**
 * Match all limit models against all price models.
 * Returns an array of match results.
 */
export function matchAllLimits(
  limitModels: Model[],
  priceModels: Model[],
): MatchResult[] {
  // Deduplicate limit models by display name (Go and Go Plus share the same name)
  const uniqueLimitNames = [...new Set(limitModels.map((m) => m.displayName))];

  return uniqueLimitNames.map((name) => {
    const limitModel = limitModels.find((m) => m.displayName === name)!;
    return matchSingleLimit(limitModel, priceModels);
  });
}

/**
 * Build a price lookup index by normalized base name.
 * Returns a map: normalized base name → array of price models.
 */
export function buildPriceIndex(priceModels: Model[]): Map<string, Model[]> {
  const index = new Map<string, Model[]>();

  for (const pm of priceModels) {
    const baseName = getPriceBaseName(pm.displayName);
    const norm = normalizeName(baseName);

    if (!index.has(norm)) {
      index.set(norm, []);
    }
    index.get(norm)!.push(pm);
  }

  return index;
}
