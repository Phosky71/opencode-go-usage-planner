// src/catalog/parsers.ts
import { Model } from '../domain/models';
import { Source } from './source-registry';
import { parse } from 'node-html-parser';

export interface ParseResult {
  models: Model[];
  metrics: {
    tablesFound: number;
    pricingTablesFound: number;
    totalRows: number;          // All data rows in pricing tables
    parsedRows: number;         // Successfully parsed model rows
    skippedRows: number;        // Rows that looked like models but couldn't be parsed
    skippedReasons: string[];   // Reasons for skipping
    detectedModelRows: number;  // Rows that appear to contain model data (first cell has text)
  };
}

/** Parse the Go documentation HTML page to extract models with pricing and limits */
export function parseGoDocs(source: Source, html: string): Model[] {
  const result = parseGoDocsDetailed(source, html);
  return result.models;
}

/** Parse with detailed metrics for integrity validation */
export function parseGoDocsDetailed(source: Source, html: string): ParseResult {
  const root = parse(html);
  const tables = root.querySelectorAll('table');
  if (!tables.length) {
    throw new Error('No tables found in Go docs page');
  }

  // Find pricing tables by header content (not by index)
  const pricingTables: { table: any; isGoPlus: boolean }[] = [];
  for (const table of tables) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;
    
    const header = rows[0].querySelectorAll('th,td').map((c: any) => c.text.trim().toLowerCase());
    const hasModel = header.indexOf('model') >= 0;
    const hasMonthlyLimit = header.findIndex((col: string) => col.includes('monthly limit')) >= 0;
    const hasInput = header.indexOf('input') >= 0;
    const hasOutput = header.indexOf('output') >= 0;
    
    if (hasModel && hasMonthlyLimit && hasInput && hasOutput) {
      pricingTables.push({ table, isGoPlus: false });
    }
  }

  if (pricingTables.length === 0) {
    throw new Error('No pricing tables found in Go docs page');
  }

  // If we have 2 pricing tables, the second is Go Plus
  if (pricingTables.length >= 2) {
    pricingTables[1].isGoPlus = true;
  }

  const models: Model[] = [];
  let totalRows = 0;
  let parsedRows = 0;
  let skippedRows = 0;
  const skippedReasons: string[] = [];
  let detectedModelRows = 0;

  for (const { table, isGoPlus } of pricingTables) {
    const rows = table.querySelectorAll('tr');
    if (rows.length < 2) continue;

    const header = rows[0].querySelectorAll('th,td').map((c: any) => c.text.trim().toLowerCase());
    const idx = {
      model: header.indexOf('model'),
      monthlyLimit: header.findIndex((col: string) => col.includes('monthly limit')),
      priceInput: header.indexOf('input'),
      priceOutput: header.indexOf('output'),
    };

    if (idx.model < 0 || idx.monthlyLimit < 0) {
      throw new Error('Unexpected table structure in Go docs pricing table');
    }

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('th,td');
      totalRows++;

      // A row that looks like a model row has text in the first cell
      const firstCellText = cells.length > 0 ? (cells[0].innerHTML || cells[0].toString()).replace(/<[^>]+>/g, '').trim() : '';
      const looksLikeModel = firstCellText.length > 0;
      
      if (looksLikeModel) {
        detectedModelRows++;
      }

      if (cells.length < 6) {
        if (looksLikeModel) {
          skippedRows++;
          skippedReasons.push(`Row ${i}: incomplete (only ${cells.length} cells, expected 6)`);
        }
        continue;
      }

      const getTextWithoutDel = (cell: any): string => {
        const innerHtml = cell.innerHTML || cell.toString();
        const withoutDel = innerHtml.replace(/<del[^>]*>.*?<\/del>/gi, '');
        const tempRoot = parse(withoutDel);
        return tempRoot.text.trim();
      };

      const modelId = getTextWithoutDel(cells[idx.model]);
      if (!modelId) {
        if (looksLikeModel) {
          skippedRows++;
          skippedReasons.push(`Row ${i}: empty model name after parsing`);
        }
        continue;
      }

      const monthlyLimitStr = getTextWithoutDel(cells[idx.monthlyLimit]);
      const priceInputStr = idx.priceInput >= 0 ? getTextWithoutDel(cells[idx.priceInput]) : '';
      const priceOutputStr = idx.priceOutput >= 0 ? getTextWithoutDel(cells[idx.priceOutput]) : '';

      const monthlyLimitUsd = parseMonthlyLimit(monthlyLimitStr);
      const unlimited = monthlyLimitUsd === null;
      const priceInputUsd = parsePrice(priceInputStr);
      const priceOutputUsd = parsePrice(priceOutputStr);

      const id = isGoPlus ? `${modelId} (Go Plus)` : `${modelId} (Go)`;

      const model: Model = {
        id,
        displayName: modelId,
        provider: 'OpenCode',
        monthlyLimitUsd,
        unlimited,
        priceInputUsd,
        priceOutputUsd,
        sourceUrl: source.url,
        checkedAt: new Date().toISOString(),
        sourceType: 'official_verified',
        confidence: 'high',
        notes: isGoPlus ? 'Go Plus plan' : 'Go plan',
        active: true,
      };

      models.push(model);
      parsedRows++;
    }
  }

  return {
    models,
    metrics: {
      tablesFound: tables.length,
      pricingTablesFound: pricingTables.length,
      totalRows,
      parsedRows,
      skippedRows,
      skippedReasons,
      detectedModelRows,
    },
  };
}

/** Parse simple JSON listing of model IDs – used to confirm model existence */
export function parseModelsApi(source: Source, json: string): Model[] {
  let data: any;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON from models API');
  }
  
  if (!Array.isArray(data)) {
    if (data && Array.isArray(data.data)) {
      data = data.data;
    } else if (data && Array.isArray(data.models)) {
      data = data.models;
    } else {
      throw new Error('Unexpected JSON shape from models API');
    }
  }

  const now = new Date().toISOString();
  return data.map((item: { id: string }) => ({
    id: item.id,
    displayName: item.id.replace(/-/g, ' '),
    provider: 'OpenCode',
    monthlyLimitUsd: null,
    unlimited: true,
    sourceUrl: source.url,
    checkedAt: now,
    sourceType: 'official_verified' as const,
    confidence: 'high' as const,
  }));
}

function parseMonthlyLimit(value: string): number | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes('unlimited')) return null;
  if (trimmed === 'free' || trimmed === '-') return 0;
  
  const withoutDel = value.replace(/<del>.*?<\/del>/gi, '').trim();
  const match = withoutDel.match(/\$?([\d,.]+)/);
  if (!match) return 0;
  return parseFloat(match[1].replace(/,/g, ''));
}

function parsePrice(value: string): number | undefined {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'free' || trimmed === '-') return 0;
  if (!trimmed) return undefined;
  
  const withoutDel = value.replace(/<del>.*?<\/del>/gi, '').trim();
  const match = withoutDel.match(/\$?([\d,.]+)/);
  if (!match) return undefined;
  const num = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}