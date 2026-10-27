import { describe, expect, test } from 'vitest';
import { Model } from '../domain/models';
import { diffCatalogs } from '../catalog/audit';

function model(overrides: Partial<Model> = {}): Model {
  return {
    id: 'model-1',
    displayName: 'Model 1',
    provider: 'OpenCode',
    monthlyLimitUsd: 10,
    limitStatus: 'known',
    unlimited: false,
    priceInputUsd: 1,
    priceOutputUsd: 2,
    sourceUrl: 'https://example.com',
    checkedAt: '2026-10-27T00:00:00.000Z',
    sourceType: 'official_document',
    verification: 'auto_extracted',
    confidence: 'medium',
    notes: 'Go plan',
    ...overrides,
  };
}

describe('catalog audit', () => {
  test('detects added and removed models', () => {
    const before = [model()];
    const after = [model({ id: 'model-2' })];
    const audit = diffCatalogs(before, after);
    expect(audit.added.map((item) => item.id)).toEqual(['model-2']);
    expect(audit.removed.map((item) => item.id)).toEqual(['model-1']);
  });

  test('reports changed fields with their values', () => {
    const audit = diffCatalogs(
      [model({ monthlyLimitUsd: 10 })],
      [model({ monthlyLimitUsd: 15 })],
    );
    expect(audit.changed).toHaveLength(1);
    expect(audit.changed[0].fields).toEqual([
      { field: 'monthlyLimitUsd', before: 10, after: 15 },
    ]);
  });

  test('ignores the extraction timestamp', () => {
    const audit = diffCatalogs(
      [model({ checkedAt: '2026-10-26T00:00:00.000Z' })],
      [model({ checkedAt: '2026-10-27T00:00:00.000Z' })],
    );
    expect(audit.changed).toEqual([]);
  });

  test('returns an empty audit when both catalogs match', () => {
    expect(diffCatalogs([model()], [model()])).toEqual({
      added: [],
      removed: [],
      changed: [],
    });
  });
});
