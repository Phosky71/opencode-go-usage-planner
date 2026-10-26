// scripts/update-catalog.ts
// Dedicated Node.js script for catalog updates.
// This script is intended to be run manually or via GitHub Actions.
// It fetches data from official sources, validates it, and writes
// the updated catalog to src/data/models.json.
//
// Usage:
//   npx tsx scripts/update-catalog.ts                    # Normal update
//   npx tsx scripts/update-catalog.ts --accept-suspicious # Accept suspicious changes (requires review)

import { updateCatalog } from '../src/catalog/updater';
import { loadCatalog, saveCatalog } from '../src/catalog/io';
import { compareCatalogs } from '../src/catalog/integrity';
import { readFileSync } from 'fs';

const acceptSuspicious = process.argv.includes('--accept-suspicious');

async function main() {
  console.log('=== Catalog Update Started ===');
  console.log('Time:', new Date().toISOString());
  console.log('Accept suspicious:', acceptSuspicious);

  try {
    const results = await updateCatalog();

    for (const r of results) {
      console.log(`\nSource: ${r.sourceId}`);
      console.log(`  Fetched at: ${r.fetchedAt}`);
      console.log(`  Total parsed: ${r.totalParsed}`);
      console.log(`  Integrity: ${r.integrityCheck.valid ? 'PASS' : 'FAIL'}`);
      if (r.integrityCheck.errors && r.integrityCheck.errors.length > 0) {
        console.log(`  Integrity errors: ${r.integrityCheck.errors.join('; ')}`);
      }
      if (r.integrityCheck.warnings && r.integrityCheck.warnings.length > 0) {
        console.log(`  Integrity warnings: ${r.integrityCheck.warnings.join('; ')}`);
      }
      if (r.errors && r.errors.length > 0) {
        console.log(`  Errors: ${r.errors.join('; ')}`);
        continue;
      }

      const parsed = r.parsedModels || [];
      const existingCatalog = loadCatalog();

      // Compare with previous catalog
      if (existingCatalog.length > 0) {
        const comparison = compareCatalogs(existingCatalog, parsed);
        console.log(`  Comparison: ${comparison.previousCount} → ${comparison.newCount} models (${comparison.variationPercent.toFixed(1)}% variation)`);
        if (comparison.suspicious) {
          console.log(`  SUSPICIOUS: ${comparison.reason}`);
          if (!acceptSuspicious) {
            console.log('  Update REJECTED. Use --accept-suspicious to override.');
            continue;
          }
          console.log('  Accepted via --accept-suspicious flag.');
        }
      }

      // Merge
      const existingMap = new Map(existingCatalog.map(m => [m.id, m]));
      const newIds = new Set(parsed.map(m => m.id));
      let added = 0, updated = 0, removed = 0;

      for (const model of parsed) {
        const existing = existingMap.get(model.id);
        if (!existing) {
          existingCatalog.push(model);
          added++;
        } else {
          const changed = Object.entries(model).some(([k, v]) => {
            if (k === 'checkedAt') return false;
            return (existing as any)[k] !== v;
          });
          if (changed) {
            Object.assign(existing, model);
            updated++;
          }
        }
      }

      for (const existing of existingCatalog) {
        if (!newIds.has(existing.id)) {
          removed++;
        }
      }

      console.log(`  Added: ${added}, Updated: ${updated}, Removed: ${removed}`);

      // Persist
      saveCatalog(existingCatalog);
    }

    const catalogPath = (await import('../src/catalog/io')).getCatalogPath();
    const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'));
    console.log(`\n=== Catalog Updated Successfully ===`);
    console.log(`Total models: ${catalog.length}`);
    console.log(`Last updated: ${new Date().toISOString()}`);
    console.log(`File: ${catalogPath}`);
  } catch (error) {
    console.error('Fatal error during catalog update:', error);
    process.exit(1);
  }
}

main();