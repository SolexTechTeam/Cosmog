"use client";

import { useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";

export function useApi<T>(
  queryKey: string[],
  fetcher: () => Promise<T>,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">
) {
  const query = useQuery<T, Error>({
    queryKey,
    queryFn: fetcher,
    ...options,
  });

  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
}

export function useInvalidate() {
  const queryClient = useQueryClient();
  return (key?: string[], refetchType: "active" | "all" = "active") => {
    if (key) return queryClient.invalidateQueries({ queryKey: key, refetchType });
    return queryClient.invalidateQueries({ refetchType });
  };
}

export const queryKeys = {
  saleOrders: ["sale-orders"] as const,
  purchaseOrders: ["purchase-orders"] as const,
  customers: ["customers"] as const,
  suppliers: ["suppliers"] as const,
  products: ["products"] as const,
  catalogueConfigs: ["catalogue-configs"] as const,
  catalogueTemplate: ["catalogue-configs", "current-source", "config"] as const,
  profiles: ["profiles"] as const,
  myProfile: ["my-profile"] as const,
  stockStatus: ["stock-status"] as const,
  inventorySummary: ["inventory-summary"] as const,
  demandPriority: ["demand-priority"] as const,
  ledger: ["ledger"] as const,
  inventoryLots: ["inventory-lots"] as const,
  inventoryAllocations: (productId: string) => ["inventory-allocations", productId] as const,
  inventoryAllocationsRoot: ["inventory-allocations"] as const,
  pricingConfig: ["pricing-config"] as const,
  fxRate: (from: string, to: string) => ["fx-rate", from, to] as const,
  dashboardNotes: ["dashboard-notes"] as const,
  lookups: (category: string) => ["lookups", category] as const,
  allocation: (soId: string) => ["allocation", soId] as const,
  allocationRoot: ["allocation"] as const,
  reassignCandidates: (itemId: string) => ["reassign-candidates", itemId] as const,
  margin: (soId: string) => ["margin", soId] as const,
};

export async function invalidatePurchaseOrderInventoryEffects(invalidate: ReturnType<typeof useInvalidate>) {
  await Promise.all([
    invalidate([...queryKeys.purchaseOrders]),
    invalidate([...queryKeys.saleOrders]),
    invalidate([...queryKeys.allocationRoot]),
    invalidate([...queryKeys.inventoryAllocationsRoot]),
    invalidate([...queryKeys.demandPriority]),
    invalidate([...queryKeys.stockStatus]),
    invalidate([...queryKeys.inventorySummary]),
    invalidate([...queryKeys.inventoryLots]),
    invalidate([...queryKeys.ledger]),
  ]);
}
