// src/ui/components/PlanSelector.tsx
import React from 'react';
import { usePlan, Plan } from '../../context/PlanContext';

export const PlanSelector: React.FC = () => {
  const { plan, setPlan } = usePlan();

  const plans: { id: Plan; name: string; price: string; description: string }[] = [
    {
      id: 'go',
      name: 'OpenCode Go',
      price: '$10/mes',
      description: 'Acceso de bajo coste a los modelos listados',
    },
    {
      id: 'go-plus',
      name: 'OpenCode Go Plus',
      price: '$40/mes',
      description: 'Límites de uso más altos en todos los modelos',
    },
  ];

  return (
    <div className="glass p-6">
      <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
        Selecciona tu suscripción
      </h2>
      <p className="text-sm text-white/60 mb-4">
        Los límites mensuales y los modelos disponibles dependen del plan que tengas contratado.
        Elige el plan que corresponde a tu suscripción de OpenCode Go.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {plans.map(p => (
          <button
            key={p.id}
            onClick={() => setPlan(p.id)}
            className={`plan-card ${plan === p.id ? 'selected' : ''}`}
            aria-pressed={plan === p.id}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg text-white">{p.name}</span>
              <span className="text-sm font-semibold text-cyan-400">{p.price}</span>
            </div>
            <p className="text-sm text-white/60">{p.description}</p>
            {plan === p.id && (
              <div className="mt-2 text-xs font-medium text-cyan-400">✓ Plan seleccionado</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};