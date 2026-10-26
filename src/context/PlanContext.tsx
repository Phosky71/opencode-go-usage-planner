// src/context/PlanContext.tsx
import React, { createContext, useContext, useState } from 'react';

export type Plan = 'go' | 'go-plus';

interface PlanContextValue {
  plan: Plan;
  setPlan: (plan: Plan) => void;
  planName: string;
  planLimit: string;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export const PlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<Plan>('go');

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