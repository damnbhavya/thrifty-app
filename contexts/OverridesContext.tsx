import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  fetchOverrides,
  saveOverride as apiSaveOverride,
  deleteOverride as apiDeleteOverride,
} from '@/lib/api';
import type { MerchantOverride } from '@/lib/api';

interface OverridesContextType {
  /** Map of normalized merchant_name → category */
  overridesMap: Record<string, string>;
  /** Full override objects */
  overrides: MerchantOverride[];
  loading: boolean;
  /** Get the overridden category for a merchant, or null if none */
  getCategoryForMerchant: (merchantName: string) => string | null;
  /** Save/update an override (persists to backend + updates local cache) */
  saveOverride: (merchantName: string, category: string) => Promise<{ error: Error | null }>;
  /** Delete an override */
  removeOverride: (merchantName: string) => Promise<{ error: Error | null }>;
  /** Refresh overrides from backend */
  refreshOverrides: () => Promise<void>;
}

const OverridesContext = createContext<OverridesContextType | undefined>(undefined);

function normalizeMerchant(name: string): string {
  return name.trim().toLowerCase();
}

export function OverridesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [overrides, setOverrides] = useState<MerchantOverride[]>([]);
  const [overridesMap, setOverridesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const buildMap = (list: MerchantOverride[]): Record<string, string> => {
    const map: Record<string, string> = {};
    for (const o of list) {
      map[normalizeMerchant(o.merchant_name)] = o.category;
    }
    return map;
  };

  const loadOverrides = useCallback(async () => {
    if (!user) {
      setOverrides([]);
      setOverridesMap({});
      setLoading(false);
      return;
    }

    try {
      const data = await fetchOverrides();
      setOverrides(data);
      setOverridesMap(buildMap(data));
    } catch (error) {
      console.error('Error loading overrides:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOverrides();
  }, [loadOverrides]);

  const getCategoryForMerchant = useCallback(
    (merchantName: string): string | null => {
      const normalized = normalizeMerchant(merchantName);
      return overridesMap[normalized] || null;
    },
    [overridesMap]
  );

  const saveOverride = async (
    merchantName: string,
    category: string
  ): Promise<{ error: Error | null }> => {
    const { error } = await apiSaveOverride(merchantName, category);
    if (!error) {
      // Optimistic update
      const normalized = normalizeMerchant(merchantName);
      setOverridesMap((prev) => ({ ...prev, [normalized]: category }));
      setOverrides((prev) => {
        const existing = prev.findIndex(
          (o) => normalizeMerchant(o.merchant_name) === normalized
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], category, updated_at: new Date().toISOString() };
          return updated;
        }
        return [
          ...prev,
          {
            id: '',
            user_id: user?.id || '',
            merchant_name: merchantName,
            category,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      });
    }
    return { error };
  };

  const removeOverride = async (
    merchantName: string
  ): Promise<{ error: Error | null }> => {
    const { error } = await apiDeleteOverride(merchantName);
    if (!error) {
      const normalized = normalizeMerchant(merchantName);
      setOverridesMap((prev) => {
        const next = { ...prev };
        delete next[normalized];
        return next;
      });
      setOverrides((prev) =>
        prev.filter((o) => normalizeMerchant(o.merchant_name) !== normalized)
      );
    }
    return { error };
  };

  const refreshOverrides = async () => {
    setLoading(true);
    await loadOverrides();
  };

  return (
    <OverridesContext.Provider
      value={{
        overridesMap,
        overrides,
        loading,
        getCategoryForMerchant,
        saveOverride,
        removeOverride,
        refreshOverrides,
      }}
    >
      {children}
    </OverridesContext.Provider>
  );
}

export function useOverrides() {
  const context = useContext(OverridesContext);
  if (context === undefined) {
    throw new Error('useOverrides must be used within an OverridesProvider');
  }
  return context;
}
