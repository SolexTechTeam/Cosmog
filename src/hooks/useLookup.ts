"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { AetherClient } from "@/lib/aether-client";
import type { LookupOption } from "@/types";

export function useLookup(category: string) {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const categoryRef = useRef(category);
  categoryRef.current = category;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await AetherClient.getLookups(categoryRef.current);
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
