import { describe, expect, test } from 'vitest';
import {
  MAX_SCENARIO_BYTES,
  Scenario,
  ScenarioSchema,
  normalizeNumericText,
  numericTextToNumber,
  parseScenarioJson,
  serializeScenario,
  unknownScenarioModelIds,
} from '../domain/scenario';

const validScenario: Scenario = {
  version: 1,
  plan: 'go',
  entries: [{ modelId: 'model-1', consumptionUsd: 12.5 }],
  observedPercent: '50',
  hypotheses: [{ modelId: 'model-2', amountUsd: 3 }],
  budgetUsd: '20',
  budgetAllocations: { 'model-1': 10, 'model-2': 5 },
};

describe('scenario schema', () => {
  test('accepts a valid scenario', () => {
    const result = ScenarioSchema.safeParse(validScenario);
    expect(result.success).toBe(true);
  });

  test('rejects an unknown version', () => {
    const result = ScenarioSchema.safeParse({ ...validScenario, version: 99 });
    expect(result.success).toBe(false);
  });

  test('rejects negative amounts and malformed numeric text', () => {
    expect(ScenarioSchema.safeParse({
      ...validScenario,
      entries: [{ modelId: 'model-1', consumptionUsd: -1 }],
    }).success).toBe(false);
    expect(ScenarioSchema.safeParse({ ...validScenario, budgetUsd: 'abc' }).success).toBe(false);
  });

  test('rejects unknown fields and invalid JSON', () => {
    expect(ScenarioSchema.safeParse({ ...validScenario, unexpected: true }).success).toBe(false);
    expect(parseScenarioJson('{not json')).toBeNull();
    expect(parseScenarioJson(JSON.stringify({ ...validScenario, version: 2 }))).toBeNull();
  });

  test('detects model ids that are not in the catalog', () => {
    const unknown = unknownScenarioModelIds(validScenario, new Set(['model-1']));
    expect(unknown).toEqual(['model-2']);
  });

  test('serialization keeps the version and an export timestamp', () => {
    const serialized = JSON.parse(serializeScenario(validScenario));
    expect(serialized.version).toBe(1);
    expect(serialized.exportedAt).toEqual(expect.any(String));
    expect(serialized.entries).toEqual(validScenario.entries);
  });

  test('documents a bounded import size', () => {
    expect(MAX_SCENARIO_BYTES).toBe(256 * 1024);
  });

  test('normalizes numeric text and rejects malformed values', () => {
    expect(normalizeNumericText('12.5')).toBe('12.5');
    expect(normalizeNumericText('12,5')).toBe('12,5');
    expect(normalizeNumericText('12abc')).toBe('');
    expect(numericTextToNumber('12,5')).toBe(12.5);
    expect(numericTextToNumber('')).toBeNull();
    expect(numericTextToNumber('abc')).toBeNull();
  });
});
