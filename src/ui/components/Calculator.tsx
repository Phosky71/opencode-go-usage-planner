// src/ui/components/Calculator.tsx
import React, { useRef, useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { usePlan } from '../../context/PlanContext';
import { Model, formatMonthlyLimit, getLimitStatus } from '../../domain/models';
import { numericTextToNumber } from '../../domain/scenario';
import {
  computeContribution,
  totalContribution,
  computeDifference,
  hypotheticalContribution,
} from '../../domain/calculations';
import { useScenarioPersistence } from '../hooks/useScenarioPersistence';

export const Calculator: React.FC = () => {
  const { catalog } = useCatalog();
  const { plan } = usePlan();
  const {
    entries,
    observed,
    setObserved,
    hypotheses,
    budget,
    setBudget,
    budgetAllocations,
    hasData,
    storageNotice,
    addEntry: persistEntry,
    removeEntry,
    clearEntries: clearStoredEntries,
    addHypothesis: persistHypothesis,
    removeHypothesis,
    clearHypotheses,
    addBudgetModel,
    updateAllocation,
    removeBudgetModel,
    exportScenario,
    importScenario,
    clearSavedScenario,
  } = useScenarioPersistence(catalog);

  const [modelId, setModelId] = useState('');
  const [consumptionUsd, setConsumptionUsd] = useState('');
  const [result, setResult] = useState<{
    total: number;
    diff: number;
    hasUnlimited: boolean;
    hasUnknown: boolean;
    entryCount: number;
    calculatedCount: number;
    remaining: number;
  } | null>(null);

  // Hypotheses (scenario simulation)
  const [hypModelId, setHypModelId] = useState('');
  const [hypAmount, setHypAmount] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const planNote = plan === 'go' ? 'Go plan' : 'Go Plus plan';
  const planCatalog = catalog.filter(m => m.notes === planNote);

  const addEntry = () => {
    if (!modelId || !consumptionUsd) return;
    const value = Number(consumptionUsd);
    if (!Number.isFinite(value) || value < 0) return;
    persistEntry(modelId, value);
    setModelId('');
    setConsumptionUsd('');
  };

  const clearEntries = () => {
    clearStoredEntries();
    setResult(null);
  };

  const calculate = () => {
    const contributions = entries
      .map(e => {
        const model = catalog.find(m => m.id === e.modelId);
        if (!model) return null;
        const contrib = computeContribution(model, e);
        if (contrib === null) return null;
        if (contrib.contributionPercent === null) {
          return null;
        }
        return contrib;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);
    const total = totalContribution(contributions);
    const observedValue = numericTextToNumber(observed);
    const diff = observedValue !== null ? computeDifference(total, observedValue) : 0;
    const hasUnlimited = entries.some(e => {
      const model = catalog.find(m => m.id === e.modelId);
      return model ? getLimitStatus(model) === 'unlimited' : false;
    });
    const hasUnknown = entries.some(e => {
      const model = catalog.find(m => m.id === e.modelId);
      return model ? getLimitStatus(model) === 'unknown' : true;
    });
    const remaining = 100 - total;
    setResult({ total, diff, hasUnlimited, hasUnknown, entryCount: entries.length, calculatedCount: contributions.length, remaining });
  };

  // Hypotheses
  const addHypothesis = () => {
    if (!hypModelId || !hypAmount) return;
    const value = Number(hypAmount);
    if (!Number.isFinite(value) || value < 0) return;
    persistHypothesis(hypModelId, value);
    setHypModelId('');
    setHypAmount('');
  };

  // Combined total: registered + hypotheses
  const combinedContributions = [...entries, ...hypotheses.map(h => ({ modelId: h.modelId, consumptionUsd: h.amountUsd }))].map(e => {
    const model = catalog.find(m => m.id === e.modelId);
    if (!model) return null;
    const contrib = computeContribution(model, e);
    if (contrib === null) return null;
    if (contrib.contributionPercent === null) return null;
    return contrib;
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  const combinedTotal = totalContribution(combinedContributions);
  const combinedRemaining = 100 - combinedTotal;

  // Budget planner
  const budgetNum = Math.max(0, numericTextToNumber(budget) ?? 0);
  const budgetModels = Object.keys(budgetAllocations);
  const budgetContributions = budgetModels.map(modelId => {
    const model = catalog.find(m => m.id === modelId);
    if (!model) return null;
    const amount = budgetAllocations[modelId] || 0;
    const contrib = hypotheticalContribution(model, amount);
    return { modelId, model, amount, contribution: contrib };
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  const totalBudgetContribution = budgetContributions.reduce((sum, c) => {
    if (c.contribution === null) return sum;
    return sum + c.contribution;
  }, 0);
  const assignedBudget = budgetModels.reduce((sum, modelId) => sum + (budgetAllocations[modelId] || 0), 0);
  const unassignedBudget = budgetNum - assignedBudget;
  const budgetExcess = Math.max(0, assignedBudget - budgetNum);

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    if (hasData && !window.confirm('Esto sustituirá el escenario actual. ¿Continuar?')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const outcome = await importScenario(file);
    setImportError(outcome.ok ? null : outcome.error ?? 'No se pudo importar el archivo.');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClearSaved = () => {
    if (!window.confirm('Se eliminarán el escenario y los datos guardados en este navegador. ¿Continuar?')) return;
    clearSavedScenario();
    setResult(null);
    setImportError(null);
  };

  return (
    <div className="glass p-6">
      <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
        Calculadora de consumo
      </h2>
      <p className="text-sm text-white/60 mb-4">
        Introduce el consumo acumulado por modelo para estimar el porcentaje de cuota consumida.
        Fórmula: <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-400 text-xs">P_i = 100 × consumo / límite_mensual</code>
      </p>

      <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Escenario local</p>
            <p className="mt-1 text-xs text-white/60">
              Se guarda automáticamente en este navegador. No se envía a ningún servidor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportScenario} className="operia-btn-secondary text-xs">
              Exportar JSON
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="operia-btn-secondary text-xs">
              Importar JSON
            </button>
            <button type="button" onClick={handleClearSaved} className="operia-btn-secondary text-xs">
              Borrar datos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              aria-label="Importar escenario JSON"
              onChange={(event) => void handleImport(event.target.files?.[0])}
            />
          </div>
        </div>
        {storageNotice && (
          <p className="mt-2 text-xs text-amber-300/80" role="status">{storageNotice}</p>
        )}
        {importError && (
          <p className="mt-2 text-xs text-red-400" role="alert">{importError}</p>
        )}
      </div>

      {/* Add entry */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select
          value={modelId}
          onChange={e => setModelId(e.target.value)}
          className="operia-select flex-1"
          aria-label="Seleccionar modelo"
        >
          <option value="">Selecciona modelo</option>
          {planCatalog.map((m: Model) => (
            <option key={m.id} value={m.id} disabled={getLimitStatus(m) === 'unknown'}>
              {m.displayName} ({formatMonthlyLimit(m)})
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Consumo USD"
          value={consumptionUsd}
          onChange={e => setConsumptionUsd(e.target.value)}
          className="operia-input w-full sm:w-32"
          aria-label="Consumo en USD"
          min="0"
          step="0.01"
        />
        <button onClick={addEntry} className="operia-btn-primary whitespace-nowrap">
          Añadir
        </button>
      </div>

      {/* Entries list */}
      {entries.length > 0 && (
        <div className="mb-4">
          <h3 className="font-semibold text-white/80 mb-2 text-sm">Consumos registrados</h3>
          <ul className="space-y-2">
            {entries.map((e, i) => {
              const model = catalog.find(m => m.id === e.modelId);
              const contrib = model ? computeContribution(model, e) : null;
              return (
                <li key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/5">
                  <span className="text-sm text-white/90">
                    {model?.displayName}: <strong className="text-cyan-400">${e.consumptionUsd}</strong>
                    {contrib?.contributionPercent !== null && contrib?.contributionPercent !== undefined && (
                      <span className="text-white/60 ml-2">→ {contrib.contributionPercent.toFixed(2)}%</span>
                    )}
                    {model && getLimitStatus(model) === 'unlimited' && <span className="text-amber-400 ml-2">(Ilimitado)</span>}
                    {model && getLimitStatus(model) === 'unknown' && <span className="text-amber-400 ml-2">(Límite desconocido)</span>}
                  </span>
                  <button
                    onClick={() => removeEntry(i)}
                    className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    aria-label={`Eliminar ${model?.displayName}`}
                  >
                    Eliminar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Observed percentage */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-white/70 mb-1">
          Porcentaje observado (desde consola de OpenCode):
        </label>
        <input
          type="number"
          value={observed}
          onChange={e => setObserved(e.target.value)}
          className="operia-input w-24"
          aria-label="Porcentaje observado"
          min="0"
          max="100"
          step="0.1"
        />
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={calculate} className="operia-btn-primary">
          Calcular
        </button>
        {entries.length > 0 && (
          <button onClick={clearEntries} className="operia-btn-secondary">
            Limpiar consumos
          </button>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="p-4 border border-white/10 rounded-xl bg-white/5 space-y-2">
          <p className="text-lg font-bold text-white">
            Consumo estimado de cuota compartida: <span className="text-cyan-400">{result.total.toFixed(2)} %</span>
          </p>
          <p className="text-sm text-white/70">
            Margen estimado restante: <span className="text-emerald-400 font-semibold">{result.remaining.toFixed(2)} %</span>
          </p>
          {result.hasUnlimited && (
            <p className="text-amber-400 text-sm">
              ⚠️ Total parcial: {result.calculatedCount} de {result.entryCount} modelos calculados.
              Los modelos ilimitados no tienen contribución porcentual definida.
            </p>
          )}
          {result.hasUnknown && (
            <p className="text-amber-400 text-sm">
              ⚠️ Hay modelos con límite desconocido: no se incluyen en el cálculo. No los interpretes como gratuitos.
            </p>
          )}
          {observed && (
            <>
              <p className="text-sm text-white/60">
                Porcentaje observado en consola: {(numericTextToNumber(observed) ?? 0).toFixed(2)} %
              </p>
              <p className="text-sm text-white/60">
                Diferencia (puntos %): {result.diff.toFixed(2)}
              </p>
            </>
          )}
          <p className="text-xs text-white/60 mt-2">
            Fórmula: U = Σ(Cᵢ / Lᵢ) × 100. El consumo real puede diferir por redondeos,
            actividad no registrada o limitaciones del modelo de estimación.
          </p>
        </div>
      )}

      {/* Hypothesis section */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
          ¿Qué pasa si sigo utilizando estos modelos?
        </h3>
        <p className="text-sm text-white/60 mb-3">
          Añade gastos hipotéticos para simular escenarios sin modificar los consumos registrados.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <select
            value={hypModelId}
            onChange={e => setHypModelId(e.target.value)}
            className="operia-select flex-1"
            aria-label="Modelo hipotético"
          >
            <option value="">Selecciona modelo</option>
            {planCatalog.map((m: Model) => (
              <option key={m.id} value={m.id} disabled={getLimitStatus(m) === 'unknown'}>
                {m.displayName} ({formatMonthlyLimit(m)})
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Gasto hipotético USD"
            value={hypAmount}
            onChange={e => setHypAmount(e.target.value)}
            className="operia-input w-full sm:w-40"
            aria-label="Gasto hipotético en USD"
            min="0"
            step="0.01"
          />
          <button onClick={addHypothesis} className="operia-btn-primary whitespace-nowrap">
            Añadir hipótesis
          </button>
        </div>

        {hypotheses.length > 0 && (
          <div className="mb-4">
            <ul className="space-y-2">
              {hypotheses.map((h, i) => {
                const model = catalog.find(m => m.id === h.modelId);
                const contrib = model ? hypotheticalContribution(model, h.amountUsd) : null;
                return (
                  <li key={i} className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/5">
                    <span className="text-sm text-white/90">
                      {model?.displayName}: <strong className="text-cyan-400">${h.amountUsd}</strong>
                      {contrib !== null && <span className="text-white/60 ml-2">→ +{contrib.toFixed(2)}%</span>}
                      {model && getLimitStatus(model) === 'unlimited' && <span className="text-amber-400 ml-2">(Ilimitado)</span>}
                      {model && getLimitStatus(model) === 'unknown' && <span className="text-amber-400 ml-2">(Límite desconocido)</span>}
                    </span>
                    <button
                      onClick={() => removeHypothesis(i)}
                      className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                      aria-label={`Eliminar hipótesis ${model?.displayName}`}
                    >
                      Eliminar
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 p-3 border border-white/10 rounded-xl bg-white/5">
              <p className="text-sm text-white/80">
                Consumo combinado estimado: <span className="text-cyan-400 font-bold">{combinedTotal.toFixed(2)} %</span>
              </p>
              <p className="text-sm text-white/70">
                Margen estimado restante: <span className="text-emerald-400 font-semibold">{combinedRemaining.toFixed(2)} %</span>
              </p>
              {combinedTotal > 100 && (
                <p className="text-red-400 text-sm mt-1">
                  ⚠️ El escenario supera el 100 % de cuota estimada (exceso: {(combinedTotal - 100).toFixed(2)} pp).
                </p>
              )}
            </div>
            <button onClick={clearHypotheses} className="operia-btn-secondary text-xs mt-2">
              Eliminar hipótesis
            </button>
          </div>
        )}
      </div>

      {/* Budget planner */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <h3 className="text-lg font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
          Planificador de presupuesto adicional
        </h3>
        <p className="text-sm text-white/60 mb-3">
          Indica un presupuesto en USD y distribúyelo entre modelos para ver el impacto estimado.
        </p>
        <div className="mb-3">
          <label className="block text-sm font-medium text-white/70 mb-1">
            Presupuesto total (USD):
          </label>
          <input
            type="number"
            value={budget}
            onChange={e => setBudget(e.target.value)}
            className="operia-input w-32"
            aria-label="Presupuesto total en USD"
            min="0"
            step="1"
          />
        </div>

        {(budgetNum > 0 || assignedBudget > 0) && (
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-white/5 bg-white/5 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-white/60">Presupuesto</p>
              <p className="text-sm font-semibold text-white">${budgetNum.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-white/60">Asignado</p>
              <p className="text-sm font-semibold text-cyan-300">${assignedBudget.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/5 p-2.5">
              <p className="text-[10px] uppercase tracking-wide text-white/60">No asignado</p>
              <p className="text-sm font-semibold text-white/80">${unassignedBudget.toFixed(2)}</p>
            </div>
            <div className={`rounded-lg border p-2.5 ${budgetExcess > 0 ? 'border-red-500/30 bg-red-500/10' : 'border-white/5 bg-white/5'}`}>
              <p className="text-[10px] uppercase tracking-wide text-white/60">Exceso</p>
              <p className={`text-sm font-semibold ${budgetExcess > 0 ? 'text-red-300' : 'text-white/80'}`}>
                ${budgetExcess.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {budgetExcess > 0 && (
          <p className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300" role="alert">
            Has asignado ${budgetExcess.toFixed(2)} más que el presupuesto total. No se recortan
            ni redistribuyen asignaciones automáticamente; ajusta los importes o el presupuesto.
          </p>
        )}

        <div className="mb-3">
          <label className="block text-sm font-medium text-white/70 mb-1">
            Añadir modelo al presupuesto:
          </label>
          <select
            value=""
            onChange={e => { if (e.target.value) addBudgetModel(e.target.value); }}
            className="operia-select w-full"
            aria-label="Añadir modelo al presupuesto"
          >
            <option value="">Selecciona modelo</option>
            {planCatalog.map((m: Model) => (
              <option
                key={m.id}
                value={m.id}
                disabled={budgetAllocations[m.id] !== undefined || getLimitStatus(m) === 'unknown'}
              >
                {m.displayName} ({formatMonthlyLimit(m)})
              </option>
            ))}
          </select>
        </div>
        {Object.keys(budgetAllocations).length > 0 && (
          <div className="space-y-2 mb-3">
            {Object.entries(budgetAllocations).map(([modelId, amount]) => {
              const model = catalog.find(m => m.id === modelId);
              const contrib = model ? hypotheticalContribution(model, amount) : null;
              return (
                <div key={modelId} className="flex items-center gap-2 bg-white/5 rounded-lg p-2 border border-white/5">
                  <span className="text-sm text-white/80 flex-1">{model?.displayName}</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => {
                      const value = Number(e.target.value);
                      updateAllocation(modelId, Number.isFinite(value) && value >= 0 ? value : 0);
                    }}
                    className="operia-input w-24"
                    aria-label={`Cantidad para ${model?.displayName}`}
                    min="0"
                    step="0.01"
                  />
                  <span className="text-xs text-white/60 w-16 text-right">
                    {contrib !== null ? `+${contrib.toFixed(2)}%` : 'N/A'}
                  </span>
                  <button
                    onClick={() => removeBudgetModel(modelId)}
                    className="text-red-400 hover:text-red-300 text-xs"
                    aria-label={`Eliminar ${model?.displayName} del presupuesto`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {budgetNum > 0 && Object.keys(budgetAllocations).length > 0 && (
          <div className="p-3 border border-white/10 rounded-xl bg-white/5">
            <p className="text-sm text-white/80">
              Contribución adicional estimada: <span className="text-cyan-400 font-bold">{totalBudgetContribution.toFixed(2)} %</span>
            </p>
            <p className="text-sm text-white/70">
              Consumo acumulado después: <span className="text-cyan-400">{((result?.total ?? 0) + totalBudgetContribution).toFixed(2)} %</span>
            </p>
            <p className="text-sm text-white/70">
              Margen restante estimado: <span className="text-emerald-400 font-semibold">{(100 - (result?.total || 0) - totalBudgetContribution).toFixed(2)} %</span>
            </p>
            {(result?.total || 0) + totalBudgetContribution > 100 && (
              <p className="text-red-400 text-sm mt-1">
                ⚠️ El escenario supera el 100 % de cuota estimada.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};