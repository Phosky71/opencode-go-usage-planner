// src/catalog/io.ts
// Node-only: file system I/O for catalog persistence.
// This module must NEVER be imported by client-side code.
import { Model } from '../domain/models';
import { CatalogSchema } from './schema';
import fs from 'fs';
import path from 'path';

const CATALOG_PATH = path.resolve('src/data/models.json');

export function loadCatalog(): Model[] {
  if (!fs.existsSync(CATALOG_PATH)) return [];
  const raw = fs.readFileSync(CATALOG_PATH, 'utf-8');
  return CatalogSchema.parse(JSON.parse(raw));
}

export function saveCatalog(models: Model[]): void {
  const data = JSON.stringify(models, null, 2);
  fs.writeFileSync(CATALOG_PATH, data);
}

export function getCatalogPath(): string {
  return CATALOG_PATH;
}