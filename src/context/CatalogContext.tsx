// src/context/CatalogContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Model } from '../domain/models';
import catalogData from '../data/models.json';

interface CatalogContextValue {
  catalog: Model[];
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

  return (
    <CatalogContext.Provider value={{ catalog, loading, error, lastUpdated }}>
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