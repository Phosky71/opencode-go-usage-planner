// src/ui/components/ModelCatalog.tsx
import React from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { usePlan } from '../../context/PlanContext';
import { Model } from '../../domain/models';

export const ModelCatalog: React.FC = () => {
  const { catalog, loading, error } = useCatalog();
  const { plan } = usePlan();

  const planNote = plan === 'go' ? 'Go plan' : 'Go Plus plan';
  const filteredCatalog = catalog.filter(m => m.notes === planNote);

  if (loading) return <p className="text-white/60">Cargando catálogo…</p>;
  if (error) return <p className="text-red-400">Error al cargar el catálogo: {error}</p>;

  if (filteredCatalog.length === 0) {
    return <p className="text-white/60">No hay modelos para este plan.</p>;
  }

  return (
    <div className="glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Modelo</th>
              <th>Límite mensual (USD)</th>
              <th>Precio input ($/1M)</th>
              <th>Precio output ($/1M)</th>
              <th>Fuente</th>
              <th>Verificación</th>
            </tr>
          </thead>
          <tbody>
            {filteredCatalog.map((m: Model) => (
              <tr key={m.id}>
                <td data-label="Modelo">{m.displayName}</td>
                <td data-label="Límite mensual">{m.unlimited ? 'Ilimitado' : m.monthlyLimitUsd}</td>
                <td data-label="Precio input">{m.priceInputUsd ?? '-'}</td>
                <td data-label="Precio output">{m.priceOutputUsd ?? '-'}</td>
                <td data-label="Fuente">
                  <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300">
                    enlace
                  </a>
                </td>
                <td data-label="Verificación" className="capitalize">{m.sourceType.replace('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};