import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlan } from '../../context/PlanContext';
import { Model } from '../../domain/models';
import {
  MAX_SCENARIO_BYTES,
  Scenario,
  SCENARIO_STORAGE_KEY,
  SCENARIO_VERSION,
  normalizeNumericText,
  parseScenarioJson,
  serializeScenario,
  unknownScenarioModelIds,
} from '../../domain/scenario';

export interface ImportResult {
  ok: boolean;
  error?: string;
}

function readStoredScenario(): { scenario: Scenario | null; warning: string | null } {
  if (typeof window === 'undefined') {
    return { scenario: null, warning: null };
  }
  try {
    const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) return { scenario: null, warning: null };
    const scenario = parseScenarioJson(raw);
    if (!scenario) {
      window.localStorage.removeItem(SCENARIO_STORAGE_KEY);
      return {
        scenario: null,
        warning: 'El escenario guardado no era válido y se ha descartado. Puedes empezar uno nuevo.',
      };
    }
    return { scenario, warning: null };
  } catch {
    return {
      scenario: null,
      warning: 'No se pudo acceder al almacenamiento local. El escenario no se guardará en este navegador.',
    };
  }
}

export function useScenarioPersistence(catalog: Model[]) {
  const { plan, setPlan, clearPlan } = usePlan();
  const restored = useMemo(readStoredScenario, []);
  const [entries, setEntries] = useState(restored.scenario?.entries ?? []);
  const [observed, setObserved] = useState(restored.scenario?.observedPercent ?? '');
  const [hypotheses, setHypotheses] = useState(restored.scenario?.hypotheses ?? []);
  const [budget, setBudget] = useState(restored.scenario?.budgetUsd ?? '');
  const [budgetAllocations, setBudgetAllocations] = useState<Record<string, number>>(
    restored.scenario?.budgetAllocations ?? {},
  );
  const [hydrated, setHydrated] = useState(false);
  const [storageNotice, setStorageNotice] = useState<string | null>(restored.warning);
  const skipNextPersist = useRef(false);

  // The stored plan lives in PlanContext; keep it in sync after the initial read.
  useEffect(() => {
    if (restored.scenario?.plan && restored.scenario.plan !== plan) {
      setPlan(restored.scenario.plan);
    }
  }, [plan, restored.scenario, setPlan]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Drop references to models that no longer exist in the catalog.
  useEffect(() => {
    if (!hydrated || catalog.length === 0) return;
    const ids = new Set(catalog.map((model) => model.id));
    setEntries((prev) => prev.filter((entry) => ids.has(entry.modelId)));
    setHypotheses((prev) => prev.filter((hypothesis) => ids.has(hypothesis.modelId)));
    setBudgetAllocations((prev) => {
      const next = Object.fromEntries(
        Object.entries(prev).filter(([modelId]) => ids.has(modelId)),
      );
      return Object.keys(next).length === Object.keys(prev).length ? prev : next;
    });
  }, [catalog, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      const scenario: Scenario = {
        version: SCENARIO_VERSION,
        plan,
        entries,
        observedPercent: normalizeNumericText(observed),
        hypotheses,
        budgetUsd: normalizeNumericText(budget),
        budgetAllocations,
      };
      try {
        window.localStorage.setItem(SCENARIO_STORAGE_KEY, JSON.stringify(scenario));
      } catch {
        setStorageNotice('No se pudo guardar el escenario en este navegador.');
      }
    }, 200);
    return () => window.clearTimeout(timeout);
  }, [hydrated, plan, entries, observed, hypotheses, budget, budgetAllocations]);

  const hasData = entries.length > 0
    || hypotheses.length > 0
    || Object.keys(budgetAllocations).length > 0
    || observed.trim().length > 0
    || budget.trim().length > 0;

  function addEntry(modelId: string, consumptionUsd: number) {
    setEntries((prev) => [...prev, { modelId, consumptionUsd }]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  }

  function clearEntries() {
    setEntries([]);
  }

  function addHypothesis(modelId: string, amountUsd: number) {
    setHypotheses((prev) => [...prev, { modelId, amountUsd }]);
  }

  function removeHypothesis(index: number) {
    setHypotheses((prev) => prev.filter((_, i) => i !== index));
  }

  function clearHypotheses() {
    setHypotheses([]);
  }

  function addBudgetModel(modelId: string) {
    setBudgetAllocations((prev) => (
      prev[modelId] === undefined ? { ...prev, [modelId]: 0 } : prev
    ));
  }

  function updateAllocation(modelId: string, amount: number) {
    setBudgetAllocations((prev) => ({ ...prev, [modelId]: amount }));
  }

  function removeBudgetModel(modelId: string) {
    setBudgetAllocations((prev) => {
      const next = { ...prev };
      delete next[modelId];
      return next;
    });
  }

  function exportScenario() {
    const scenario: Scenario = {
      version: SCENARIO_VERSION,
      plan,
      entries,
      observedPercent: normalizeNumericText(observed),
      hypotheses,
      budgetUsd: normalizeNumericText(budget),
      budgetAllocations,
    };
    const blob = new Blob([serializeScenario(scenario)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `operia-planner-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function importScenario(file: File): Promise<ImportResult> {
    if (catalog.length === 0) {
      return { ok: false, error: 'El catálogo todavía no está cargado. Inténtalo de nuevo en unos segundos.' };
    }
    if (file.size > MAX_SCENARIO_BYTES) {
      return { ok: false, error: 'El archivo supera el límite de 256 KB.' };
    }
    let text: string;
    try {
      text = await file.text();
    } catch {
      return { ok: false, error: 'No se pudo leer el archivo.' };
    }
    const scenario = parseScenarioJson(text);
    if (!scenario) {
      return { ok: false, error: 'El archivo no contiene un escenario válido o usa una versión desconocida.' };
    }
    if (catalog.length > 0) {
      const available = new Set(catalog.map((model) => model.id));
      const unknown = unknownScenarioModelIds(scenario, available);
      if (unknown.length > 0) {
        return { ok: false, error: `El archivo contiene modelos no disponibles: ${unknown.slice(0, 3).join(', ')}${unknown.length > 3 ? '…' : ''}.` };
      }
    }
    setEntries(scenario.entries);
    setObserved(scenario.observedPercent);
    setHypotheses(scenario.hypotheses);
    setBudget(scenario.budgetUsd);
    setBudgetAllocations(scenario.budgetAllocations);
    setPlan(scenario.plan);
    setStorageNotice(null);
    return { ok: true };
  }

  function clearSavedScenario() {
    const hasScenarioData = entries.length > 0
      || hypotheses.length > 0
      || Object.keys(budgetAllocations).length > 0
      || observed.trim().length > 0
      || budget.trim().length > 0;
    if (hasScenarioData || plan !== 'go') {
      skipNextPersist.current = true;
    }
    setEntries([]);
    setObserved('');
    setHypotheses([]);
    setBudget('');
    setBudgetAllocations({});
    clearPlan();
    try {
      window.localStorage.removeItem(SCENARIO_STORAGE_KEY);
    } catch {
      // No-op: the in-memory scenario is already cleared.
    }
    setStorageNotice('Escenario y preferencia de plan eliminados de este navegador.');
  }

  return {
    entries,
    observed,
    setObserved,
    hypotheses,
    budget,
    setBudget,
    budgetAllocations,
    hasData,
    storageNotice,
    addEntry,
    removeEntry,
    clearEntries,
    addHypothesis,
    removeHypothesis,
    clearHypotheses,
    addBudgetModel,
    updateAllocation,
    removeBudgetModel,
    exportScenario,
    importScenario,
    clearSavedScenario,
  };
}
