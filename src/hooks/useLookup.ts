"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface LookupValue {
  id: string;
  category: string;
  value: string;
  label: string;
  sort_order: number;
  is_active: boolean;
  is_system: boolean;
}

export interface LookupOption {
  label: string;
  value: string;
}

export function useLookup(category: string) {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<LookupValue[]>(
        `/api/lookups?category=${encodeURIComponent(category)}&active_only=true`
      );
      setOptions(data.map((v) => ({ label: v.label, value: v.value })));
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { options, loading };
}
