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
  return (key?: string[]) => {
    if (key) queryClient.invalidateQueries({ queryKey: key });
    else queryClient.invalidateQueries();
  };
}

export const queryKeys = {
  saleOrders: ["sale-orders"] as const,
  purchaseOrders: ["purchase-orders"] as const,
  customers: ["customers"] as const,
  suppliers: ["suppliers"] as const,
  products: ["products"] as const,
  profiles: ["profiles"] as const,
  myProfile: ["my-profile"] as const,
  stockStatus: ["stock-status"] as const,
  inventorySummary: ["inventory-summary"] as const,
  demandPriority: ["demand-priority"] as const,
  ledger: ["ledger"] as const,
  inventoryLots: ["inventory-lots"] as const,
  pricingConfig: ["pricing-config"] as const,
  fxRate: (from: string, to: string) => ["fx-rate", from, to] as const,
  dashboardNotes: ["dashboard-notes"] as const,
  lookups: (category: string) => ["lookups", category] as const,
  allocation: (soId: string) => ["allocation", soId] as const,
  margin: (soId: string) => ["margin", soId] as const,
};
