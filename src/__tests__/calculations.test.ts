import { describe, test, expect } from 'vitest';
import { computeContribution, totalContribution, computeDifference } from '../domain/calculations';
import { Model, ConsumptionEntry } from '../domain/models';

describe('calculations', () => {
  const model: Model = {
    id: 'glm-5.3',
    displayName: 'GLM 5.3',
    provider: 'OpenCode',
    monthlyLimitUsd: 15,
    priceInputUsd: 1.4,
    priceOutputUsd: 4.4,
    sourceUrl: 'https://opencode.ai/v2/docs/console/go/',
    checkedAt: new Date().toISOString(),
    sourceType: 'official_verified',
    confidence: 'high',
  };

  const entry: ConsumptionEntry = { modelId: 'glm-5.3', consumptionUsd: 7.5 };

  test('computeContribution returns correct percent', () => {
    const contrib = computeContribution(model, entry);
    expect(contrib).not.toBeNull();
    expect(contrib?.contributionPercent).toBeCloseTo(50);
  });

  test('totalContribution aggregates', () => {
    const contrib1 = computeContribution(model, entry)!;
    const contrib2 = computeContribution({ ...model, id: 'grok-4.7', monthlyLimitUsd: 30 }, { modelId: 'grok-4.7', consumptionUsd: 15 })!;
    const total = totalContribution([contrib1, contrib2]);
    expect(total).toBeCloseTo(100);
  });

  test('computeDifference works', () => {
    expect(computeDifference(85, 80)).toBe(5);
  });
});
