import React, { createContext, useContext, useEffect, useState } from 'react';

export type Plan = 'go' | 'go-plus';

const PLAN_STORAGE_KEY = 'operia.planner.plan.v1';

interface PlanContextValue {
  plan: Plan;
  setPlan: (plan: Plan) => void;
  planName: string;
  planLimit: string;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

function readStoredPlan(): Plan {
  if (typeof window === 'undefined') return 'go';
  try {
    const value = window.localStorage.getItem(PLAN_STORAGE_KEY);
    return value === 'go-plus' ? 'go-plus' : 'go';
  } catch {
    return 'go';
  }
}

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<Plan>(readStoredPlan);

  useEffect(() => {
    try {
      window.localStorage.setItem(PLAN_STORAGE_KEY, plan);
    } catch {
      // El plan sigue funcionando en memoria si localStorage no está disponible.
    }
  }, [plan]);

  const planName = plan === 'go' ? 'OpenCode Go' : 'OpenCode Go Plus';
  const planLimit = plan === 'go' ? '$10/mes' : '$40/mes';

  return (
    <PlanContext.Provider value={{ plan, setPlan, planName, planLimit }}>
      {children}
    </PlanContext.Provider>
  );
};

export const usePlan = () => {
  const ctx = useContext(PlanContext);
  if (!ctx) {
    throw new Error('usePlan must be used within PlanProvider');
  }
  return ctx;
};
