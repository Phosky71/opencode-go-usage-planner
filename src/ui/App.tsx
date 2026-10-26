// src/ui/App.tsx
import React from 'react';
import { CatalogProvider } from '../context/CatalogContext';
import { PlanProvider } from '../context/PlanContext';
import { PlanSelector } from './components/PlanSelector';
import { ModelCatalog } from './components/ModelCatalog';
import { Calculator } from './components/Calculator';
import { ModelComparator } from './components/ModelComparator';
import { ToolsPanel } from './components/ToolsPanel';

export default function App() {
  return (
    <PlanProvider>
      <CatalogProvider>
        <div className="min-h-screen relative">
          <div className="mesh-bg" aria-hidden="true" />
          <header className="fixed left-0 right-0 top-0 z-50 transition-all duration-300 bg-transparent border-b border-transparent">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
              <a className="group flex items-center gap-3" href="/">
                <svg viewBox="0 0 32 32" fill="none" width="24" height="24" aria-label="Operia Systems" className="transition-transform duration-300 group-hover:scale-110">
                  <rect x="2" y="2" width="28" height="28" rx="6" stroke="url(#nav-logo-grad)" strokeWidth="1.5"></rect>
                  <path d="M9 16 L14 11 L19 16 L14 21 Z" fill="url(#nav-logo-grad)" opacity="0.9"></path>
                  <path d="M16 13 L21 13 L23 16 L21 19 L16 19" stroke="url(#nav-logo-grad)" strokeWidth="1.5" fill="none" strokeLinecap="round"></path>
                  <defs>
                    <linearGradient id="nav-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#00d4ff"></stop>
                      <stop offset="1" stopColor="#00ff88"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-base font-bold tracking-wide" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
                  <span className="text-gradient-cyan">Operia</span> <span className="text-white/80">Systems</span>
                </span>
              </a>
              <div className="text-xs text-white/40">
                OpenCode Go Usage Planner · Herramienta independiente
              </div>
            </div>
          </header>

          <main className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-16">
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
                Calculadora de consumo de cuotas
              </h1>
              <p className="text-base leading-relaxed text-white/60 max-w-2xl">
                Estima el consumo acumulado de cuota compartida de OpenCode Go a partir del gasto introducido por modelo.
                Los límites de referencia no son saldos monetarios independientes.
              </p>
            </div>

            <div className="space-y-6">
              <section>
                <PlanSelector />
              </section>

              <section>
                <h2 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
                  Catálogo de modelos
                </h2>
                <ModelCatalog />
              </section>

              <section>
                <Calculator />
              </section>

              <section>
                <ModelComparator />
              </section>

              <section>
                <ToolsPanel />
              </section>
            </div>
          </main>

          <footer className="relative z-10 border-t border-white/5 mt-20">
            <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 32 32" fill="none" width="20" height="20" aria-label="Operia Systems Logo">
                  <rect x="2" y="2" width="28" height="28" rx="6" stroke="url(#footer-logo-grad)" strokeWidth="1.5"></rect>
                  <path d="M9 16 L14 11 L19 16 L14 21 Z" fill="url(#footer-logo-grad)" opacity="0.9"></path>
                  <path d="M16 13 L21 13 L23 16 L21 19 L16 19" stroke="url(#footer-logo-grad)" strokeWidth="1.5" fill="none" strokeLinecap="round"></path>
                  <defs>
                    <linearGradient id="footer-logo-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                      <stop offset="0" stopColor="#00d4ff"></stop>
                      <stop offset="1" stopColor="#00ff88"></stop>
                    </linearGradient>
                  </defs>
                </svg>
                <span className="text-sm font-bold tracking-wide text-white/80" style={{ fontFamily: 'var(--font-display, system-ui)' }}>Operia Systems</span>
              </div>
              <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-white/40">
                <span>OpenCode Go Usage Planner · Herramienta independiente</span>
              </nav>
              <p className="text-xs font-medium text-white/30 tracking-wide">© 2026 Operia Systems</p>
            </div>
          </footer>
        </div>
      </CatalogProvider>
    </PlanProvider>
  );
}