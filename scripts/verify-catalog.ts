// scripts/verify-catalog.ts
// Read-only audit: fetch the official sources, parse them, validate the result
// and compare it with the committed catalog. It never writes models.json.
//
// Usage:
//   npx tsx scripts/verify-catalog.ts
//   npx tsx scripts/verify-catalog.ts --json

import { updateCatalog } from '../src/catalog/updater';
import { diffCatalogs, describeModel } from '../src/catalog/audit';
import { loadCatalog } from '../src/catalog/io';

async function main() {
  const json = process.argv.includes('--json');
  const previous = loadCatalog();
  const results = await updateCatalog();
  let failed = false;

  const report = results.map((result) => {
    if (!result.parsedModels) {
      failed = true;
    }
    if (result.errors && result.errors.length > 0) {
      failed = true;
    }
    if (!result.integrityCheck.valid) {
      failed = true;
    }

    const audit = result.parsedModels
      ? diffCatalogs(previous, result.parsedModels)
      : { added: [], removed: [], changed: [] };

    return {
      sourceId: result.sourceId,
      fetchedAt: result.fetchedAt,
      parsed: result.parsedModels?.length ?? 0,
      integrity: result.integrityCheck,
      errors: result.errors ?? [],
      added: audit.added.map(describeModel),
      removed: audit.removed.map(describeModel),
      changed: audit.changed.map((change) => ({
        id: change.id,
        fields: change.fields.map((field) => ({
          field: field.field,
          before: field.before,
          after: field.after,
        })),
      })),
    };
  });

  if (json) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 2));
  } else {
    console.log('=== Catalog verification (read-only) ===');
    console.log('Committed catalog:', previous.length, 'models');
    for (const item of report) {
      console.log(`\nSource: ${item.sourceId}`);
      console.log(`  Fetched: ${item.fetchedAt}`);
      console.log(`  Parsed: ${item.parsed}`);
      console.log(`  Integrity: ${item.integrity.valid ? 'PASS' : 'FAIL'}`);
      if (item.integrity.errors.length > 0) {
        console.log(`  Integrity errors: ${item.integrity.errors.join('; ')}`);
      }
      if (item.errors.length > 0) {
        console.log(`  Fetch/parse errors: ${item.errors.join('; ')}`);
      }
      console.log(`  Added: ${item.added.length}`);
      item.added.forEach((entry) => console.log(`    + ${entry}`));
      console.log(`  Removed: ${item.removed.length}`);
      item.removed.forEach((entry) => console.log(`    - ${entry}`));
      console.log(`  Changed: ${item.changed.length}`);
      item.changed.forEach((change) => {
        console.log(`    ~ ${change.id}: ${change.fields.map((field) => field.field).join(', ')}`);
      });
    }
    console.log('\nRead-only audit: models.json was not modified.');
  }

  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error('Catalog verification failed:', error);
  process.exit(1);
});
