// src/domain/models.ts

export type SourceType =
  | 'official_document'
  | 'official_verified'
  | 'support_confirmed'
  | 'user_entered'
  | 'estimated'
  | 'unknown';

export type VerificationStatus =
  | 'auto_extracted'
  | 'manually_verified'
  | 'unverified';

export type LimitStatus = 'known' | 'unlimited' | 'unknown';

export interface Model {
  /** Unique identifier for the model, e.g., "glm-5.3" */
  id: string;
  /** Human readable name */
  displayName: string;
  /** Provider name, e.g., "OpenCode" */
  provider: string;
  /** Monthly limit in USD (as defined by the provider). null = unlimited or unknown. */
  monthlyLimitUsd: number | null;
  /**
   * Explicit semantics for monthlyLimitUsd:
   * - known: a number
   * - unlimited: provider says unlimited
   * - unknown: the source did not provide an interpretable value
   */
  limitStatus?: LimitStatus;
  /** Whether the monthly limit is unlimited */
  unlimited?: boolean;
  /** Optional: price per 1M tokens (input) */
  priceInputUsd?: number;
  /** Optional: price per 1M tokens (output) */
  priceOutputUsd?: number;
  /** Data provenance */
  sourceUrl: string;
  checkedAt: string; // ISO timestamp
  sourceType: SourceType;
  /**
   * How the record has been checked:
   * - auto_extracted: parsed from a public source, not manually reviewed
   * - manually_verified: reviewed against the source by a person
   * - unverified: provenance is insufficient
   */
  verification?: VerificationStatus;
  /** Optional metadata for manual verification */
  verifiedAt?: string;
  verifiedBy?: string;
  confidence: 'high' | 'medium' | 'low';
  notes?: string;
  /** Optional: model active/retired flag */
  active?: boolean;
}

export interface ConsumptionEntry {
  /** Model id */
  modelId: string;
  /** Consumption amount expressed in USD equivalent */
  consumptionUsd: number;
}

export interface Contribution {
  modelId: string;
  contributionPercent: number | null; // null if unlimited or invalid
}

export function getLimitStatus(model: Model): LimitStatus {
  if (model.limitStatus) return model.limitStatus;
  if (model.unlimited) return 'unlimited';
  if (model.monthlyLimitUsd === null) return 'unknown';
  return 'known';
}

export function getVerificationStatus(model: Model): VerificationStatus {
  return model.verification ?? 'unverified';
}

export function formatMonthlyLimit(model: Model): string {
  const status = getLimitStatus(model);
  if (status === 'unlimited') return 'Ilimitado';
  if (status === 'unknown') return 'Sin datos';
  return `$${model.monthlyLimitUsd}`;
}
