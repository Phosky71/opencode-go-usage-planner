import { describe, test, expect } from 'vitest';
import { computeContribution, totalContribution, computeDifference } from '../domain/calculations';
import { Model, ConsumptionEntry } from '../domain/models';

describe('calculations edge cases', () => {
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

  test('zero consumption returns 0%', () => {
    const contrib = computeContribution(model, { modelId: 'glm-5.3', consumptionUsd: 0 });
    expect(contrib?.contributionPercent).toBe(0);
  });

  test('consumption equals limit returns 100%', () => {
    const contrib = computeContribution(model, { modelId: 'glm-5.3', consumptionUsd: 15 });
    expect(contrib?.contributionPercent).toBeCloseTo(100);
  });

  test('two contributions sum correctly', () => {
    const c1 = computeContribution(model, { modelId: 'glm-5.3', consumptionUsd: 7.5 })!;
    const c2 = computeContribution(model, { modelId: 'glm-5.3', consumptionUsd: 7.5 })!;
    const total = totalContribution([c1, c2]);
    expect(total).toBeCloseTo(100);
  });

  test('zero limit returns null', () => {
    const zeroModel = { ...model, monthlyLimitUsd: 0 };
    const contrib = computeContribution(zeroModel, { modelId: 'glm-5.3', consumptionUsd: 5 });
    expect(contrib).toBeNull();
  });

  test('negative limit returns null', () => {
    const negModel = { ...model, monthlyLimitUsd: -10 };
    const contrib = computeContribution(negModel, { modelId: 'glm-5.3', consumptionUsd: 5 });
    expect(contrib).toBeNull();
  });

  test('NaN consumption returns null', () => {
    const contrib = computeContribution(model, { modelId: 'glm-5.3', consumptionUsd: NaN });
    expect(contrib).toBeNull();
  });

  test('mismatched modelId returns null', () => {
    const contrib = computeContribution(model, { modelId: 'other', consumptionUsd: 5 });
    expect(contrib).toBeNull();
  });

  test('difference preserves sign', () => {
    expect(computeDifference(80, 85)).toBe(-5);
    expect(computeDifference(90, 85)).toBe(5);
  });

  test('rounding precision', () => {
    const contrib = computeContribution(model, { modelId: 'glm-5.3', consumptionUsd: 1.5 })!;
    // 1.5 / 15 = 0.10 -> 10%
    expect(contrib.contributionPercent).toBeCloseTo(10);
  });
});