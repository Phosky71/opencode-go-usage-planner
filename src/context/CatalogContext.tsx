// src/context/CatalogContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Model } from '../domain/models';
import { updateCatalog } from '../catalog/updater';
import catalogData from '../data/models.json';

interface CatalogContextValue {
  catalog: Model[];
  refresh: () => Promise<{ added: number; updated: number; errors?: string[] }[]>;
  loading: boolean;
  error?: string;
  lastUpdated: string | null;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [catalog, setCatalog] = useState<Model[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Initialize with static catalog data on mount
  useEffect(() => {
    try {
      const data = catalogData as Model[];
      setCatalog(data);
      if (data.length > 0) {
        const latest = data.reduce((max, m) => {
          if (!m.checkedAt) return max;
          if (!max) return m.checkedAt;
          return new Date(m.checkedAt) > new Date(max) ? m.checkedAt : max;
        }, '');
        setLastUpdated(latest || null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh: fetches from official sources and updates in-memory state
  // NOTE: In a static site, this only updates React state, not the persisted file.
  // The persisted catalog is updated via GitHub Actions or CLI (scripts/update-catalog.ts).
  const refresh = async () => {
    setLoading(true);
    try {
      const results = await updateCatalog();
      // Update in-memory catalog with newly parsed models
      for (const r of results) {
        if (r.parsedModels && r.parsedModels.length > 0 && !r.errors) {
          setCatalog(prev => {
            const map = new Map(prev.map(m => [m.id, m]));
            for (const model of r.parsedModels!) {
              map.set(model.id, model);
            }
            return Array.from(map.values());
          });
          setLastUpdated(new Date().toISOString());
        }
      }
      setLoading(false);
      return results.map(r => ({ added: 0, updated: r.totalParsed, errors: r.errors }));
    } catch (e) {
      const err = e instanceof Error ? e.message : String(e);
      setError(err);
      setLoading(false);
      return [];
    }
  };

  return (
    <CatalogContext.Provider value={{ catalog, refresh, loading, error, lastUpdated }}>
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error('useCatalog must be used within CatalogProvider');
  }
  return ctx;
};