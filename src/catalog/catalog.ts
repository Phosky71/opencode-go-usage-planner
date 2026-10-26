// src/catalog/catalog.ts
// Client-safe: re-exports schema and types without Node.js imports.
// For file I/O, use src/catalog/io.ts (Node-only).
export { CatalogSchema } from './schema';
export type { Model } from '../domain/models';

// No-op stubs for browser compatibility.
// Actual I/O is handled by io.ts (Node-only) or scripts/update-catalog.ts.
export function loadCatalog(): any[] {
  return [];
}

export function saveCatalog(_models: any[]): void {
  // no-op in browser
}