import { describe, expect, test } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parseGoDocsDetailed, parseModelsApi } from '../catalog/parsers';
import { CatalogSchema } from '../catalog/schema';
import { validateIntegrity } from '../catalog/integrity';
import { getLimitStatus, formatMonthlyLimit, Model } from '../domain/models';
import { computeContribution, contributionPerDollar, hypotheticalContribution } from '../domain/calculations';

const source = {
  id: 'test-source',
  url: 'https://opencode.ai/v2/docs/console/go/',
  type: 'html' as const,
  fields: ['displayName', 'monthlyLimitUsd', 'priceInputUsd', 'priceOutputUsd'],
  description: 'Test source',
  method: 'html-parser' as const,
  parserName: 'parseGoDocs',
  frequency: 'daily' as const,
};

const fixture = readFileSync(resolve('src/__tests__/fixtures/go-docs-fixture.html'), 'utf-8');

function model(overrides: Partial<Model> = {}): Model {
  return {
    id: 'model-1',
    displayName: 'Model 1',
    provider: 'OpenCode',
    monthlyLimitUsd: 10,
    limitStatus: 'known',
    unlimited: false,
    sourceUrl: 'https://example.com',
    checkedAt: new Date().toISOString(),
    sourceType: 'official_document',
    verification: 'auto_extracted',
    confidence: 'medium',
    ...overrides,
  };
}

describe('catalog provenance', () => {
  test('parses official documents as automatically extracted, not manually verified', () => {
    const parsed = parseGoDocsDetailed(source, fixture);
    expect(parsed.models.length).toBeGreaterThan(0);
    for (const item of parsed.models) {
      expect(item.sourceType).toBe('official_document');
      expect(item.verification).toBe('auto_extracted');
      expect(item.confidence).toBe('medium');
    }
  });

  test('keeps unknown limits as unknown instead of zero', () => {
    const html = fixture.replace('<td>$15</td>', '<td>—</td>');
    const parsed = parseGoDocsDetailed(source, html);
    const unknown = parsed.models.find(item => item.displayName === 'GLM-5.3' && item.notes === 'Go plan');
    expect(unknown).toBeDefined();
    expect(unknown!.monthlyLimitUsd).toBeNull();
    expect(unknown!.limitStatus).toBe('unknown');
    expect(unknown!.unlimited).toBe(false);
  });

  test('does not treat an unknown price as free', () => {
    const html = fixture.replace('<td>$0.50</td>', '<td>-</td>');
    const parsed = parseGoDocsDetailed(source, html);
    const item = parsed.models.find(model => model.displayName === 'GLM-5.3-Flash' && model.notes === 'Go plan');
    expect(item?.priceOutputUsd).toBeUndefined();
  });

  test('calculations reject unknown limits and unlimited models', () => {
    const unknown = model({ monthlyLimitUsd: null, limitStatus: 'unknown', unlimited: false });
    const unlimited = model({ monthlyLimitUsd: null, limitStatus: 'unlimited', unlimited: true });
    expect(computeContribution(unknown, { modelId: unknown.id, consumptionUsd: 5 })).toBeNull();
    expect(computeContribution(unlimited, { modelId: unlimited.id, consumptionUsd: 5 })?.contributionPercent).toBeNull();
    expect(contributionPerDollar(unknown)).toBeNull();
    expect(hypotheticalContribution(unknown, 5)).toBeNull();
    expect(formatMonthlyLimit(unknown)).toBe('Sin datos');
    expect(getLimitStatus(unknown)).toBe('unknown');
  });

  test('schema allows explicit unknown and rejects inconsistent known values', () => {
    const valid = CatalogSchema.safeParse([model({ monthlyLimitUsd: null, limitStatus: 'unknown', unlimited: false })]);
    expect(valid.success).toBe(true);

    const invalid = CatalogSchema.safeParse([model({ monthlyLimitUsd: null, limitStatus: 'known', unlimited: false })]);
    expect(invalid.success).toBe(false);
  });

  test('an existence-only API listing does not claim to know the limit', () => {
    const [item] = parseModelsApi(source, JSON.stringify([{ id: 'model-x' }]));
    expect(item.limitStatus).toBe('unknown');
    expect(item.unlimited).toBe(false);
    expect(item.monthlyLimitUsd).toBeNull();
    expect(item.verification).toBe('auto_extracted');
    expect(item.confidence).toBe('low');
  });

  test('the committed catalog passes integrity checks and declares automatic provenance', () => {
    const data = JSON.parse(readFileSync(resolve('src/data/models.json'), 'utf-8')) as Model[];
    const integrity = validateIntegrity(data);
    expect(integrity.errors).toEqual([]);
    for (const item of data) {
      expect(item.sourceType).toBe('official_document');
      expect(item.verification).toBe('auto_extracted');
      expect(item.limitStatus).toBe(item.unlimited ? 'unlimited' : 'known');
    }
  });
});
