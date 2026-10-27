// src/ui/components/ModelComparator.tsx
import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { usePlan } from '../../context/PlanContext';
import { Model } from '../../domain/models';
import { contributionPerDollar } from '../../domain/calculations';

type SortKey = 'name' | 'limit' | 'input' | 'output' | 'contribPerDollar';

export const ModelComparator: React.FC = () => {
  const { catalog } = useCatalog();
  const { plan } = usePlan();
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterText, setFilterText] = useState('');

  const planNote = plan === 'go' ? 'Go plan' : 'Go Plus plan';
  const planCatalog = catalog.filter(m => m.notes === planNote);

  const filtered = planCatalog.filter(m =>
    m.displayName.toLowerCase().includes(filterText.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'name':
        cmp = a.displayName.localeCompare(b.displayName);
        break;
      case 'limit':
        cmp = (a.monthlyLimitUsd ?? Infinity) - (b.monthlyLimitUsd ?? Infinity);
        break;
      case 'input':
        cmp = (a.priceInputUsd ?? Infinity) - (b.priceInputUsd ?? Infinity);
        break;
      case 'output':
        cmp = (a.priceOutputUsd ?? Infinity) - (b.priceOutputUsd ?? Infinity);
        break;
      case 'contribPerDollar': {
        const aCpd = contributionPerDollar(a) ?? Infinity;
        const bCpd = contributionPerDollar(b) ?? Infinity;
        cmp = aCpd - bCpd;
        break;
      }
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="glass p-6">
      <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
        Comparador de modelos
      </h2>
      <p className="text-sm text-white/60 mb-4">
        Compara los modelos del plan activo por límite, precio y contribución estimada por dólar.
        La aplicación solo dispone de métricas del catálogo; no incluye benchmarks de calidad o rendimiento.
      </p>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filtrar por nombre..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          className="operia-input w-full sm:w-64"
          aria-label="Filtrar modelos"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} className="cursor-pointer hover:text-cyan-400">
                Modelo {sortKey === 'name' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('limit')} className="cursor-pointer hover:text-cyan-400">
                Límite mensual {sortKey === 'limit' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('input')} className="cursor-pointer hover:text-cyan-400">
                Input $/1M {sortKey === 'input' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('output')} className="cursor-pointer hover:text-cyan-400">
                Output $/1M {sortKey === 'output' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th onClick={() => handleSort('contribPerDollar')} className="cursor-pointer hover:text-cyan-400">
                Contrib. por $ {sortKey === 'contribPerDollar' ? (sortAsc ? '↑' : '↓') : ''}
              </th>
              <th>Fuente</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m: Model) => {
              const cpd = contributionPerDollar(m);
              return (
                <tr key={m.id}>
                  <td data-label="Modelo">{m.displayName} {m.unlimited && <span className="text-amber-400 text-xs">(Ilimitado)</span>}</td>
                  <td data-label="Límite mensual">{m.unlimited ? 'Ilimitado' : `$${m.monthlyLimitUsd}`}</td>
                  <td data-label="Input $/1M">{m.priceInputUsd ?? '-'}</td>
                  <td data-label="Output $/1M">{m.priceOutputUsd ?? '-'}</td>
                  <td data-label="Contrib. por $">
                    {cpd !== null ? `${cpd.toFixed(4)} %/$` : 'N/A'}
                  </td>
                  <td data-label="Fuente">
                    <a href={m.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-400 underline hover:text-cyan-300 text-xs">
                      enlace
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-white/40 mt-3">
        «Contrib. por $» indica cuántos puntos porcentuales de cuota se consumen por cada dólar de gasto.
        Menor valor = menor impacto en la cuota por dólar gastado. Esto no implica que el modelo sea
        mejor para todas las tareas: la adecuación técnica depende del caso de uso.
      </p>
    </div>
  );
};