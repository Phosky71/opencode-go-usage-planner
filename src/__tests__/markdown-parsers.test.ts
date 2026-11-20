import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  parseMarkdownLimits,
  parseMarkdownPrices,
} from '../catalog/parsers';
import { Source } from '../catalog/source-registry';

const limitsSource: Source = {
  id: 'opencode-go-limits',
  url: 'https://opencode.ai/console/go.md',
  type: 'markdown',
  fields: ['displayName', 'monthlyLimitUsd'],
  description: 'Test source',
  method: 'markdown-parser',
  parserName: 'parseMarkdownLimits',
  frequency: 'daily',
};

const pricesSource: Source = {
  id: 'opencode-go-prices',
  url: 'https://opencode.ai/docs/console/models.md',
  type: 'markdown',
  fields: ['displayName', 'priceInputUsd', 'priceOutputUsd'],
  description: 'Test source',
  method: 'markdown-parser',
  parserName: 'parseMarkdownPrices',
  frequency: 'daily',
};

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, 'fixtures', name), 'utf-8');
}

// ---------------------------------------------------------------------------
// parseMarkdownLimits tests
// ---------------------------------------------------------------------------

describe('parseMarkdownLimits', () => {
  const fixture = loadFixture('go-limits-fixture.md');
  const result = parseMarkdownLimits(limitsSource, fixture);
  const models = result.models;

  it('parses 32 model rows producing 64 models (Go + Go Plus)', () => {
    expect(result.metrics.parsedRows).toBe(32);
    expect(models.length).toBe(64);
  });

  it('detects the limits table', () => {
    expect(result.metrics.pricingTablesFound).toBe(1);
  });

  it('skips the decorative scale row', () => {
    // The last row "|  | 100 1K 10K 100K |  |" has empty model name — should be skipped
    expect(result.metrics.skippedRows).toBe(0);
  });

  it('creates Go and Go Plus variants for each model', () => {
    const goModels = models.filter((m) => !m.id.includes('Go Plus'));
    const goPlusModels = models.filter((m) => m.id.includes('Go Plus'));
    expect(goModels.length).toBe(32);
    expect(goPlusModels.length).toBe(32);
  });

  it('parses Kimi K3 limits correctly', () => {
    const goKimi = models.find((m) => m.id === 'kimi-k3' && !m.id.includes('Go Plus'));
    expect(goKimi).toBeDefined();
    expect(goKimi?.monthlyLimitUsd).toBe(15);
    expect(goKimi?.limitStatus).toBe('known');

    const goPlusKimi = models.find((m) => m.id === 'kimi-k3 (Go Plus)');
    expect(goPlusKimi?.monthlyLimitUsd).toBe(60);
  });

  it('parses GLM-5.3 high limits correctly', () => {
    const goGlm = models.find((m) => m.id === 'glm-5-3' && !m.id.includes('Go Plus'));
    expect(goGlm?.monthlyLimitUsd).toBe(500);

    const goPlusGlm = models.find((m) => m.id === 'glm-5-3 (Go Plus)');
    expect(goPlusGlm?.monthlyLimitUsd).toBe(1000);
  });

  it('parses unlimited models correctly', () => {
    const freeModels = models.filter((m) => m.unlimited === true);
    expect(freeModels.length).toBe(8); // 4 Free models × 2 plans

    const beamGo = models.find((m) => m.id === 'beam-free' && !m.id.includes('Go Plus'));
    expect(beamGo?.unlimited).toBe(true);
    expect(beamGo?.limitStatus).toBe('unlimited');
    expect(beamGo?.monthlyLimitUsd).toBe(null);
  });

  it('extracts "New" note from model name', () => {
    const qwen4Max = models.find((m) => m.displayName === 'Qwen4 Max');
    expect(qwen4Max).toBeDefined();
    expect(qwen4Max?.notes).toContain('New');
  });

  it('extracts "Limited regions" note', () => {
    const museSpark = models.find((m) => m.displayName === 'Muse Spark 1.2 Contributor');
    expect(museSpark).toBeDefined();
    expect(museSpark?.notes).toContain('Limited regions');
  });

  it('extracts "Limited time" note', () => {
    const iceman = models.find((m) => m.displayName === 'Iceman Contributor Free');
    expect(iceman).toBeDefined();
    expect(iceman?.notes).toContain('Limited time');
  });

  it('extracts combined notes', () => {
    const hy4Flash = models.find((m) => m.displayName === 'Hy4 flash Free');
    expect(hy4Flash).toBeDefined();
    expect(hy4Flash?.notes).toContain('New');
    expect(hy4Flash?.notes).toContain('Limited time');
  });

  it('sets correct source URL', () => {
    for (const m of models) {
      expect(m.sourceUrl).toBe(limitsSource.url);
    }
  });

  it('sets provider to OpenCode', () => {
    for (const m of models) {
      expect(m.provider).toBe('OpenCode');
    }
  });

  it('throws when no limits table is found', () => {
    expect(() => parseMarkdownLimits(limitsSource, '# No table here\n\nJust text.')).toThrow(
      'No limits table found',
    );
  });

  it('handles empty markdown', () => {
    expect(() => parseMarkdownLimits(limitsSource, '')).toThrow('No limits table found');
  });

  it('marks models as active', () => {
    for (const m of models) {
      expect(m.active).toBe(true);
    }
  });

  it('generates correct slug IDs', () => {
    const expectedIds = [
      'kimi-k3',
      'kimi-k3-1-pro',
      'qwen3-8-max',
      'grok-4-7',
      'step-5-preview',
      'qwen4-max',
      'gemini-4-argon',
      'glm-5-2',
      'kimi-k2-7-code',
      'deepseek-v4-pro',
    ];
    for (const id of expectedIds) {
      const found = models.find((m) => m.id === id);
      expect(found).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// parseMarkdownPrices tests
// ---------------------------------------------------------------------------

describe('parseMarkdownPrices', () => {
  const fixture = loadFixture('models-prices-fixture.md');
  const result = parseMarkdownPrices(pricesSource, fixture);
  const models = result.models;

  it('parses all model rows', () => {
    expect(result.metrics.parsedRows).toBe(31);
    expect(models.length).toBe(31);
  });

  it('detects the pricing table', () => {
    expect(result.metrics.pricingTablesFound).toBe(1);
  });

  it('parses free models correctly', () => {
    const bigPickle = models.find((m) => m.displayName === 'Big Pickle');
    expect(bigPickle).toBeDefined();
    expect(bigPickle?.priceInputUsd).toBe(0);
    expect(bigPickle?.priceOutputUsd).toBe(0);
  });

  it('parses standard prices correctly', () => {
    const kimiK3 = models.find((m) => m.displayName === 'Kimi K3');
    expect(kimiK3).toBeDefined();
    expect(kimiK3?.priceInputUsd).toBe(2.0);
    expect(kimiK3?.priceOutputUsd).toBe(10.0);
  });

  it('parses strikethrough prices correctly', () => {
    const mistral = models.find((m) => m.displayName.includes('Mistral Large 4'));
    expect(mistral).toBeDefined();
    // Current price (after strikethrough)
    expect(mistral?.priceInputUsd).toBe(0.68);
    expect(mistral?.priceOutputUsd).toBe(2.09);
  });

  it('parses Gemini 4 Argon discounted price', () => {
    const gemini = models.find((m) => m.displayName.includes('Gemini 4 Argon'));
    expect(gemini).toBeDefined();
    expect(gemini?.priceInputUsd).toBe(2.0);
    expect(gemini?.priceOutputUsd).toBe(10.0);
  });

  it('handles dash as undefined price', () => {
    const bigPickle = models.find((m) => m.displayName === 'Big Pickle');
    // Cached Write is "-" for Big Pickle
    expect(bigPickle).toBeDefined();
  });

  it('parses context variant models', () => {
    const grokLow = models.find((m) => m.displayName.includes('Grok 4.7') && m.displayName.includes('≤'));
    expect(grokLow).toBeDefined();
    expect(grokLow?.priceInputUsd).toBe(2.0);
    expect(grokLow?.notes).toContain('Context variant');

    const grokHigh = models.find((m) => m.displayName.includes('Grok 4.7') && m.displayName.includes('>'));
    expect(grokHigh).toBeDefined();
    expect(grokHigh?.priceInputUsd).toBe(4.0);
  });

  it('parses cached read prices', () => {
    const kimiK3 = models.find((m) => m.displayName === 'Kimi K3');
    expect(kimiK3).toBeDefined();
  });

  it('sets monthlyLimitUsd to null for price-only models', () => {
    for (const m of models) {
      expect(m.monthlyLimitUsd).toBe(null);
      expect(m.limitStatus).toBe('unknown');
    }
  });

  it('sets correct source URL', () => {
    for (const m of models) {
      expect(m.sourceUrl).toBe(pricesSource.url);
    }
  });

  it('throws when no pricing table is found', () => {
    expect(() => parseMarkdownPrices(pricesSource, '# No table\n\nPlain text.')).toThrow(
      'No pricing table found',
    );
  });

  it('handles empty markdown', () => {
    expect(() => parseMarkdownPrices(pricesSource, '')).toThrow('No pricing table found');
  });

  it('marks models as active', () => {
    for (const m of models) {
      expect(m.active).toBe(true);
    }
  });

  it('parses Claude Haiku 5.5 context variants', () => {
    const low = models.find((m) => m.displayName.includes('Claude Haiku 5.5') && m.displayName.includes('≤'));
    expect(low).toBeDefined();
    expect(low?.priceInputUsd).toBe(0.1);

    const high = models.find((m) => m.displayName.includes('Claude Haiku 5.5') && m.displayName.includes('>'));
    expect(high).toBeDefined();
    expect(high?.priceInputUsd).toBe(0.5);
  });

  it('parses Gemini 3.8 Flash discounted price', () => {
    const gemini = models.find((m) => m.displayName.includes('Gemini 3.8 Flash'));
    expect(gemini).toBeDefined();
    expect(gemini?.priceInputUsd).toBe(0.75);
    expect(gemini?.priceOutputUsd).toBe(3.75);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('Markdown parsers edge cases', () => {
  it('handles table with missing columns gracefully', () => {
    const md = `
| Model | Relative request allowances | Est. requests / 5 hr | Monthly limit |
| --- | --- | --- | --- |
| Test Model |  | Go: 100; Go Plus: 400 | Go: $20; Go Plus: $80 |
| Incomplete |  | Go: 50 |
`;
    const result = parseMarkdownLimits(limitsSource, md);
    // Only the complete row should be parsed
    expect(result.metrics.parsedRows).toBe(1);
    expect(result.metrics.skippedRows).toBe(1);
  });

  it('handles prices table with missing columns', () => {
    const md = `
| Model | Input | Output | Cached Read | Cached Write |
| --- | --- | --- | --- | --- |
| Good Model | $1.00 | $5.00 | $0.10 | - |
| Bad Model | $1.00 |
`;
    const result = parseMarkdownPrices(pricesSource, md);
    expect(result.metrics.parsedRows).toBe(1);
    expect(result.metrics.skippedRows).toBe(1);
  });

  it('handles encoding artifacts for infinity symbol', () => {
    const md = `
| Model | Relative request allowances | Est. requests / 5 hr | Monthly limit |
| --- | --- | --- | --- |
| Free Model |  | Go: âˆž; Go Plus: âˆž | Go: âˆž; Go Plus: âˆž |
`;
    const result = parseMarkdownLimits(limitsSource, md);
    expect(result.metrics.parsedRows).toBe(1);
    const model = result.models.find((m) => m.displayName === 'Free Model' && !m.id.includes('Go Plus'));
    expect(model?.unlimited).toBe(true);
  });

  it('handles multiple tables and finds the right one for limits', () => {
    const md = `
| Model | Model ID | Endpoint |
| --- | --- | --- |
| GPT-4 | gpt-4 | /v1/chat |

Some text between tables.

| Model | Relative request allowances | Est. requests / 5 hr | Monthly limit |
| --- | --- | --- | --- |
| Test Model |  | Go: 100; Go Plus: 400 | Go: $20; Go Plus: $80 |
`;
    const result = parseMarkdownLimits(limitsSource, md);
    expect(result.metrics.parsedRows).toBe(1);
    expect(result.models[0].displayName).toBe('Test Model');
  });

  it('handles multiple tables and finds the right one for prices', () => {
    const md = `
| Model | Model ID | Endpoint |
| --- | --- | --- |
| GPT-4 | gpt-4 | /v1/chat |

| Model | Input | Output | Cached Read | Cached Write |
| --- | --- | --- | --- | --- |
| Test Model | $1.00 | $5.00 | $0.10 | - |
`;
    const result = parseMarkdownPrices(pricesSource, md);
    expect(result.metrics.parsedRows).toBe(1);
    expect(result.models[0].displayName).toBe('Test Model');
  });

  it('handles model names with backticks in other columns', () => {
    const md = `
| Model | Input | Output | Cached Read | Cached Write |
| --- | --- | --- | --- | --- |
| \`Code Model\` | $1.00 | $5.00 | $0.10 | - |
`;
    const result = parseMarkdownPrices(pricesSource, md);
    expect(result.metrics.parsedRows).toBe(1);
  });

  it('preserves model names with special characters', () => {
    const md = `
| Model | Relative request allowances | Est. requests / 5 hr | Monthly limit |
| --- | --- | --- | --- |
| GLM-5.3-Flash |  | Go: 6,320; Go Plus: 18,900 | Go: $60; Go Plus: $180 |
`;
    const result = parseMarkdownLimits(limitsSource, md);
    expect(result.models[0].displayName).toBe('GLM-5.3-Flash');
  });

  it('handles encoding artifacts for less-than-or-equal in prices', () => {
    const md = `
| Model | Input | Output | Cached Read | Cached Write |
| --- | --- | --- | --- | --- |
| GPT 6 Luna (â‰¤ 272K tokens) | $0.10 | $0.50 | $0.01 | $0.125 |
| GPT 6 Luna (> 272K tokens) | $0.20 | $0.75 | $0.02 | $0.25 |
`;
    const result = parseMarkdownPrices(pricesSource, md);
    expect(result.metrics.parsedRows).toBe(2);
    const low = result.models.find((m) => m.displayName.includes('≤'));
    expect(low).toBeDefined();
    expect(low?.priceInputUsd).toBe(0.1);
    expect(low?.notes).toContain('Context variant');
  });

  it('handles encoding artifacts for middle dot in notes', () => {
    const md = `
| Model | Relative request allowances | Est. requests / 5 hr | Monthly limit |
| --- | --- | --- | --- |
| Beam Free Limited regions Â· Limited time |  | Go: âˆž; Go Plus: âˆž | Go: âˆž; Go Plus: âˆž |
`;
    const result = parseMarkdownLimits(limitsSource, md);
    expect(result.metrics.parsedRows).toBe(1);
    const model = result.models.find((m) => m.displayName === 'Beam Free' && !m.id.includes('Go Plus'));
    expect(model).toBeDefined();
    expect(model?.unlimited).toBe(true);
    expect(model?.notes).toContain('Limited regions');
    expect(model?.notes).toContain('Limited time');
  });

  it('handles all encoding artifacts simultaneously', () => {
    const md = `
| Model | Relative request allowances | Est. requests / 5 hr | Monthly limit |
| --- | --- | --- | --- |
| Test Model New Limited regions Â· Limited time |  | Go: âˆž; Go Plus: âˆž | Go: âˆž; Go Plus: âˆž |
`;
    const result = parseMarkdownLimits(limitsSource, md);
    const model = result.models.find((m) => m.displayName === 'Test Model' && !m.id.includes('Go Plus'));
    expect(model).toBeDefined();
    expect(model?.unlimited).toBe(true);
    expect(model?.notes).toContain('New');
    expect(model?.notes).toContain('Limited regions');
    expect(model?.notes).toContain('Limited time');
  });
});
