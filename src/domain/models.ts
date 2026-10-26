// src/domain/models.ts
export interface Model {
  /** Unique identifier for the model, e.g., "glm-5.3" */
  id: string;
  /** Human readable name */
  displayName: string;
  /** Provider name, e.g., "OpenCode" */
  provider: string;
  /** Monthly limit in USD (as defined by the provider). null = unlimited. */
  monthlyLimitUsd: number | null;
  /** Whether the monthly limit is unlimited */
  unlimited?: boolean;
  /** Optional: price per 1M tokens (input) */
  priceInputUsd?: number;
  /** Optional: price per 1M tokens (output) */
  priceOutputUsd?: number;
  /** Data provenance */
  sourceUrl: string;
  checkedAt: string; // ISO timestamp
  sourceType: 'official_verified' | 'support_confirmed' | 'user_entered' | 'estimated' | 'unknown';
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