// src/__tests__/normalizer-matcher-merger.test.ts
import { describe, it, expect } from 'vitest';
import {
  normalizeName,
  stripContextVariant,
  stripDiscountSuffix,
  getPriceBaseName,
  DUBIOUS_CORRESPONDENCES,
  CONTEXT_VARIANT_MODELS,
  NO_PRICE_MODELS,
  matchLimitToPrice,
  findPriceMatches,
} from '../catalog/normalizer';
import {
  matchSingleLimit,
  matchAllLimits,
  buildPriceIndex,
} from '../catalog/matcher';
import {
  mergeLimitsAndPrices,
  markDeprecated,
  buildCompleteCatalog,
} from '../catalog/merger';
import { Model } from '../domain/models';
import { MarkdownLimitsResult, MarkdownPricesResult } from '../catalog/parsers';

// ---------------------------------------------------------------------------
// Helpers to create test data
// ---------------------------------------------------------------------------

function createLimitModel(displayName: string, plan: 'Go' | 'Go Plus', monthlyLimitUsd: number | null, unlimited = false): Model {
  const slugId = displayName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return {
    id: plan === 'Go Plus' ? `${slugId} (Go Plus)` : slugId,
    displayName,
    provider: 'OpenCode',
    plan,
    monthlyLimitUsd,
    limitStatus: unlimited ? 'unlimited' : monthlyLimitUsd !== null ? 'known' : 'unknown',
    unlimited,
    estRequests5h: 100,
    limitsSource: 'https://opencode.ai/console/go.md',
    sourceUrl: 'https://opencode.ai/console/go.md',
    checkedAt: '2024-01-01T00:00:00.000Z',
    sourceType: 'official_document',
    verification: 'auto_extracted',
    confidence: 'medium',
    notes: `${plan} plan`,
    active: true,
  };
}

function createPriceModel(displayName: string, input: number, output: number, cachedRead?: number, cachedWrite?: number): Model {
  const slugId = displayName.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '-').trim();
  return {
    id: slugId || displayName.toLowerCase(),
    displayName,
    provider: 'OpenCode',
    monthlyLimitUsd: null,
    limitStatus: 'unknown',
    unlimited: false,
    priceInputUsd: input,
    priceOutputUsd: output,
    cachedReadPrice: cachedRead,
    cachedWritePrice: cachedWrite,
    priceSource: 'https://opencode.ai/docs/console/models.md',
    sourceUrl: 'https://opencode.ai/docs/console/models.md',
    checkedAt: '2024-01-01T00:00:00.000Z',
    sourceType: 'official_document',
    verification: 'auto_extracted',
    confidence: 'medium',
    notes: displayName.includes('≤') || displayName.includes('>') ? `Context variant: ${displayName}` : undefined,
    active: true,
  };
}

function createLimitsResult(models: Model[]): MarkdownLimitsResult {
  return {
    models,
    metrics: {
      tablesFound: 1,
      pricingTablesFound: 1,
      totalRows: models.length / 2,
      parsedRows: models.length / 2,
      skippedRows: 0,
      skippedReasons: [],
      detectedModelRows: models.length / 2,
    },
  };
}

function createPricesResult(models: Model[]): MarkdownPricesResult {
  return {
    models,
    metrics: {
      tablesFound: 1,
      pricingTablesFound: 1,
      totalRows: models.length,
      parsedRows: models.length,
      skippedRows: 0,
      skippedReasons: [],
      detectedModelRows: models.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Normalizer tests
// ---------------------------------------------------------------------------

describe('normalizer', () => {
  describe('normalizeName', () => {
    it('lowercases and collapses hyphens/spaces', () => {
      expect(normalizeName('GLM-5.3-Flash')).toBe('glm 5.3 flash');
      expect(normalizeName('GLM 5.3 Flash')).toBe('glm 5.3 flash');
      expect(normalizeName('MiniMax-M3')).toBe('minimax m3');
    });

    it('handles multiple spaces', () => {
      expect(normalizeName('Grok   4.7')).toBe('grok 4.7');
    });

    it('trims whitespace', () => {
      expect(normalizeName('  Beam Free  ')).toBe('beam free');
    });
  });

  describe('stripContextVariant', () => {
    it('removes context variant suffix', () => {
      expect(stripContextVariant('GPT 6 Luna (≤ 272K tokens)')).toBe('GPT 6 Luna');
      expect(stripContextVariant('GPT 6 Luna (> 272K tokens)')).toBe('GPT 6 Luna');
      expect(stripContextVariant('Claude Haiku 5.5 (≤ 100K tokens)')).toBe('Claude Haiku 5.5');
    });

    it('does not modify names without context variant', () => {
      expect(stripContextVariant('Kimi K3')).toBe('Kimi K3');
    });
  });

  describe('stripDiscountSuffix', () => {
    it('removes discount suffix', () => {
      expect(stripDiscountSuffix('Gemini 4 Argon (50% off)')).toBe('Gemini 4 Argon');
    });

    it('does not modify names without discount', () => {
      expect(stripDiscountSuffix('Kimi K3')).toBe('Kimi K3');
    });
  });

  describe('getPriceBaseName', () => {
    it('strips both context variant and discount', () => {
      expect(getPriceBaseName('GPT 6 Luna (≤ 272K tokens)')).toBe('GPT 6 Luna');
      expect(getPriceBaseName('Gemini 4 Argon (50% off)')).toBe('Gemini 4 Argon');
    });
  });

  describe('matchLimitToPrice', () => {
    it('returns exact for identical names', () => {
      expect(matchLimitToPrice('Kimi K3', 'Kimi K3')).toBe('exact');
    });

    it('returns normalized for hyphen/space differences', () => {
      expect(matchLimitToPrice('GLM-5.2', 'GLM 5.2')).toBe('normalized');
      expect(matchLimitToPrice('MiniMax-M3', 'MiniMax M3')).toBe('normalized');
    });

    it('returns normalized for GLM-5.3-Flash (hyphen/space normalization)', () => {
      // GLM-5.3-Flash → GLM 5.3 Flash is resolved by normalizeName, not explicit mapping
      expect(matchLimitToPrice('GLM-5.3-Flash', 'GLM 5.3 Flash')).toBe('normalized');
    });

    it('returns context-variant for context variant models', () => {
      expect(matchLimitToPrice('Grok 4.7', 'Grok 4.7 (≤ 200K tokens)')).toBe('context-variant');
      expect(matchLimitToPrice('GPT-6 Luna', 'GPT 6 Luna (> 272K tokens)')).toBe('context-variant');
    });

    it('returns null for no match', () => {
      expect(matchLimitToPrice('Qwen4 Max', 'Kimi K3')).toBeNull();
    });

    it('handles discount suffix via normalization', () => {
      expect(matchLimitToPrice('Gemini 4 Argon', 'Gemini 4 Argon (50% off)')).toBe('normalized');
    });
  });

  describe('findPriceMatches', () => {
    it('finds single exact match', () => {
      const prices = ['Kimi K3', 'Qwen3.8 Max'];
      expect(findPriceMatches('Kimi K3', prices)).toEqual(['Kimi K3']);
    });

    it('finds context variant matches', () => {
      const prices = ['GPT 6 Luna (≤ 272K tokens)', 'GPT 6 Luna (> 272K tokens)'];
      const matches = findPriceMatches('GPT-6 Luna', prices);
      expect(matches).toHaveLength(2);
    });

    it('finds no match for unknown model', () => {
      const prices = ['Kimi K3', 'Qwen3.8 Max'];
      expect(findPriceMatches('Unknown Model', prices)).toEqual([]);
    });
  });

  describe('DUBIOUS_CORRESPONDENCES', () => {
    it('contains the 4 dubious models', () => {
      expect(DUBIOUS_CORRESPONDENCES.has('DeepSeek V4.1 Flash 1017')).toBe(true);
      expect(DUBIOUS_CORRESPONDENCES.has('Muse Spark 1.2 Contributor')).toBe(true);
      expect(DUBIOUS_CORRESPONDENCES.has('Muse Spark 1.3 Contributor')).toBe(true);
      expect(DUBIOUS_CORRESPONDENCES.has('Iceman Contributor Free')).toBe(true);
    });
  });

  describe('CONTEXT_VARIANT_MODELS', () => {
    it('contains the 4 context variant models', () => {
      expect(CONTEXT_VARIANT_MODELS.has('Grok 4.7')).toBe(true);
      expect(CONTEXT_VARIANT_MODELS.has('GPT-5.6 Luna')).toBe(true);
      expect(CONTEXT_VARIANT_MODELS.has('GPT-6 Luna')).toBe(true);
      expect(CONTEXT_VARIANT_MODELS.has('Claude Haiku 5.5')).toBe(true);
    });
  });

  describe('NO_PRICE_MODELS', () => {
    it('contains the 11 models without price', () => {
      expect(NO_PRICE_MODELS.has('Kimi K3.1 Pro')).toBe(true);
      expect(NO_PRICE_MODELS.has('Hy4')).toBe(true);
      expect(NO_PRICE_MODELS.has('Qwen3.7 Plus')).toBe(true);
      expect(NO_PRICE_MODELS.size).toBe(11);
    });
  });
});

// ---------------------------------------------------------------------------
// Matcher tests
// ---------------------------------------------------------------------------

describe('matcher', () => {
  describe('matchSingleLimit', () => {
    it('matches exact name', () => {
      const limit = createLimitModel('Kimi K3', 'Go', 15);
      const prices = [createPriceModel('Kimi K3', 0.1, 0.5)];
      const result = matchSingleLimit(limit, prices);
      expect(result.matchType).toBe('exact');
      expect(result.priceModels).toHaveLength(1);
    });

    it('matches normalized name (hyphen/space)', () => {
      const limit = createLimitModel('GLM-5.2', 'Go', 60);
      const prices = [createPriceModel('GLM 5.2', 0.2, 0.8)];
      const result = matchSingleLimit(limit, prices);
      expect(result.matchType).toBe('normalized');
    });

    it('returns context-variant for 2 price matches', () => {
      const limit = createLimitModel('Grok 4.7', 'Go', 15);
      const prices = [
        createPriceModel('Grok 4.7 (≤ 200K tokens)', 0.1, 0.5),
        createPriceModel('Grok 4.7 (> 200K tokens)', 0.2, 0.75),
      ];
      const result = matchSingleLimit(limit, prices);
      expect(result.matchType).toBe('context-variant');
      expect(result.hasContextVariants).toBe(true);
      expect(result.priceModels).toHaveLength(2);
    });

    it('returns no-price for unknown model', () => {
      const limit = createLimitModel('Qwen4 Max', 'Go', 15);
      const prices = [createPriceModel('Kimi K3', 0.1, 0.5)];
      const result = matchSingleLimit(limit, prices);
      expect(result.matchType).toBe('no-price');
      expect(result.priceModels).toHaveLength(0);
    });

    it('returns dubious for dubious correspondence', () => {
      const limit = createLimitModel('DeepSeek V4.1 Flash 1017', 'Go', 100);
      const prices = [createPriceModel('DeepSeek V4.1 Flash', 0.3, 1.0)];
      const result = matchSingleLimit(limit, prices);
      expect(result.matchType).toBe('dubious');
      expect(result.priceModels).toHaveLength(0);
    });

    it('returns dubious for Muse Spark Contributor', () => {
      const limit = createLimitModel('Muse Spark 1.2 Contributor', 'Go', 60);
      const prices = [createPriceModel('Muse Spark 1.2', 1.25, 5.0)];
      const result = matchSingleLimit(limit, prices);
      expect(result.matchType).toBe('dubious');
    });

    it('returns dubious for Iceman Contributor Free', () => {
      const limit = createLimitModel('Iceman Contributor Free', 'Go', null);
      const prices = [createPriceModel('Iceman Free', 0, 0)];
      const result = matchSingleLimit(limit, prices);
      expect(result.matchType).toBe('dubious');
    });
  });

  describe('matchAllLimits', () => {
    it('deduplicates by display name', () => {
      const limits = [
        createLimitModel('Kimi K3', 'Go', 15),
        createLimitModel('Kimi K3', 'Go Plus', 60),
      ];
      const prices = [createPriceModel('Kimi K3', 0.1, 0.5)];
      const results = matchAllLimits(limits, prices);
      expect(results).toHaveLength(1); // Only 1 unique name
    });
  });

  describe('buildPriceIndex', () => {
    it('groups context variants under the same base name', () => {
      const prices = [
        createPriceModel('GPT 6 Luna (≤ 272K tokens)', 0.1, 0.5),
        createPriceModel('GPT 6 Luna (> 272K tokens)', 0.2, 0.75),
      ];
      const index = buildPriceIndex(prices);
      const base = index.get('gpt 6 luna');
      expect(base).toHaveLength(2);
    });

    it('separates different models', () => {
      const prices = [
        createPriceModel('Kimi K3', 0.1, 0.5),
        createPriceModel('Qwen3.8 Max', 0.2, 0.8),
      ];
      const index = buildPriceIndex(prices);
      expect(index.get('kimi k3')).toHaveLength(1);
      expect(index.get('qwen3.8 max')).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// Merger tests
// ---------------------------------------------------------------------------

describe('merger', () => {
  describe('mergeLimitsAndPrices', () => {
    it('merges exact match correctly', () => {
      const limits = createLimitsResult([
        createLimitModel('Kimi K3', 'Go', 15),
        createLimitModel('Kimi K3', 'Go Plus', 60),
      ]);
      const prices = createPricesResult([
        createPriceModel('Kimi K3', 0.1, 0.5),
      ]);

      const { models, metrics } = mergeLimitsAndPrices(limits, prices);

      expect(metrics.exactMatches).toBe(1);
      expect(metrics.totalMergedRecords).toBe(2); // Go + Go Plus

      const goModel = models.find((m) => m.plan === 'Go');
      expect(goModel).toBeDefined();
      expect(goModel?.priceInputUsd).toBe(0.1);
      expect(goModel?.priceOutputUsd).toBe(0.5);
      expect(goModel?.monthlyLimitUsd).toBe(15);
      expect(goModel?.limitsSource).toBe('https://opencode.ai/console/go.md');
      expect(goModel?.priceSource).toBe('https://opencode.ai/docs/console/models.md');
    });

    it('merges normalized match correctly', () => {
      const limits = createLimitsResult([
        createLimitModel('GLM-5.2', 'Go', 60),
        createLimitModel('GLM-5.2', 'Go Plus', 180),
      ]);
      const prices = createPricesResult([
        createPriceModel('GLM 5.2', 0.2, 0.8),
      ]);

      const { models, metrics } = mergeLimitsAndPrices(limits, prices);

      expect(metrics.normalizedMatches).toBe(1);
      expect(metrics.totalMergedRecords).toBe(2);
      expect(models[0].priceInputUsd).toBe(0.2);
    });

    it('creates 4 records for context variant', () => {
      const limits = createLimitsResult([
        createLimitModel('Grok 4.7', 'Go', 15),
        createLimitModel('Grok 4.7', 'Go Plus', 60),
      ]);
      const prices = createPricesResult([
        createPriceModel('Grok 4.7 (≤ 200K tokens)', 0.1, 0.5),
        createPriceModel('Grok 4.7 (> 200K tokens)', 0.2, 0.75),
      ]);

      const { models, metrics } = mergeLimitsAndPrices(limits, prices);

      expect(metrics.contextVariantMatches).toBe(1);
      expect(metrics.totalMergedRecords).toBe(4); // Go ≤, Go >, Go Plus ≤, Go Plus >

      const goLow = models.find((m) => m.plan === 'Go' && m.displayName.includes('≤'));
      expect(goLow).toBeDefined();
      expect(goLow?.priceInputUsd).toBe(0.1);
      expect(goLow?.monthlyLimitUsd).toBe(15);

      const goHigh = models.find((m) => m.plan === 'Go' && m.displayName.includes('>'));
      expect(goHigh).toBeDefined();
      expect(goHigh?.priceInputUsd).toBe(0.2);
    });

    it('handles no-price models correctly', () => {
      const limits = createLimitsResult([
        createLimitModel('Qwen4 Max', 'Go', 15),
        createLimitModel('Qwen4 Max', 'Go Plus', 60),
      ]);
      const prices = createPricesResult([
        createPriceModel('Kimi K3', 0.1, 0.5),
      ]);

      const { models, metrics } = mergeLimitsAndPrices(limits, prices);

      expect(metrics.noPriceMatches).toBe(1);
      expect(metrics.totalMergedRecords).toBe(2);
      expect(models[0].priceInputUsd).toBeUndefined();
      expect(models[0].priceOutputUsd).toBeUndefined();
      expect(models[0].monthlyLimitUsd).toBe(15);
    });

    it('handles dubious correspondences — does NOT associate prices', () => {
      const limits = createLimitsResult([
        createLimitModel('DeepSeek V4.1 Flash 1017', 'Go', 100),
        createLimitModel('DeepSeek V4.1 Flash 1017', 'Go Plus', 200),
      ]);
      const prices = createPricesResult([
        createPriceModel('DeepSeek V4.1 Flash', 0.3, 1.0),
      ]);

      const { models, metrics } = mergeLimitsAndPrices(limits, prices);

      expect(metrics.dubiousMatches).toBe(1);
      expect(metrics.totalMergedRecords).toBe(2);
      // Prices should NOT be associated
      expect(models[0].priceInputUsd).toBeUndefined();
      expect(models[0].notes).toContain('Dubious correspondence');
    });

    it('preserves unlimited status', () => {
      const limits = createLimitsResult([
        createLimitModel('Beam Free', 'Go', null, true),
        createLimitModel('Beam Free', 'Go Plus', null, true),
      ]);
      const prices = createPricesResult([
        createPriceModel('Beam Free', 0, 0),
      ]);

      const { models } = mergeLimitsAndPrices(limits, prices);

      expect(models[0].unlimited).toBe(true);
      expect(models[0].limitStatus).toBe('unlimited');
      expect(models[0].monthlyLimitUsd).toBeNull();
    });

    it('preserves cached prices', () => {
      const limits = createLimitsResult([
        createLimitModel('Kimi K3', 'Go', 15),
        createLimitModel('Kimi K3', 'Go Plus', 60),
      ]);
      const prices = createPricesResult([
        createPriceModel('Kimi K3', 0.1, 0.5, 0.01, 0.125),
      ]);

      const { models } = mergeLimitsAndPrices(limits, prices);

      expect(models[0].cachedReadPrice).toBe(0.01);
      expect(models[0].cachedWritePrice).toBe(0.125);
    });

    it('handles discount suffix via normalization', () => {
      const limits = createLimitsResult([
        createLimitModel('Gemini 4 Argon', 'Go', 30),
        createLimitModel('Gemini 4 Argon', 'Go Plus', 120),
      ]);
      const prices = createPricesResult([
        createPriceModel('Gemini 4 Argon (50% off)', 2.0, 10.0),
      ]);

      const { models, metrics } = mergeLimitsAndPrices(limits, prices);

      expect(metrics.normalizedMatches).toBe(1);
      expect(models[0].priceInputUsd).toBe(2.0);
    });

    it('produces correct metrics summary', () => {
      // Create a mix of match types
      const limits = createLimitsResult([
        createLimitModel('Kimi K3', 'Go', 15),
        createLimitModel('Kimi K3', 'Go Plus', 60),
        createLimitModel('GLM-5.2', 'Go', 60),
        createLimitModel('GLM-5.2', 'Go Plus', 180),
        createLimitModel('Qwen4 Max', 'Go', 15),
        createLimitModel('Qwen4 Max', 'Go Plus', 60),
        createLimitModel('DeepSeek V4.1 Flash 1017', 'Go', 100),
        createLimitModel('DeepSeek V4.1 Flash 1017', 'Go Plus', 200),
      ]);
      const prices = createPricesResult([
        createPriceModel('Kimi K3', 0.1, 0.5),
        createPriceModel('GLM 5.2', 0.2, 0.8),
      ]);

      const { metrics } = mergeLimitsAndPrices(limits, prices);

      expect(metrics.exactMatches).toBe(1);
      expect(metrics.normalizedMatches).toBe(1);
      expect(metrics.noPriceMatches).toBe(1);
      expect(metrics.dubiousMatches).toBe(1);
      expect(metrics.limitModelsProcessed).toBe(4);
    });
  });

  describe('markDeprecated', () => {
    it('marks old models not in merged catalog as deprecated', () => {
      const oldCatalog: Model[] = [
        {
          id: 'mimo-v2.5',
          displayName: 'MiMo-V2.5',
          provider: 'OpenCode',
          monthlyLimitUsd: 15,
          sourceUrl: 'https://opencode.ai/v2/docs/console/go/',
          checkedAt: '2024-01-01T00:00:00.000Z',
          sourceType: 'official_document',
          confidence: 'medium',
        },
        {
          id: 'kimi-k3',
          displayName: 'Kimi K3',
          provider: 'OpenCode',
          monthlyLimitUsd: 15,
          sourceUrl: 'https://opencode.ai/v2/docs/console/go/',
          checkedAt: '2024-01-01T00:00:00.000Z',
          sourceType: 'official_document',
          confidence: 'medium',
        },
      ];

      const mergedModels = [
        {
          id: 'kimi-k3',
          displayName: 'Kimi K3',
          provider: 'OpenCode',
          plan: 'Go' as const,
          monthlyLimitUsd: 15,
          sourceUrl: 'https://opencode.ai/console/go.md',
          priceSource: 'https://opencode.ai/docs/console/models.md',
          limitsSource: 'https://opencode.ai/console/go.md',
          checkedAt: '2024-01-01T00:00:00.000Z',
          sourceType: 'official_document' as const,
          confidence: 'medium' as const,
        },
      ];

      const result = markDeprecated(oldCatalog, mergedModels);

      expect(result[0].deprecated).toBe(true); // MiMo-V2.5 — not in merged
      expect(result[0].active).toBe(false);
      expect(result[1].deprecated).toBeUndefined(); // Kimi K3 — still active
    });
  });

  describe('buildCompleteCatalog', () => {
    it('combines merged models with deprecated old models', () => {
      const oldCatalog: Model[] = [
        {
          id: 'mimo-v2.5',
          displayName: 'MiMo-V2.5',
          provider: 'OpenCode',
          monthlyLimitUsd: 15,
          sourceUrl: 'https://opencode.ai/v2/docs/console/go/',
          checkedAt: '2024-01-01T00:00:00.000Z',
          sourceType: 'official_document',
          confidence: 'medium',
        },
      ];

      const mergedModels = [
        {
          id: 'kimi-k3',
          displayName: 'Kimi K3',
          provider: 'OpenCode',
          plan: 'Go' as const,
          monthlyLimitUsd: 15,
          sourceUrl: 'https://opencode.ai/console/go.md',
          priceSource: 'https://opencode.ai/docs/console/models.md',
          limitsSource: 'https://opencode.ai/console/go.md',
          checkedAt: '2024-01-01T00:00:00.000Z',
          sourceType: 'official_document' as const,
          confidence: 'medium' as const,
        },
      ];

      const result = buildCompleteCatalog(oldCatalog, mergedModels);

      expect(result).toHaveLength(2);
      const kimi = result.find((m) => m.displayName === 'Kimi K3');
      expect(kimi).toBeDefined();
      expect(kimi?.deprecated).toBeUndefined();

      const mimo = result.find((m) => m.displayName === 'MiMo-V2.5');
      expect(mimo).toBeDefined();
      expect(mimo?.deprecated).toBe(true);
    });
  });
});
