"use client";

import { useQueries } from "@tanstack/react-query";
import { queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";

export function useAllocationStatuses(saleOrderIds: string[]) {
  const allocationQueries = useQueries({
    queries: saleOrderIds.map((saleOrderId) => ({
      queryKey: [...queryKeys.allocation(saleOrderId)],
      queryFn: async () => (await AetherClient.getSaleOrderAllocation(saleOrderId)).allocation_status,
    })),
  });

  const statuses = new Map<string, string>();
  allocationQueries.forEach((query, index) => {
    if (query.data !== undefined) statuses.set(saleOrderIds[index], query.data);
  });

  return {
    statuses,
    loading: allocationQueries.some((query) => query.isLoading),
    refetch: () => Promise.all(allocationQueries.map((query) => query.refetch())),
  };
}
