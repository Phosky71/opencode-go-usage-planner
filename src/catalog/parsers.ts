// src/catalog/parsers.ts
import { LimitStatus, Model } from '../domain/models';
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

      const limit = parseMonthlyLimit(monthlyLimitStr);
      const priceInputUsd = parsePrice(priceInputStr);
      const priceOutputUsd = parsePrice(priceOutputStr);

      const id = isGoPlus ? `${modelId} (Go Plus)` : `${modelId} (Go)`;

      const model: Model = {
        id,
        displayName: modelId,
        provider: 'OpenCode',
        monthlyLimitUsd: limit.value,
        limitStatus: limit.status,
        unlimited: limit.status === 'unlimited',
        priceInputUsd,
        priceOutputUsd,
        sourceUrl: source.url,
        checkedAt: new Date().toISOString(),
        sourceType: 'official_document',
        verification: 'auto_extracted',
        confidence: 'medium',
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
    limitStatus: 'unknown' as const,
    unlimited: false,
    sourceUrl: source.url,
    checkedAt: now,
    sourceType: 'official_document' as const,
    verification: 'auto_extracted' as const,
    confidence: 'low' as const,
  }));
}

function parseMonthlyLimit(value: string): { value: number | null; status: LimitStatus } {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.includes('unlimited') || trimmed.includes('ilimitado')) {
    return { value: null, status: 'unlimited' };
  }
  if (trimmed === 'free' || trimmed === 'gratis') {
    return { value: 0, status: 'known' };
  }
  if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'n/a' || trimmed === 'unknown' || trimmed === 'sin datos') {
    return { value: null, status: 'unknown' };
  }

  const withoutDel = value.replace(/<del>.*?<\/del>/gi, '').trim();
  const match = withoutDel.match(/\$?([\d,.]+)/);
  if (!match) return { value: null, status: 'unknown' };

  const parsed = parseFloat(match[1].replace(/,/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return { value: null, status: 'unknown' };
  }
  return { value: parsed, status: 'known' };
}

function parsePrice(value: string): number | undefined {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'free' || trimmed === 'gratis') return 0;
  if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'n/a' || trimmed === 'unknown') {
    return undefined;
  }

  const withoutDel = value.replace(/<del>.*?<\/del>/gi, '').trim();
  const match = withoutDel.match(/\$?([\d,.]+)/);
  if (!match) return undefined;
  const num = parseFloat(match[1].replace(/,/g, ''));
  return isNaN(num) ? undefined : num;
}

// ---------------------------------------------------------------------------
// Markdown parsers
// ---------------------------------------------------------------------------

/** A single row parsed from a Markdown table */
interface MdTableRow {
  cells: string[];
}

/** Normalize common UTF-8 → Latin-1 encoding corruption artifacts. */
function normalizeEncoding(text: string): string {
  return text
    .replace(/â‰¤/g, '≤')   // UTF-8 ≤ misread as Latin-1
    .replace(/Â·/g, '·')    // UTF-8 · misread as Latin-1
    .replace(/âˆž/g, '∞');  // UTF-8 ∞ misread as Latin-1
}

/** Split a Markdown table row into cells, handling escaped pipes */
function splitMdRow(line: string): string[] {
  // Remove leading/trailing pipe and whitespace
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return [];
  const inner = trimmed.slice(1, -1);
  // Split on pipes that are not inside backticks
  const cells: string[] = [];
  let current = '';
  let inBacktick = false;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '`') inBacktick = !inBacktick;
    if (ch === '|' && !inBacktick) {
      cells.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** Find a Markdown table by its header row content. Returns array of data rows. */
function findMdTable(
  markdown: string,
  headerMatcher: (headers: string[]) => boolean,
): MdTableRow[] {
  const lines = markdown.split('\n');
  const tables: MdTableRow[][] = [];
  let currentTable: MdTableRow[] = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|')) {
      const cells = splitMdRow(trimmed);
      // Separator row: | --- | --- |
      const isSeparator = cells.every((c) => /^[-:]+$/.test(c));
      if (isSeparator) {
        inTable = true;
        continue;
      }
      if (inTable) {
        currentTable.push({ cells });
      } else if (cells.length >= 2) {
        // Could be a header row — start a new potential table
        currentTable = [{ cells }];
      }
    } else {
      // End of table
      if (currentTable.length > 0) {
        tables.push(currentTable);
        currentTable = [];
      }
      inTable = false;
    }
  }
  if (currentTable.length > 0) {
    tables.push(currentTable);
  }

  // Find the table whose header matches
  for (const table of tables) {
    if (table.length < 2) continue;
    const headerCells = table[0].cells;
    if (headerMatcher(headerCells.map((h) => h.toLowerCase()))) {
      return table.slice(1); // Return data rows only
    }
  }

  return [];
}

/** Parse a dollar amount like "$15" or "$1,000" from a Markdown cell */
function parseDollarAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim();
  const match = cleaned.match(/\$?([\d.]+)/);
  if (!match) return null;
  const num = parseFloat(match[1]);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

/** Parse a Markdown price cell that may contain strikethrough: ~~$4.00~~ $2.00 */
function parseMdPrice(raw: string): { current: number | undefined; original: number | undefined } {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-' || trimmed === '—' || trimmed === 'n/a') {
    return { current: undefined, original: undefined };
  }
  const lower = trimmed.toLowerCase();
  if (lower === 'free' || lower === 'gratis') {
    return { current: 0, original: undefined };
  }

  // Check for strikethrough: ~~$old~~ $new
  const strikeMatch = trimmed.match(/~~(\$[\d,.]+)~~\s*(\$[\d,.]+)/);
  if (strikeMatch) {
    return {
      original: parseDollarAmount(strikeMatch[1]) ?? undefined,
      current: parseDollarAmount(strikeMatch[2]) ?? undefined,
    };
  }

  // Also handle HTML-style <del>$old</del> $new (in case Markdown is mixed)
  const delMatch = trimmed.replace(/<[^>]+>/g, (m) => {
    if (m.startsWith('<del')) return '';
    return m;
  }).match(/\$[\d,.]+/g);

  if (delMatch && delMatch.length >= 2) {
    return {
      original: parseDollarAmount(delMatch[0]) ?? undefined,
      current: parseDollarAmount(delMatch[1]) ?? undefined,
    };
  }

  const current = parseDollarAmount(trimmed);
  return { current: current ?? undefined, original: undefined };
}

/** Extract notes like "New", "Limited regions", "Limited time" from a model name cell */
function extractNotes(modelCell: string): { name: string; notes: string[] } {
  const notes: string[] = [];
  let name = modelCell.trim();

  // "New" tag — can appear mid-name or at end
  if (/\bNew\b/.test(name)) {
    notes.push('New');
    name = name.replace(/\bNew\b/g, '').trim();
  }

  // "Limited regions" tag
  if (/\bLimited regions\b/.test(name)) {
    notes.push('Limited regions');
    name = name.replace(/\bLimited regions\b/g, '').trim();
  }

  // "Limited time" tag
  if (/\bLimited time\b/.test(name)) {
    notes.push('Limited time');
    name = name.replace(/\bLimited time\b/g, '').trim();
  }

  // Clean up separator dots (both proper · and residual Â from corrupted Â·)
  name = name.replace(/[·Â]\s*/g, '').replace(/\s+/g, ' ').trim();

  return { name, notes };
}

/** Parse the Go limits Markdown table from /console/go.md */
export interface MarkdownLimitsResult {
  models: Model[];
  metrics: {
    tablesFound: number;
    pricingTablesFound: number;
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
    skippedReasons: string[];
    detectedModelRows: number;
  };
}

export function parseMarkdownLimits(source: Source, markdown: string): MarkdownLimitsResult {
  // Normalize encoding artifacts from UTF-8 → Latin-1 corruption
  const normalized = normalizeEncoding(markdown);
  // The limits table header: Model | Relative request allowances | Est. requests / 5 hr | Monthly limit
  const rows = findMdTable(normalized, (headers) => {
    return headers[0] === 'model' && headers.some((h) => h.includes('monthly limit'));
  });

  if (rows.length === 0) {
    throw new Error('No limits table found in Go Markdown page');
  }

  const models: Model[] = [];
  let parsedRows = 0;
  let skippedRows = 0;
  const skippedReasons: string[] = [];

  for (const row of rows) {
    // The table has 4 columns: Model, Relative request allowances, Est. requests / 5 hr, Monthly limit
    if (row.cells.length < 4) {
      // Skip separator-like or malformed rows
      const firstCell = row.cells[0]?.trim() || '';
      if (firstCell.length > 0) {
        skippedRows++;
        skippedReasons.push(`Row with ${row.cells.length} cells: incomplete`);
      }
      continue;
    }

    const rawModelName = row.cells[0].trim();
    if (!rawModelName) {
      // Decorative row (e.g., "100 1K 10K 100K" scale row)
      continue;
    }

    const { name: displayName, notes } = extractNotes(rawModelName);
    const estRequestsCell = row.cells[2].trim();
    const monthlyLimitCell = row.cells[3].trim();

    // Parse "Go: 98; Go Plus: 392" format
    const parseGoGoPlus = (cell: string) => {
      const goMatch = cell.match(/Go:\s*([^;]+)/i);
      const goPlusMatch = cell.match(/Go\s*Plus:\s*(.+)$/i);
      return {
        go: goMatch ? goMatch[1].trim() : null,
        goPlus: goPlusMatch ? goPlusMatch[1].trim() : null,
      };
    };

    const estRequests = parseGoGoPlus(estRequestsCell);
    const monthlyLimits = parseGoGoPlus(monthlyLimitCell);

    // Check if unlimited (∞ symbol or encoding artifact)
    const isUnlimited = (val: string | null): boolean => {
      if (!val) return false;
      return val.includes('∞') || val.includes('âˆž') || val.toLowerCase() === 'unlimited';
    };

    const goUnlimited = isUnlimited(monthlyLimits.go);
    const goPlusUnlimited = isUnlimited(monthlyLimits.goPlus);

    // Generate slug ID from display name
    const slugId = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const notesStr = notes.length > 0 ? notes.join(' · ') : undefined;

    // Create Go model
    const goLimitValue = goUnlimited
      ? null
      : parseDollarAmount(monthlyLimits.go ?? '') ?? null;

    // Parse est. requests for Go and Go Plus
    const parseEstRequests = (val: string | null): number | null => {
      if (!val) return null;
      // Remove commas and parse: "1,700" → 1700
      const cleaned = val.replace(/,/g, '').trim();
      const num = parseInt(cleaned, 10);
      return Number.isFinite(num) && num >= 0 ? num : null;
    };

    const estGo = parseEstRequests(estRequests.go);
    const estGoPlus = parseEstRequests(estRequests.goPlus);

    models.push({
      id: slugId,
      displayName,
      provider: 'OpenCode',
      plan: 'Go',
      monthlyLimitUsd: goLimitValue,
      limitStatus: goUnlimited ? 'unlimited' : goLimitValue !== null ? 'known' : 'unknown',
      unlimited: goUnlimited,
      estRequests5h: estGo,
      limitsSource: source.url,
      sourceUrl: source.url,
      checkedAt: new Date().toISOString(),
      sourceType: 'official_document',
      verification: 'auto_extracted',
      confidence: 'medium',
      notes: notesStr ? `Go plan · ${notesStr}` : 'Go plan',
      active: true,
    });

    // Create Go Plus model
    const goPlusLimitValue = goPlusUnlimited
      ? null
      : parseDollarAmount(monthlyLimits.goPlus ?? '') ?? null;

    models.push({
      id: `${slugId} (Go Plus)`,
      displayName,
      provider: 'OpenCode',
      plan: 'Go Plus',
      monthlyLimitUsd: goPlusLimitValue,
      limitStatus: goPlusUnlimited ? 'unlimited' : goPlusLimitValue !== null ? 'known' : 'unknown',
      unlimited: goPlusUnlimited,
      estRequests5h: estGoPlus,
      limitsSource: source.url,
      sourceUrl: source.url,
      checkedAt: new Date().toISOString(),
      sourceType: 'official_document',
      verification: 'auto_extracted',
      confidence: 'medium',
      notes: notesStr ? `Go Plus plan · ${notesStr}` : 'Go Plus plan',
      active: true,
    });

    parsedRows++;
  }

  return {
    models,
    metrics: {
      tablesFound: 1,
      pricingTablesFound: rows.length > 0 ? 1 : 0,
      totalRows: parsedRows + skippedRows,
      parsedRows,
      skippedRows,
      skippedReasons,
      detectedModelRows: parsedRows,
    },
  };
}

/** Parse the pricing Markdown table from /docs/console/models.md */
export interface MarkdownPricesResult {
  models: Model[];
  metrics: {
    tablesFound: number;
    pricingTablesFound: number;
    totalRows: number;
    parsedRows: number;
    skippedRows: number;
    skippedReasons: string[];
    detectedModelRows: number;
  };
}

export function parseMarkdownPrices(source: Source, markdown: string): MarkdownPricesResult {
  // Normalize encoding artifacts from UTF-8 → Latin-1 corruption
  const normalized = normalizeEncoding(markdown);
  // The pricing table header: Model | Input | Output | Cached Read | Cached Write
  const rows = findMdTable(normalized, (headers) => {
    return (
      headers[0] === 'model' &&
      headers[1] === 'input' &&
      headers[2] === 'output'
    );
  });

  if (rows.length === 0) {
    throw new Error('No pricing table found in models Markdown page');
  }

  const models: Model[] = [];
  let parsedRows = 0;
  let skippedRows = 0;
  const skippedReasons: string[] = [];

  for (const row of rows) {
    if (row.cells.length < 5) {
      const firstCell = row.cells[0]?.trim() || '';
      if (firstCell.length > 0) {
        skippedRows++;
        skippedReasons.push(`Row with ${row.cells.length} cells: incomplete`);
      }
      continue;
    }

    const rawModelName = row.cells[0].trim();
    if (!rawModelName) continue;

    const inputPrice = parseMdPrice(row.cells[1]);
    const outputPrice = parseMdPrice(row.cells[2]);
    const cachedReadPrice = parseMdPrice(row.cells[3]);
    const cachedWritePrice = parseMdPrice(row.cells[4]);

    // Generate slug ID
    const slugId = rawModelName
      .toLowerCase()
      .replace(/\([^)]*\)/g, '') // Remove parenthetical context info for base ID
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '-')
      .trim();

    const model: Model = {
      id: slugId || rawModelName.toLowerCase(),
      displayName: rawModelName,
      provider: 'OpenCode',
      monthlyLimitUsd: null,
      limitStatus: 'unknown',
      unlimited: false,
      priceInputUsd: inputPrice.current,
      priceOutputUsd: outputPrice.current,
      cachedReadPrice: cachedReadPrice.current,
      cachedWritePrice: cachedWritePrice.current,
      priceSource: source.url,
      sourceUrl: source.url,
      checkedAt: new Date().toISOString(),
      sourceType: 'official_document',
      verification: 'auto_extracted',
      confidence: 'medium',
      notes: rawModelName.includes('≤') || rawModelName.includes('>')
        ? `Context variant: ${rawModelName}`
        : undefined,
      active: true,
    };

    models.push(model);
    parsedRows++;
  }

  return {
    models,
    metrics: {
      tablesFound: 1,
      pricingTablesFound: rows.length > 0 ? 1 : 0,
      totalRows: parsedRows + skippedRows,
      parsedRows,
      skippedRows,
      skippedReasons,
      detectedModelRows: parsedRows,
    },
  };
}