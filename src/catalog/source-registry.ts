// src/catalog/source-registry.ts
export interface Source {
  id: string;
  url: string;
  type: 'html' | 'json' | 'feed' | 'markdown';
  fields: string[];
  description: string;
  method: 'api' | 'html-parser' | 'markdown-parser';
  parserName: string;
  frequency: 'daily' | 'weekly' | 'on-demand';
  notes?: string;
  /** When true, this source is skipped during updates and verification */
  disabled?: boolean;
}

export const SOURCES: Source[] = [
  {
    id: 'opencode-go-limits',
    url: 'https://opencode.ai/console/go.md',
    type: 'markdown',
    fields: ['displayName', 'monthlyLimitUsd'],
    description: 'OpenCode Go Markdown page with model limits for Go and Go Plus plans',
    method: 'markdown-parser',
    parserName: 'parseMarkdownLimits',
    frequency: 'daily',
    notes: 'Official Markdown version of the Go pricing page. Provides monthly limits per model for Go and Go Plus. No authentication required.',
  },
  {
    id: 'opencode-go-prices',
    url: 'https://opencode.ai/docs/console/models.md',
    type: 'markdown',
    fields: ['displayName', 'priceInputUsd', 'priceOutputUsd'],
    description: 'OpenCode models Markdown page with per-model token pricing',
    method: 'markdown-parser',
    parserName: 'parseMarkdownPrices',
    frequency: 'daily',
    notes: 'Official Markdown version of the models documentation. Provides input/output/cached pricing per model. No authentication required.',
  },
  {
    id: 'opencode-go-docs',
    url: 'https://opencode.ai/v2/docs/console/go/',
    type: 'html',
    fields: ['displayName', 'monthlyLimitUsd', 'priceInputUsd', 'priceOutputUsd'],
    description: 'OpenCode Go documentation page with model pricing and limits (legacy HTML)',
    method: 'html-parser',
    parserName: 'parseGoDocs',
    frequency: 'daily',
    notes: 'Legacy HTML parser. This source is deprecated; use opencode-go-limits and opencode-go-prices instead.',
    disabled: true,
  },
];