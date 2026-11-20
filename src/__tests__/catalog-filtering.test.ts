// src/__tests__/catalog-filtering.test.ts
import { describe, it, expect } from 'vitest';
import { Model } from '../domain/models';
import { formatMonthlyLimit, getLimitStatus } from '../domain/models';

// Helper to simulate the plan filter used in Calculator, ModelCatalog, and ModelComparator
function filterByPlan(catalog: Model[], plan: 'go' | 'goPlus'): Model[] {
  const planName = plan === 'go' ? 'Go' : 'Go Plus';
  return catalog.filter(m => m.plan === planName && !m.deprecated);
}

describe('Catalog filtering for UI consumers', () => {
  const goModel: Model = {
    id: 'kimi-k3-go',
    displayName: 'Kimi K3',
    provider: 'OpenCode',
    plan: 'Go',
    monthlyLimitUsd: 15,
    limitStatus: 'known',
    sourceUrl: 'https://opencode.ai/console/go.md',
    checkedAt: '2025-01-01T00:00:00Z',
    sourceType: 'official_verified',
    confidence: 'high',
    notes: 'Go plan',
  };

  const goPlusModel: Model = {
    id: 'kimi-k3-go-plus',
    displayName: 'Kimi K3',
    provider: 'OpenCode',
    plan: 'Go Plus',
    monthlyLimitUsd: 60,
    limitStatus: 'known',
    sourceUrl: 'https://opencode.ai/console/go.md',
    checkedAt: '2025-01-01T00:00:00Z',
    sourceType: 'official_verified',
    confidence: 'high',
    notes: 'Go Plus plan',
  };

  const deprecatedModel: Model = {
    id: 'mimo-v2.5-go',
    displayName: 'MiMo-V2.5',
    provider: 'OpenCode',
    plan: 'Go',
    monthlyLimitUsd: 30,
    limitStatus: 'known',
    sourceUrl: 'https://opencode.ai/v2/docs/console/go/',
    checkedAt: '2025-01-01T00:00:00Z',
    sourceType: 'official_verified',
    confidence: 'high',
    notes: 'Go plan',
    deprecated: true,
  };

  const noPriceModel: Model = {
    id: 'qwen4-max-go',
    displayName: 'Qwen4 Max',
    provider: 'OpenCode',
    plan: 'Go',
    monthlyLimitUsd: 15,
    limitStatus: 'known',
    sourceUrl: 'https://opencode.ai/console/go.md',
    checkedAt: '2025-01-01T00:00:00Z',
    sourceType: 'official_verified',
    confidence: 'high',
    notes: 'Go plan · No price published',
  };

  const contextVariantModel: Model = {
    id: 'grok-4.7-go-low',
    displayName: 'Grok 4.7',
    provider: 'OpenCode',
    plan: 'Go',
    monthlyLimitUsd: 15,
    limitStatus: 'known',
    priceInputUsd: 0.15,
    priceOutputUsd: 0.75,
    sourceUrl: 'https://opencode.ai/console/go.md',
    checkedAt: '2025-01-01T00:00:00Z',
    sourceType: 'official_verified',
    confidence: 'high',
    notes: 'Go plan · Context variant: ≤ 200K tokens',
  };

  const freeModel: Model = {
    id: 'beam-free-go',
    displayName: 'Beam Free',
    provider: 'OpenCode',
    plan: 'Go',
    monthlyLimitUsd: null,
    limitStatus: 'unlimited',
    unlimited: true,
    priceInputUsd: 0,
    priceOutputUsd: 0,
    sourceUrl: 'https://opencode.ai/console/go.md',
    checkedAt: '2025-01-01T00:00:00Z',
    sourceType: 'official_verified',
    confidence: 'high',
    notes: 'Go plan · Limited regions · Limited time',
  };

  const catalog = [
    goModel,
    goPlusModel,
    deprecatedModel,
    noPriceModel,
    contextVariantModel,
    freeModel,
  ];

  it('separates Go and Go Plus models correctly', () => {
    const goFiltered = filterByPlan(catalog, 'go');
    const goPlusFiltered = filterByPlan(catalog, 'goPlus');

    expect(goFiltered).toHaveLength(4);
    expect(goPlusFiltered).toHaveLength(1);

    expect(goFiltered.map(m => m.id)).toContain('kimi-k3-go');
    expect(goFiltered.map(m => m.id)).toContain('qwen4-max-go');
    expect(goFiltered.map(m => m.id)).toContain('grok-4.7-go-low');
    expect(goFiltered.map(m => m.id)).toContain('beam-free-go');

    expect(goPlusFiltered.map(m => m.id)).toContain('kimi-k3-go-plus');
  });

  it('excludes deprecated models from both plans', () => {
    const goFiltered = filterByPlan(catalog, 'go');
    expect(goFiltered.map(m => m.id)).not.toContain('mimo-v2.5-go');
  });

  it('includes models without published price', () => {
    const goFiltered = filterByPlan(catalog, 'go');
    expect(goFiltered.map(m => m.id)).toContain('qwen4-max-go');
    const noPrice = goFiltered.find(m => m.id === 'qwen4-max-go');
    expect(noPrice?.priceInputUsd).toBeUndefined();
    expect(noPrice?.priceOutputUsd).toBeUndefined();
  });

  it('includes context variant models', () => {
    const goFiltered = filterByPlan(catalog, 'go');
    expect(goFiltered.map(m => m.id)).toContain('grok-4.7-go-low');
  });

  it('includes free/unlimited models', () => {
    const goFiltered = filterByPlan(catalog, 'go');
    expect(goFiltered.map(m => m.id)).toContain('beam-free-go');
  });

  it('does not confuse unknown prices with zero (free)', () => {
    const noPrice = catalog.find(m => m.id === 'qwen4-max-go');
    const free = catalog.find(m => m.id === 'beam-free-go');

    // No-price model: priceInputUsd is undefined
    expect(noPrice?.priceInputUsd).toBeUndefined();
    // Free model: priceInputUsd is explicitly 0
    expect(free?.priceInputUsd).toBe(0);
  });

  it('formats monthly limit correctly for known, unlimited, and unknown', () => {
    expect(formatMonthlyLimit(goModel)).toBe('$15');
    expect(formatMonthlyLimit(freeModel)).toBe('Ilimitado');

    const unknownLimitModel: Model = {
      ...goModel,
      id: 'unknown-limit-go',
      monthlyLimitUsd: null,
      limitStatus: 'unknown',
    };
    expect(formatMonthlyLimit(unknownLimitModel)).toBe('Sin datos');
  });

  it('returns correct limit status for each type', () => {
    expect(getLimitStatus(goModel)).toBe('known');
    expect(getLimitStatus(freeModel)).toBe('unlimited');

    const unknownLimitModel: Model = {
      ...goModel,
      id: 'unknown-limit-go',
      monthlyLimitUsd: null,
      limitStatus: 'unknown',
    };
    expect(getLimitStatus(unknownLimitModel)).toBe('unknown');
  });

  it('handles models with notes containing extra info (not exact match)', () => {
    // The old filter `notes === 'Go plan'` would exclude these.
    // The new filter uses `plan` field, so notes content doesn't matter.
    const goFiltered = filterByPlan(catalog, 'go');
    // noPriceModel has notes: 'Go plan · No price published'
    expect(goFiltered.map(m => m.id)).toContain('qwen4-max-go');
    // contextVariantModel has notes: 'Go plan · Context variant: ≤ 200K tokens'
    expect(goFiltered.map(m => m.id)).toContain('grok-4.7-go-low');
    // freeModel has notes: 'Go plan · Limited regions · Limited time'
    expect(goFiltered.map(m => m.id)).toContain('beam-free-go');
  });
});
