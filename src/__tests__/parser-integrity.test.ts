import { describe, test, expect } from 'vitest';
import { parseGoDocs, parseGoDocsDetailed } from '../catalog/parsers';
import { validateIntegrity, compareCatalogs } from '../catalog/integrity';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const fixturePath = resolve('src/__tests__/fixtures/go-docs-fixture.html');
const fixtureHtml = readFileSync(fixturePath, 'utf-8');

const mockSource = {
  id: 'test-source',
  url: 'https://opencode.ai/v2/docs/console/go/',
  type: 'html' as const,
  fields: ['displayName', 'monthlyLimitUsd', 'priceInputUsd', 'priceOutputUsd'],
  description: 'Test source',
  method: 'html-parser' as const,
  parserName: 'parseGoDocs',
  frequency: 'daily' as const,
};

describe('parseGoDocs', () => {
  test('extracts models from valid HTML', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    expect(models.length).toBe(8); // 4 Go + 4 Go Plus
    expect(models.every(m => m.sourceUrl === mockSource.url)).toBe(true);
  });

  test('extracts strikethrough prices correctly', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const geminiGo = models.find(m => m.id === 'Gemini 4 Argon (50% off) (Go)');
    expect(geminiGo).toBeDefined();
    expect(geminiGo!.priceInputUsd).toBe(2);
    expect(geminiGo!.priceOutputUsd).toBe(10);
    expect(geminiGo!.monthlyLimitUsd).toBe(30);
  });

  test('handles unlimited models', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const beamGo = models.find(m => m.id === 'Beam Free (Go)');
    expect(beamGo).toBeDefined();
    expect(beamGo!.monthlyLimitUsd).toBeNull();
    expect(beamGo!.unlimited).toBe(true);
  });

  test('handles zero-limit (free) models', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    // Beam Free has unlimited, not zero
    const beamGo = models.find(m => m.id === 'Beam Free (Go)');
    expect(beamGo!.monthlyLimitUsd).toBeNull();
  });

  test('distinguishes Go and Go Plus plans', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const goModels = models.filter(m => m.notes === 'Go plan');
    const plusModels = models.filter(m => m.notes === 'Go Plus plan');
    expect(goModels.length).toBe(4);
    expect(plusModels.length).toBe(4);
  });

  test('Go Plus has higher limits than Go', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const glmGo = models.find(m => m.id === 'GLM-5.3-Flash (Go)');
    const glmPlus = models.find(m => m.id === 'GLM-5.3-Flash (Go Plus)');
    expect(glmGo!.monthlyLimitUsd).toBe(60);
    expect(glmPlus!.monthlyLimitUsd).toBe(180);
  });

  test('throws on empty HTML', () => {
    expect(() => parseGoDocs(mockSource, '')).toThrow('No tables found');
  });

  test('throws on HTML with no pricing tables', () => {
    const html = '<html><body><table><tr><th>Name</th></tr></table></body></html>';
    expect(() => parseGoDocs(mockSource, html)).toThrow('No pricing tables found');
  });

  test('tracks metrics with parseGoDocsDetailed', () => {
    const result = parseGoDocsDetailed(mockSource, fixtureHtml);
    expect(result.metrics.tablesFound).toBe(9);
    expect(result.metrics.pricingTablesFound).toBe(2);
    expect(result.metrics.totalRows).toBe(8); // 4 + 4 data rows
    expect(result.metrics.parsedRows).toBe(8);
    expect(result.metrics.skippedRows).toBe(0);
  });
});

describe('validateIntegrity', () => {
  test('validates complete catalog', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const result = validateIntegrity(models);
    // Fixture has only 4 models per plan, below MIN threshold of 20
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Go plan'))).toBe(true);
  });

  test('rejects empty catalog', () => {
    const result = validateIntegrity([]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('No models extracted');
  });

  test('rejects catalog with missing Go plan', () => {
    const models = parseGoDocs(mockSource, fixtureHtml).filter(m => m.notes !== 'Go plan');
    const result = validateIntegrity(models);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Go plan'))).toBe(true);
  });

  test('rejects catalog with missing Go Plus plan', () => {
    const models = parseGoDocs(mockSource, fixtureHtml).filter(m => m.notes !== 'Go Plus plan');
    const result = validateIntegrity(models);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Go Plus plan'))).toBe(true);
  });

  test('detects duplicate IDs', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const duplicate = { ...models[0], id: models[1].id };
    const result = validateIntegrity([...models, duplicate]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
  });

  test('detects inconsistent unlimited/monthlyLimitUsd', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const inconsistent = { ...models[0], monthlyLimitUsd: null, unlimited: false };
    const result = validateIntegrity([...models, inconsistent]);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Inconsistent'))).toBe(true);
  });

  test('provides warnings for missing prices', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const result = validateIntegrity(models);
    // All models in fixture have prices, so no warnings expected
    expect(result.warnings).toHaveLength(0);
  });
});

describe('compareCatalogs', () => {
  test('detects no changes', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const result = compareCatalogs(models, models);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.updated).toHaveLength(0);
    expect(result.suspicious).toBe(false);
  });

  test('detects added models', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const newModel = { ...models[0], id: 'New Model (Go)', displayName: 'New Model' };
    const result = compareCatalogs(models, [...models, newModel]);
    expect(result.added).toContain('New Model (Go)');
    expect(result.suspicious).toBe(false);
  });

  test('detects removed models', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const filtered = models.filter(m => m.id !== models[0].id);
    const result = compareCatalogs(models, filtered);
    expect(result.removed).toContain(models[0].id);
  });

  test('detects suspicious reduction (> 30%)', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    // Remove more than 30% of models
    const reduced = models.slice(0, Math.floor(models.length * 0.5));
    const result = compareCatalogs(models, reduced);
    expect(result.suspicious).toBe(true);
    expect(result.reason).toContain('reduced');
  });

  test('detects complete plan removal', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const noGo = models.filter(m => m.notes !== 'Go plan');
    const result = compareCatalogs(models, noGo);
    expect(result.suspicious).toBe(true);
    expect(result.reason).toContain('Go plan');
  });

  test('calculates variation percentage', () => {
    const models = parseGoDocs(mockSource, fixtureHtml);
    const reduced = models.slice(0, Math.floor(models.length * 0.8));
    const result = compareCatalogs(models, reduced);
    expect(result.variationPercent).toBeGreaterThan(0);
  });
});
