// src/ui/components/ToolsPanel.tsx
import React, { useState } from 'react';
import { useCatalog } from '../../context/CatalogContext';
import { getLimitStatus, getVerificationStatus } from '../../domain/models';

export const ToolsPanel: React.FC = () => {
  const { catalog, lastUpdated } = useCatalog();
  const [copied, setCopied] = useState(false);

  const autoExtracted = catalog.filter(m => getVerificationStatus(m) === 'auto_extracted').length;
  const manuallyVerified = catalog.filter(m => getVerificationStatus(m) === 'manually_verified').length;
  const unknownLimits = catalog.filter(m => getLimitStatus(m) === 'unknown').length;
  const unlimitedLimits = catalog.filter(m => getLimitStatus(m) === 'unlimited').length;

  const actionCommand = 'npx tsx scripts/update-catalog.ts';

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(actionCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedLastUpdate = lastUpdated
    ? new Date(lastUpdated).toLocaleString('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : 'No disponible';

  return (
    <div className="glass p-6">
      <h2 className="text-xl font-bold text-white mb-3" style={{ fontFamily: 'var(--font-display, system-ui)' }}>
        Estado del Catálogo
      </h2>
      
      <div className="space-y-3 text-sm text-white/70">
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
          <span className="font-medium">Modelos activos en catálogo:</span>
          <span className="font-bold text-cyan-400">{catalog.length}</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
          <span className="font-medium">Última actualización publicada:</span>
          <span className="text-white/60">{formattedLastUpdate}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[11px] uppercase tracking-wide text-white/60">Extraídos automáticamente</p>
            <p className="mt-1 font-bold text-amber-300">{autoExtracted}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[11px] uppercase tracking-wide text-white/60">Verificados manualmente</p>
            <p className="mt-1 font-bold text-emerald-300">{manuallyVerified}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[11px] uppercase tracking-wide text-white/60">Límite desconocido</p>
            <p className="mt-1 font-bold text-white/80">{unknownLimits}</p>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/5">
            <p className="text-[11px] uppercase tracking-wide text-white/60">Ilimitados</p>
            <p className="mt-1 font-bold text-cyan-300">{unlimitedLimits}</p>
          </div>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs">
          <p className="font-semibold mb-1">ℹ️ Nota de arquitectura (Sitio Estático):</p>
          <p>
            Esta aplicación se ejecuta directamente en su navegador como un sitio estático.
            Por seguridad e integridad, las actualizaciones del catálogo no se realizan en vivo
            desde el cliente, sino mediante un proceso automatizado con <strong>GitHub Actions</strong> o
            mediante ejecución CLI local. El botón de abajo no modifica el catálogo compartido.
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-white/5">
          <h3 className="font-semibold text-white/80 mb-2 text-sm">Comando de actualización local:</h3>
          <div className="flex items-center gap-2">
            <code className="bg-white/5 p-2 rounded-lg text-xs flex-1 overflow-x-auto text-white/80 border border-white/5">
              {actionCommand}
            </code>
            <button
              onClick={handleCopyCommand}
              className="operia-btn-secondary text-xs"
            >
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};