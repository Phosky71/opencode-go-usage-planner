// src/catalog/updater.ts
import { Source, SOURCES } from './source-registry';
import { fetchUrl } from './fetcher';
import { parseGoDocs, parseGoDocsDetailed, parseModelsApi, parseMarkdownLimits, parseMarkdownPrices } from './parsers';
import { Model } from '../domain/models';
import { CatalogSchema } from './schema';
import { validateIntegrity } from './integrity';

export interface UpdateResult {
  sourceId: string;
  fetchedAt: string;
  totalParsed: number;
  skippedRows: number;
  skippedReasons: string[];
  integrityCheck: {
    valid: boolean;
    errors: string[];
    warnings: string[];
    metrics: any;
  };
  parsedModels: Model[];
  errors?: string[];
}

export interface UpdateOptions {
  /** Explicitly accept suspicious changes (requires review) */
  acceptSuspicious?: boolean;
}

/** Fetch, parse, and validate the catalog from official sources */
export async function updateCatalog(_options: UpdateOptions = {}): Promise<UpdateResult[]> {
  const results: UpdateResult[] = [];

  for (const source of SOURCES.filter(s => !s.disabled)) {
    const res: UpdateResult = {
      sourceId: source.id,
      fetchedAt: new Date().toISOString(),
      totalParsed: 0,
      skippedRows: 0,
      skippedReasons: [],
      integrityCheck: { valid: false, errors: [], warnings: [], metrics: {} },
      parsedModels: [],
    };
    
    try {
      // 1. Download
      const fetched = await fetchUrl(source.url);
      
      // 2. Parse with detailed metrics
      let parsed: Model[] = [];
      let skippedRows = 0;
      let skippedReasons: string[] = [];
      let metrics: any = {};
      
      if (source.parserName === 'parseGoDocs') {
        const detailed = parseGoDocsDetailed(source, fetched.body);
        parsed = detailed.models;
        skippedRows = detailed.metrics.skippedRows;
        skippedReasons = detailed.metrics.skippedReasons;
        metrics = detailed.metrics;
        
        if (skippedRows > 0) {
          res.integrityCheck.warnings = [
            ...res.integrityCheck.warnings,
            `${skippedRows} rows were skipped during parsing: ${skippedReasons.join('; ')}`
          ];
        }
      } else if (source.parserName === 'parseMarkdownLimits') {
        const detailed = parseMarkdownLimits(source, fetched.body);
        parsed = detailed.models;
        skippedRows = detailed.metrics.skippedRows;
        skippedReasons = detailed.metrics.skippedReasons;
        metrics = detailed.metrics;
        
        if (skippedRows > 0) {
          res.integrityCheck.warnings = [
            ...res.integrityCheck.warnings,
            `${skippedRows} rows were skipped during parsing: ${skippedReasons.join('; ')}`
          ];
        }
      } else if (source.parserName === 'parseMarkdownPrices') {
        const detailed = parseMarkdownPrices(source, fetched.body);
        parsed = detailed.models;
        skippedRows = detailed.metrics.skippedRows;
        skippedReasons = detailed.metrics.skippedReasons;
        metrics = detailed.metrics;
        
        if (skippedRows > 0) {
          res.integrityCheck.warnings = [
            ...res.integrityCheck.warnings,
            `${skippedRows} rows were skipped during parsing: ${skippedReasons.join('; ')}`
          ];
        }
      } else if (source.parserName === 'parseModelsApi') {
        parsed = parseModelsApi(source, fetched.body);
      } else {
        throw new Error(`No parser for source ${source.id}`);
      }

      res.totalParsed = parsed.length;
      res.skippedRows = skippedRows;
      res.skippedReasons = skippedReasons;

      // 3. Validate each model with Zod
      for (const model of parsed) {
        try {
          CatalogSchema.element.parse(model);
        } catch (e) {
          throw new Error(`Model validation failed for ${model.id}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      // 4. Validate integrity
      const integrity = validateIntegrity(parsed, {
        totalRows: parsed.length + skippedRows,
        parsedRows: parsed.length,
        skippedRows,
        detectedModelRows: parsed.length + skippedRows,
      });
      res.integrityCheck = integrity;
      if (!integrity.valid) {
        throw new Error(`Integrity check failed: ${integrity.errors.join('; ')}`);
      }

      res.parsedModels = parsed;
      
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      res.errors = [err];
    }
    
    results.push(res);
  }
  
  return results;
}