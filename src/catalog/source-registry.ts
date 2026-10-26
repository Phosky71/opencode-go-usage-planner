// src/catalog/source-registry.ts
export interface Source {
  id: string;
  url: string;
  type: 'html' | 'json' | 'feed';
  fields: string[];
  description: string;
  method: 'api' | 'html-parser';
  parserName: string;
  frequency: 'daily' | 'weekly' | 'on-demand';
  notes?: string;
}

export const SOURCES: Source[] = [
  {
    id: 'opencode-go-docs',
    url: 'https://opencode.ai/v2/docs/console/go/',
    type: 'html',
    fields: ['displayName', 'monthlyLimitUsd', 'priceInputUsd', 'priceOutputUsd'],
    description: 'OpenCode Go documentation page with model pricing and limits',
    method: 'html-parser',
    parserName: 'parseGoDocs',
    frequency: 'daily',
    notes: 'HTML parsing of official documentation. Prices and limits may change; always verify manually before relying on them.',
  },
];