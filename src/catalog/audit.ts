import { Model } from '../domain/models';

export interface CatalogFieldChange {
  field: keyof Model;
  before: unknown;
  after: unknown;
}

export interface CatalogChange {
  id: string;
  fields: CatalogFieldChange[];
}

export interface CatalogAudit {
  added: Model[];
  removed: Model[];
  changed: CatalogChange[];
}

const IGNORED_FIELDS = new Set<keyof Model>(['checkedAt']);

/**
 * Compare a published catalog with a freshly parsed one without writing either.
 * This is informational: differences are expected as the official docs evolve.
 */
export function diffCatalogs(previous: Model[], current: Model[]): CatalogAudit {
  const previousById = new Map(previous.map((model) => [model.id, model]));
  const currentById = new Map(current.map((model) => [model.id, model]));

  const added = current.filter((model) => !previousById.has(model.id));
  const removed = previous.filter((model) => !currentById.has(model.id));

  const changed: CatalogChange[] = [];
  for (const model of current) {
    const before = previousById.get(model.id);
    if (!before) continue;

    const fields: CatalogFieldChange[] = [];
    for (const field of Object.keys(model) as (keyof Model)[]) {
      if (IGNORED_FIELDS.has(field)) continue;
      if (JSON.stringify(before[field]) !== JSON.stringify(model[field])) {
        fields.push({ field, before: before[field], after: model[field] });
      }
    }

    if (fields.length > 0) {
      changed.push({ id: model.id, fields });
    }
  }

  return { added, removed, changed };
}

export function describeModel(model: Model): string {
  const limit = model.limitStatus === 'unlimited'
    ? 'ilimitado'
    : model.limitStatus === 'unknown' || model.monthlyLimitUsd === null
      ? 'desconocido'
      : `$${model.monthlyLimitUsd}`;
  return `${model.id} (límite: ${limit})`;
}
