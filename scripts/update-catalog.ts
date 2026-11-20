// scripts/update-catalog.ts
// Dedicated Node.js script for catalog updates.
// This script is intended to be run manually or via GitHub Actions.
// It fetches data from official Markdown sources, merges limits and prices,
// validates integrity, and atomically writes the updated catalog to src/data/models.json.
//
// Usage:
//   npx tsx scripts/update-catalog.ts                    # Normal update
//   npx tsx scripts/update-catalog.ts --dry-run          # Preview changes without writing

import { fetchUrl } from '../src/catalog/fetcher';
import { parseMarkdownLimits, parseMarkdownPrices } from '../src/catalog/parsers';
import { matchAllLimits } from '../src/catalog/matcher';
import { mergeLimitsAndPrices, buildCompleteCatalog } from '../src/catalog/merger';
import { validateIntegrity, compareCatalogs } from '../src/catalog/integrity';
import { loadCatalog, getCatalogPath } from '../src/catalog/io';
import { SOURCES } from '../src/catalog/source-registry';
import { readFileSync, writeFileSync, existsSync, renameSync } from 'fs';
import { Model } from '../src/domain/models';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('=== Catalog Update Started ===');
  console.log('Time:', new Date().toISOString());
  console.log('Dry run:', dryRun);

  try {
    // ── 1. Load existing catalog ──
    const existingCatalog = loadCatalog();
    console.log(`\nExisting catalog: ${existingCatalog.length} records`);

    // ── 2. Fetch both Markdown sources ──
    const limitsSource = SOURCES.find((s) => s.id === 'opencode-go-limits');
    const pricesSource = SOURCES.find((s) => s.id === 'opencode-go-prices');

    if (!limitsSource || !pricesSource) {
      console.error('Fatal: Markdown sources not found in registry');
      process.exit(1);
    }

    console.log('\n1. Fetching Markdown sources...');
    const limitsRes = await fetchUrl(limitsSource.url);
    console.log(`   Limits: HTTP ${limitsRes.status}, ${limitsRes.body.length} bytes`);

    const pricesRes = await fetchUrl(pricesSource.url);
    console.log(`   Prices: HTTP ${pricesRes.status}, ${pricesRes.body.length} bytes`);

    // ── 3. Parse both sources ──
    console.log('\n2. Parsing Markdown sources...');
    const limitsResult = parseMarkdownLimits(limitsSource, limitsRes.body);
    console.log(`   Limits: ${limitsResult.metrics.parsedRows} rows → ${limitsResult.models.length} models`);

    const pricesResult = parseMarkdownPrices(pricesSource, pricesRes.body);
    console.log(`   Prices: ${pricesResult.metrics.parsedRows} rows → ${pricesResult.models.length} models`);

    // ── 4. Match limits to prices ──
    console.log('\n3. Matching limits to prices...');
    const matchResults = matchAllLimits(limitsResult.models, pricesResult.models);
    const matchTypeCounts: Record<string, number> = {};
    for (const mr of matchResults) {
      matchTypeCounts[mr.matchType] = (matchTypeCounts[mr.matchType] || 0) + 1;
    }
    for (const [type, count] of Object.entries(matchTypeCounts).sort()) {
      console.log(`   ${type}: ${count}`);
    }

    // ── 5. Merge ──
    console.log('\n4. Merging limits and prices...');
    const { models: mergedModels, metrics: mergeMetrics } = mergeLimitsAndPrices(limitsResult, pricesResult);
    console.log(`   Total merged records: ${mergeMetrics.totalMergedRecords}`);
    console.log(`   Exact matches: ${mergeMetrics.exactMatches}`);
    console.log(`   Normalized matches: ${mergeMetrics.normalizedMatches}`);
    console.log(`   Context variants: ${mergeMetrics.contextVariantMatches}`);
    console.log(`   No price: ${mergeMetrics.noPriceMatches}`);
    console.log(`   Dubious (not associated): ${mergeMetrics.dubiousMatches}`);
    console.log(`   Ambiguous: ${mergeMetrics.ambiguousMatches}`);
    if (mergeMetrics.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${mergeMetrics.warnings.length}`);
      for (const w of mergeMetrics.warnings) {
        console.log(`     - ${w}`);
      }
    }

    // ── 6. Validate merged catalog integrity ──
    console.log('\n5. Validating merged catalog integrity...');
    const integrity = validateIntegrity(mergedModels);
    console.log(`   Valid: ${integrity.valid ? '✓ PASS' : '❌ FAIL'}`);
    if (integrity.errors.length > 0) {
      console.log(`   Errors: ${integrity.errors.length}`);
      for (const e of integrity.errors) {
        console.log(`     - ${e}`);
      }
    }
    if (!integrity.valid) {
      console.error('Fatal: Merged catalog failed integrity check');
      process.exit(1);
    }

    // ── 7. Check for duplicate IDs ──
    console.log('\n6. Checking for duplicate IDs...');
    const idSet = new Set(mergedModels.map((m) => m.id));
    if (idSet.size !== mergedModels.length) {
      console.error(`Fatal: Duplicate IDs found! ${mergedModels.length} records but only ${idSet.size} unique IDs`);
      const duplicates = mergedModels.filter(
        (m, i) => mergedModels.findIndex((x) => x.id === m.id) !== i,
      );
      for (const d of duplicates) {
        console.error(`  Duplicate: ${d.id} (${d.displayName})`);
      }
      process.exit(1);
    }
    console.log(`   ✓ No duplicate IDs: ${idSet.size} unique`);

    // ── 8. Build complete catalog (merged + deprecated old models) ──
    console.log('\n7. Building complete catalog...');
    const completeCatalog = buildCompleteCatalog(existingCatalog, mergedModels);
    const deprecatedCount = completeCatalog.filter((m: Model) => m.deprecated).length;
    const activeCount = completeCatalog.filter((m: Model) => !m.deprecated).length;
    console.log(`   Active models: ${activeCount}`);
    console.log(`   Deprecated models: ${deprecatedCount}`);
    console.log(`   Total catalog: ${completeCatalog.length}`);

    // ── 9. Compare old vs new ──
    console.log('\n8. Comparing old vs new catalog...');
    const comparison = compareCatalogs(existingCatalog, mergedModels);
    console.log(`   Previous: ${comparison.previousCount} → New active: ${comparison.newCount} (${comparison.variationPercent.toFixed(1)}% variation)`);
    if (comparison.added.length > 0) {
      console.log(`   Added: ${comparison.added.length}`);
    }
    if (comparison.removed.length > 0) {
      console.log(`   Removed: ${comparison.removed.length}`);
    }

    // ── 10. Validate complete catalog ──
    console.log('\n9. Validating complete catalog integrity...');
    const completeIntegrity = validateIntegrity(completeCatalog);
    console.log(`   Valid: ${completeIntegrity.valid ? '✓ PASS' : '❌ FAIL'}`);
    if (completeIntegrity.errors.length > 0) {
      console.log(`   Errors: ${completeIntegrity.errors.length}`);
      for (const e of completeIntegrity.errors) {
        console.log(`     - ${e}`);
      }
    }
    if (!completeIntegrity.valid) {
      console.error('Fatal: Complete catalog failed integrity check');
      process.exit(1);
    }

    // ── 11. Check plan distribution ──
    console.log('\n10. Checking plan distribution...');
    const goModels = completeCatalog.filter((m: Model) => m.plan === 'Go' || (m.plan === undefined && m.notes && m.notes.startsWith('Go plan')));
    const goPlusModels = completeCatalog.filter((m: Model) => m.plan === 'Go Plus' || (m.plan === undefined && m.notes && m.notes.startsWith('Go Plus plan')));
    console.log(`   Go plan: ${goModels.length} models`);
    console.log(`   Go Plus plan: ${goPlusModels.length} models`);

    // ── 12. Verify dubious correspondences are NOT associated ──
    console.log('\n11. Verifying dubious correspondences...');
    const dubiousNames = ['DeepSeek V4.1 Flash 1017', 'Muse Spark 1.2 Contributor', 'Muse Spark 1.3 Contributor', 'Iceman Contributor Free'];
    for (const dn of dubiousNames) {
      const dubiousModels = mergedModels.filter((m) => m.displayName.includes(dn.split(' ').slice(0, 2).join(' ')));
      const hasPrice = dubiousModels.some((m) => m.priceInputUsd !== undefined && m.priceInputUsd !== null);
      console.log(`   ${dn}: price associated = ${hasPrice ? '❌ YES (ERROR)' : '✓ NO (correct)'}`);
      if (hasPrice) {
        console.error(`Fatal: Dubious correspondence "${dn}" was incorrectly associated with a price`);
        process.exit(1);
      }
    }

    // ── 13. Verify unknown prices are NOT zero ──
    console.log('\n12. Verifying unknown prices ≠ zero...');
    const noPriceModels = mergedModels.filter((m) => m.priceInputUsd === undefined);
    const zeroPriceModels = mergedModels.filter((m) => m.priceInputUsd === 0);
    console.log(`   Models without price (undefined): ${noPriceModels.length}`);
    console.log(`   Models with confirmed free price (0): ${zeroPriceModels.length}`);
    const unknownAsZero = noPriceModels.some((m) => m.priceInputUsd === 0);
    console.log(`   Unknown prices converted to zero: ${unknownAsZero ? '❌ YES (ERROR)' : '✓ NO (correct)'}`);

    // ── 14. Atomic write ──
    if (dryRun) {
      console.log('\n=== DRY RUN — No changes written ===');
      console.log(`Would write ${completeCatalog.length} records to models.json`);
    } else {
      console.log('\n13. Writing catalog atomically...');
      const catalogPath = getCatalogPath();

      // Backup current catalog
      const backupPath = catalogPath + '.backup';
      if (existsSync(catalogPath)) {
        writeFileSync(backupPath, readFileSync(catalogPath, 'utf-8'), 'utf-8');
        console.log(`   Backup created: ${backupPath}`);
      }

      // Write to temp file first, then rename (atomic on same filesystem)
      const tempPath = catalogPath + '.tmp';
      writeFileSync(tempPath, JSON.stringify(completeCatalog, null, 2), 'utf-8');
      console.log(`   Written to temp: ${tempPath}`);

      // Verify temp file is valid JSON
      const verifyContent = readFileSync(tempPath, 'utf-8');
      JSON.parse(verifyContent); // Will throw if invalid
      console.log(`   Temp file verified as valid JSON`);

      // Atomic rename
      renameSync(tempPath, catalogPath);
      console.log(`   Renamed to: ${catalogPath}`);

      // Final verification
      const finalCatalog: Model[] = JSON.parse(readFileSync(catalogPath, 'utf-8'));
      console.log(`   Final verification: ${finalCatalog.length} records loaded successfully`);
    }

    // ── 15. Summary ──
    console.log('\n=== Catalog Update Summary ===');
    console.log(`Previous catalog: ${existingCatalog.length} records`);
    console.log(`New active models: ${activeCount}`);
    console.log(`Deprecated models: ${deprecatedCount}`);
    console.log(`Total catalog: ${completeCatalog.length}`);
    console.log(`Merge metrics:`);
    console.log(`  - Exact matches: ${mergeMetrics.exactMatches}`);
    console.log(`  - Normalized matches: ${mergeMetrics.normalizedMatches}`);
    console.log(`  - Context variants: ${mergeMetrics.contextVariantMatches}`);
    console.log(`  - No price: ${mergeMetrics.noPriceMatches}`);
    console.log(`  - Dubious (not associated): ${mergeMetrics.dubiousMatches}`);
    console.log(`  - Ambiguous: ${mergeMetrics.ambiguousMatches}`);
    console.log(`Integrity: ${integrity.valid ? '✓ PASSED' : '❌ FAILED'}`);
    console.log(`Last updated: ${new Date().toISOString()}`);
    console.log(`File: ${getCatalogPath()}`);
    console.log('\n=== Catalog Updated Successfully ===');
  } catch (error) {
    console.error('Fatal error during catalog update:', error);
    process.exit(1);
  }
}

main();