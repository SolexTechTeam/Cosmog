"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

interface AllocationResponse {
  allocation_status: string;
  priority_points: number;
}

export function useAllocationStatuses(saleOrderIds: string[]) {
  const [statuses, setStatuses] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!saleOrderIds.length) {
      setStatuses(new Map());
      return;
    }
    setLoading(true);
    const results = await Promise.allSettled(
      saleOrderIds.map((id) =>
        api.get<AllocationResponse>(`/api/sale-orders/${id}/allocation`).then((r) => [id, r.allocation_status] as const)
      )
    );
    const map = new Map<string, string>();
    for (const result of results) {
      if (result.status === "fulfilled") {
        map.set(result.value[0], result.value[1]);
      }
    }
    setStatuses(map);
    setLoading(false);
  }, [saleOrderIds.join(",")]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { statuses, loading, refetch: fetch };
}
