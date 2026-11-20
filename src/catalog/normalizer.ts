// src/catalog/normalizer.ts
// Name normalization and explicit correspondence registry for matching
// limit models (from /console/go.md) with price models (from /docs/console/models.md).

/** Normalize a model name for comparison: lowercase, collapse hyphens/spaces, trim. */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[-·]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Strip context variant suffix like " (≤ 200K tokens)" or " (> 272K tokens)" from a price name. */
export function stripContextVariant(name: string): string {
  return name.replace(/\s*\(.*?tokens?\)\s*$/i, '').trim();
}

/** Strip discount suffix like " (50% off)" from a price name. */
export function stripDiscountSuffix(name: string): string {
  return name.replace(/\s*\(50% off\)\s*$/i, '').trim();
}

/** Get the base name of a price model for matching against a limit model. */
export function getPriceBaseName(name: string): string {
  return stripDiscountSuffix(stripContextVariant(name));
}

/**
 * Explicit correspondence map: limit display name → price base name.
 *
 * These are the cases where automatic normalization (hyphen/space) is not enough.
 * Only include cases where the correspondence is confirmed.
 *
 * DO NOT include:
 * - Exact matches (handled automatically).
 * - Hyphen/space variants (handled by normalizeName).
 * - Dubious correspondences (kept unassociated per Phase 5.1 decision).
 *
 * Currently empty: all confirmed correspondences are resolved by normalizeName
 * (hyphen/space normalization) or stripDiscountSuffix.
 * If a future model requires a non-trivial name mapping, add it here.
 */
export const EXPLICIT_CORRESPONDENCES: Record<string, string> = {
  // Example: 'Limit Name': 'Price Name',
};

/**
 * Models whose correspondence is dubious — they have a plausible price match
 * but the suffix differs (Contributor, date version, etc.).
 * These are intentionally NOT associated automatically.
 */
export const DUBIOUS_CORRESPONDENCES = new Set([
  'DeepSeek V4.1 Flash 1017',
  'Muse Spark 1.2 Contributor',
  'Muse Spark 1.3 Contributor',
  'Iceman Contributor Free',
]);

/**
 * Models that have context variants in the price table.
 * The limit model name maps to the base price name (without context suffix).
 * The merger will create two records per plan for these models.
 */
export const CONTEXT_VARIANT_MODELS = new Set([
  'Grok 4.7',
  'GPT-5.6 Luna',
  'GPT-6 Luna',
  'Claude Haiku 5.5',
]);

/**
 * Models in the limits source that have no price in the pricing table.
 * These will be included with price fields as undefined/null.
 */
export const NO_PRICE_MODELS = new Set([
  'Kimi K3.1 Pro',
  'Step 5 Preview',
  'Qwen4 Max',
  'Hy4 preview',
  'Hy4',
  'MiMo-V2.6-Pro',
  'MiniMax M3.1 Flash',
  'Hy3',
  'Qwen3.7 Plus',
  'LongCat-2.0',
  'MiMo-V2.6-Flash',
]);

/**
 * Check if a limit model name matches a price model name.
 * Returns: 'exact' | 'normalized' | 'explicit' | 'context-variant' | null
 *
 * Order matters: more specific match types are checked first.
 */
export function matchLimitToPrice(limitName: string, priceName: string): string | null {
  const limitNorm = normalizeName(limitName);
  const priceBase = getPriceBaseName(priceName);
  const priceBaseNorm = normalizeName(priceBase);

  // 1. Exact match
  if (limitName === priceName) return 'exact';

  // 2. Context variant — check BEFORE normalized (more specific)
  if (CONTEXT_VARIANT_MODELS.has(limitName) && limitNorm === priceBaseNorm) {
    return 'context-variant';
  }

  // 3. Explicit correspondence — check BEFORE normalized (more specific)
  const explicitPrice = EXPLICIT_CORRESPONDENCES[limitName];
  if (explicitPrice && normalizeName(explicitPrice) === priceBaseNorm) return 'explicit';

  // 4. Normalized match (hyphen/space differences) — least specific
  if (limitNorm === priceBaseNorm) return 'normalized';

  return null;
}

/**
 * Find the matching price name(s) for a limit model name.
 * Returns array of matching price names.
 */
export function findPriceMatches(limitName: string, allPriceNames: string[]): string[] {
  const matches: string[] = [];

  for (const priceName of allPriceNames) {
    const matchType = matchLimitToPrice(limitName, priceName);
    if (matchType !== null) {
      matches.push(priceName);
    }
  }

  return matches;
}
