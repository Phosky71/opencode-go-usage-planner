// src/catalog/integrity.ts
// Integrity validation for catalog updates.
// Ensures that partial or corrupt extractions don't overwrite valid catalogs.

import { Model } from '../domain/models';
import { CatalogSchema } from './schema';

export interface IntegrityCheckResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    totalModels: number;
    goModels: number;
    goPlusModels: number;
    uniqueIds: number;
    duplicateIds: string[];
    modelsWithNullLimit: number;
    modelsWithUnknownLimit: number;
    modelsWithUnlimitedLimit: number;
    modelsWithZeroLimit: number;
    modelsWithMissingPrice: number;
    detectedRows?: number;
    parsedRows?: number;
    skippedRows?: number;
    skipRatio?: number;
  };
}

export interface ComparisonResult {
  previousCount: number;
  newCount: number;
  added: string[];
  removed: string[];
  updated: string[];
  variationPercent: number;
  suspicious: boolean;
  reason?: string;
  perPlan: {
    go: { previous: number; current: number; variation: number };
    goPlus: { previous: number; current: number; variation: number };
  };
}

// Minimum expected models per plan (based on current official docs)
const MIN_GO_MODELS = 20;
const MIN_GO_PLUS_MODELS = 20;
const MAX_REDUCTION_PERCENT = 15; // Max 15% reduction per plan without explicit approval (lowered from 30%)

/**
 * Validate the structural integrity of a parsed catalog.
 * Rejects if any rows were skipped (partial extraction).
 */
export function validateIntegrity(
  models: Model[],
  metrics?: { totalRows?: number; parsedRows?: number; skippedRows?: number; detectedModelRows?: number }
): IntegrityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic count check
  if (models.length === 0) {
    errors.push('No models extracted');
  }

  // Separate by plan
  const goModels = models.filter(m => m.notes === 'Go plan');
  const goPlusModels = models.filter(m => m.notes === 'Go Plus plan');

  if (goModels.length < MIN_GO_MODELS) {
    errors.push(`Go plan has only ${goModels.length} models (minimum: ${MIN_GO_MODELS})`);
  }
  if (goPlusModels.length < MIN_GO_PLUS_MODELS) {
    errors.push(`Go Plus plan has only ${goPlusModels.length} models (minimum: ${MIN_GO_PLUS_MODELS})`);
  }

  // Check for duplicate IDs
  const ids = models.map(m => m.id);
  const uniqueIds = new Set(ids);
  const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate model IDs found: ${[...new Set(duplicateIds)].join(', ')}`);
  }

  // Validate each model with Zod
  for (const model of models) {
    try {
      CatalogSchema.element.parse(model);
    } catch (e) {
      errors.push(`Invalid model ${model.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Validate the explicit semantics of the monthly limit.
  const inconsistentLimits = models.filter((m) => {
    if (m.limitStatus === 'unknown') {
      return m.monthlyLimitUsd !== null || m.unlimited === true;
    }
    if (m.limitStatus === 'unlimited') {
      return m.monthlyLimitUsd !== null || m.unlimited !== true;
    }
    if (m.limitStatus === 'known') {
      return typeof m.monthlyLimitUsd !== 'number' || m.monthlyLimitUsd < 0 || m.unlimited === true;
    }
    // Legacy records without limitStatus keep the previous validation rules.
    return m.monthlyLimitUsd === null ? m.unlimited !== true : m.unlimited === true;
  });
  if (inconsistentLimits.length > 0) {
    errors.push(`Inconsistent monthly limit semantics: ${inconsistentLimits.map(m => m.id).join(', ')}`);
  }

  // Check row-level metrics if available
  if (metrics) {
    // If any rows were skipped, that's an error (partial extraction)
    if (metrics.skippedRows && metrics.skippedRows > 0) {
      errors.push(`${metrics.skippedRows} rows were skipped during parsing`);
    }
    
    // If detected rows > parsed rows, that's a partial extraction
    if (metrics.detectedModelRows && metrics.parsedRows !== undefined && metrics.detectedModelRows > metrics.parsedRows) {
      const skipped = metrics.detectedModelRows - metrics.parsedRows;
      errors.push(`${skipped} detected model rows were not successfully parsed (partial extraction)`);
    }
  }

  // Warnings for potentially incomplete data
  const modelsWithNullLimit = models.filter(m => m.monthlyLimitUsd === null).length;
  const modelsWithUnknownLimit = models.filter(m => m.limitStatus === 'unknown').length;
  const modelsWithUnlimitedLimit = models.filter(m => m.limitStatus === 'unlimited').length;
  const modelsWithZeroLimit = models.filter(m => m.monthlyLimitUsd === 0).length;
  const modelsWithMissingPrice = models.filter(
    m => m.priceInputUsd === undefined || m.priceOutputUsd === undefined
  ).length;

  if (modelsWithMissingPrice > 0) {
    warnings.push(`${modelsWithMissingPrice} models have missing price data`);
  }

  const resultMetrics = {
    totalModels: models.length,
    goModels: goModels.length,
    goPlusModels: goPlusModels.length,
    uniqueIds: uniqueIds.size,
    duplicateIds: [...new Set(duplicateIds)],
    modelsWithNullLimit,
    modelsWithUnknownLimit,
    modelsWithUnlimitedLimit,
    modelsWithZeroLimit,
    modelsWithMissingPrice,
    detectedRows: metrics?.detectedModelRows,
    parsedRows: metrics?.parsedRows,
    skippedRows: metrics?.skippedRows,
    skipRatio: metrics?.detectedModelRows && metrics?.parsedRows
      ? (metrics.detectedModelRows - metrics.parsedRows) / metrics.detectedModelRows
      : 0,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: resultMetrics,
  };
}

/**
 * Compare new catalog with previous catalog to detect suspicious changes.
 * Now includes per-plan comparison.
 */
export function compareCatalogs(
  previous: Model[],
  current: Model[]
): ComparisonResult {
  const previousIds = new Set(previous.map(m => m.id));
  const currentIds = new Set(current.map(m => m.id));

  const added = current.filter(m => !previousIds.has(m.id)).map(m => m.id);
  const removed = previous.filter(m => !currentIds.has(m.id)).map(m => m.id);
  const updated = current.filter(m => {
    const prev = previous.find(p => p.id === m.id);
    if (!prev) return false;
    return Object.entries(m).some(([k, v]) => {
      if (k === 'checkedAt') return false;
      return (prev as any)[k] !== v;
    });
  }).map(m => m.id);

  const previousCount = previous.length;
  const newCount = current.length;
  const variationPercent = previousCount > 0
    ? Math.abs((newCount - previousCount) / previousCount) * 100
    : 0;

  // Detect suspicious changes
  let suspicious = false;
  let reason: string | undefined;

  // Check for large reduction
  if (variationPercent > MAX_REDUCTION_PERCENT && newCount < previousCount) {
    suspicious = true;
    reason = `Catalog reduced by ${variationPercent.toFixed(1)}% (from ${previousCount} to ${newCount} models). Threshold: ${MAX_REDUCTION_PERCENT}%`;
  }

  // Check for complete plan removal
  const prevGo = previous.filter(m => m.notes === 'Go plan').length;
  const prevGoPlus = previous.filter(m => m.notes === 'Go Plus plan').length;
  const currGo = current.filter(m => m.notes === 'Go plan').length;
  const currGoPlus = current.filter(m => m.notes === 'Go Plus plan').length;

  if (prevGo > 0 && currGo === 0) {
    suspicious = true;
    reason = 'All Go plan models disappeared';
  }
  if (prevGoPlus > 0 && currGoPlus === 0) {
    suspicious = true;
    reason = 'All Go Plus plan models disappeared';
  }

  // Check for excessive per-plan reduction
  if (prevGo > 0) {
    const goReduction = (prevGo - currGo) / prevGo * 100;
    if (goReduction > MAX_REDUCTION_PERCENT) {
      suspicious = true;
      reason = `Go plan reduced by ${goReduction.toFixed(1)}% (from ${prevGo} to ${currGo})`;
    }
  }
  if (prevGoPlus > 0) {
    const goPlusReduction = (prevGoPlus - currGoPlus) / prevGoPlus * 100;
    if (goPlusReduction > MAX_REDUCTION_PERCENT) {
      suspicious = true;
      reason = `Go Plus plan reduced by ${goPlusReduction.toFixed(1)}% (from ${prevGoPlus} to ${currGoPlus})`;
    }
  }

  return {
    previousCount,
    newCount,
    added,
    removed,
    updated,
    variationPercent,
    suspicious,
    reason,
    perPlan: {
      go: { previous: prevGo, current: currGo, variation: prevGo > 0 ? Math.abs((currGo - prevGo) / prevGo) * 100 : 0 },
      goPlus: { previous: prevGoPlus, current: currGoPlus, variation: prevGoPlus > 0 ? Math.abs((currGoPlus - prevGoPlus) / prevGoPlus) * 100 : 0 },
    },
  };
}