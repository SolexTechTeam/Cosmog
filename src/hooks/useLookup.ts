"use client";

import { useQuery } from "@tanstack/react-query";
import { AetherClient } from "@/lib/aether-client";
import { queryKeys } from "./useApi";
import type { LookupOption } from "@/types";

export function useLookup(category: string) {
  const { data, isLoading } = useQuery({
    queryKey: [...queryKeys.lookups(category)],
    queryFn: async () => {
      const values = await AetherClient.getLookups(category);
      return values.map((v): LookupOption => ({ label: v.label, value: v.value }));
    },
    staleTime: 5 * 60_000,
  });

  return { options: data ?? [], loading: isLoading };
}
