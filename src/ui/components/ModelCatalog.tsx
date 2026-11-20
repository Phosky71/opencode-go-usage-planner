// src/ui/components/ModelCatalog.tsx
import React from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { usePlan } from '../../context/PlanContext';
import {
  formatMonthlyLimit,
  getVerificationStatus,
  Model,
} from '../../domain/models';

const VERIFICATION_LABELS: Record<ReturnType<typeof getVerificationStatus>, string> = {
  auto_extracted: 'Extraído automáticamente',
  manually_verified: 'Verificado manualmente',
  unverified: 'Sin verificar',
};

const SOURCE_LABELS: Record<Model['sourceType'], string> = {
  official_document: 'Documentación oficial',
  official_verified: 'Verificado manualmente',
  support_confirmed: 'Confirmado por soporte',
  user_entered: 'Introducido por el usuario',
  estimated: 'Estimado',
  unknown: 'Desconocido',
};

export const ModelCatalog: React.FC = () => {
  const { catalog, loading, error } = useCatalog();
  const { plan } = usePlan();

  const planName = plan === 'go' ? 'Go' : 'Go Plus';
  const filteredCatalog = catalog.filter(m => m.plan === planName && !m.deprecated);

  if (loading) return <p className="text-white/60">Cargando catálogo…</p>;
  if (error) return <p className="text-red-400">Error al cargar el catálogo: {error}</p>;

  if (filteredCatalog.length === 0) {
    return <p className="text-white/60">No hay modelos para este plan.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-200/80">
        Los registros se extraen automáticamente de documentación pública. La columna
        «Verificación» distingue la extracción automática de una revisión manual; ningún
        registro debe interpretarse como verificado manualmente si no lo indica.
      </div>

      <div className="glass overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Límite mensual</th>
                <th>Precio input ($/1M)</th>
                <th>Precio output ($/1M)</th>
                <th>Procedencia</th>
                <th>Verificación</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((m: Model) => {
                const verification = getVerificationStatus(m);
                return (
                  <tr key={m.id}>
                    <td data-label="Modelo">{m.displayName}</td>
                    <td data-label="Límite mensual">{formatMonthlyLimit(m)}</td>
                    <td data-label="Precio input">{m.priceInputUsd ?? 'Sin datos'}</td>
                    <td data-label="Precio output">{m.priceOutputUsd ?? 'Sin datos'}</td>
                    <td data-label="Procedencia">
                      <div className="flex flex-col gap-1">
                        <a
                          href={m.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 underline hover:text-cyan-300"
                        >
                          {SOURCE_LABELS[m.sourceType]}
                        </a>
                        <span className="text-[10px] text-white/55">
                          {new Date(m.checkedAt).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </td>
                    <td data-label="Verificación">
                      <span className={verification === 'manually_verified' ? 'text-emerald-400' : 'text-amber-300'}>
                        {VERIFICATION_LABELS[verification]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
