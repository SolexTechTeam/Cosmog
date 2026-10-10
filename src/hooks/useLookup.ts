"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const categoryRef = useRef(category);
  categoryRef.current = category;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<LookupValue[]>(
        `/api/lookups?category=${encodeURIComponent(categoryRef.current)}&active_only=true`
      );
      setOptions(data.map((v) => ({ label: v.label, value: v.value })));
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { options, loading };
}
