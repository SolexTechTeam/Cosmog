"use client";

import { useState } from "react";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { useToast } from "@/components/ui/toast";
import { AetherClient } from "@/lib/aether-client";
import StatusBadge from "@/components/common/StatusBadge";
import SoAllocationCard from "./SoAllocationCard";
import type { PoAllocationRecord, PoReallocateResponse } from "@/types";

interface PoAllocationTabProps {
  purchaseOrderId: string;
}

interface SoGroup {
  sale_order_id: string;
  so_number: string | null;
  so_status: string | null;
  customer_name: string | null;
  items: PoAllocationRecord[];
}

function groupBySaleOrder(allocations: PoAllocationRecord[]): SoGroup[] {
  const map = new Map<string, SoGroup>();
  for (const a of allocations) {
    if (!a.sale_order_id) continue;
    let group = map.get(a.sale_order_id);
    if (!group) {
      group = {
        sale_order_id: a.sale_order_id,
        so_number: a.so_number,
        so_status: a.so_status,
        customer_name: a.customer_name,
        items: [],
      };
      map.set(a.sale_order_id, group);
    }
    group.items.push(a);
  }
  return Array.from(map.values());
}

export default function PoAllocationTab({ purchaseOrderId }: PoAllocationTabProps) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const { data, loading, error, refetch } = useApi<PoAllocationRecord[]>(
    ["po-allocation", purchaseOrderId],
    () => AetherClient.getCurrentPoAllocation(purchaseOrderId),
  );
  const [reallocateData, setReallocateData] = useState<PoReallocateResponse | null>(null);
  const [loadingReallocate, setLoadingReallocate] = useState(false);
  const [allocationEdits, setAllocationEdits] = useState<Map<string, Map<string, number>>>(new Map());

  async function handleReallocate() {
    setLoadingReallocate(true);
    try {
      const result = await AetherClient.poReallocateResources(purchaseOrderId);
      const edits = new Map<string, Map<string, number>>();
      for (const order of result.shortfall_orders) {
        const items = new Map<string, number>();
        for (const item of order.items) {
          items.set(item.sale_order_item_id, 0);
        }
        edits.set(order.sale_order_id, items);
      }
      setAllocationEdits(edits);
      setReallocateData(result);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load reallocation data", "error");
    } finally {
      setLoadingReallocate(false);
    }
  }

  function handleAllocationChange(soId: string, soItemId: string, value: number) {
    setAllocationEdits((prev) => {
      const next = new Map(prev);
      const items = new Map(next.get(soId) ?? new Map());
      items.set(soItemId, value);
      next.set(soId, items);
      return next;
    });
  }

  if (loading) {
    return (
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 min-h-[200px]">
        <div className="h-4 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-24 w-full animate-pulse rounded bg-muted" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 min-h-[200px]">
        <p className="text-sm text-destructive">Failed to load allocations: {error}</p>
      </section>
    );
  }

  const allocations = data ?? [];
  const groups = groupBySaleOrder(allocations);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity_allocated, 0);
  const hasShortfall = allocations.some((a) => (a.qty_shortfall ?? 0) > 0);

  return (
    <>
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Allocations</span>
              <span className="text-sm font-semibold tabular-nums">{allocations.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Total Allocated</span>
              <span className="text-sm font-semibold tabular-nums">{totalAllocated}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Sale Orders</span>
              <span className="text-sm font-semibold tabular-nums">{groups.length}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReallocate}
            disabled={loadingReallocate}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loadingReallocate ? "Loading..." : "Re-allocate"}
          </button>
        </div>

        {hasShortfall && (
          <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/30">
            <span className="mt-px text-amber-600 dark:text-amber-400">&#9888;</span>
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Some linked orders have shortfalls. Use Re-allocate to distribute available stock.</p>
          </div>
        )}

        {groups.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="text-center text-sm text-muted-foreground">No active allocations for this purchase order.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.sale_order_id} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
                  <span className="text-xs font-semibold text-primary">
                    {group.so_number ?? group.sale_order_id.slice(0, 8) + "..."}
                  </span>
                  {group.so_status && <StatusBadge status={group.so_status} />}
                  {group.customer_name && (
                    <span className="text-xs text-muted-foreground">{group.customer_name}</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="border-b border-border text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Product</th>
                        <th className="px-4 py-2 text-right font-medium">Customer Ordered</th>
                        <th className="px-4 py-2 text-right font-medium">PO has Allocated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.items.map((item) => (
                        <tr key={item.allocation_id} className="hover:bg-muted/50 transition-colors">
                          <td className="px-4 py-2 font-medium">{item.product_name ?? "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums">{item.quantity_ordered ?? "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums font-medium">{item.quantity_allocated}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {reallocateData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold">Re-allocation Resources</h3>
                <p className="text-xs text-muted-foreground">Orders with shortfalls that could use stock from this PO.</p>
              </div>
              <button type="button" onClick={() => { setReallocateData(null); setAllocationEdits(new Map()); refetch(); }} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {reallocateData.shortfall_orders.length === 0 && reallocateData.current_allocations.length == 1 ? (
                <p className="text-center text-sm text-muted-foreground py-6">No other sales orders to allocate (there is only 1 SO for this PO's product).</p>
              ) : (
                <div className="space-y-3">
                  {reallocateData.current_allocations.map((order) => (
                    <SoAllocationCard
                      key={order.sale_order_id}
                      soNumber={order.so_number || "SO-????"}
                      soStatus={order.so_status || "Unknown"}
                      customerName={order.customer_name}
                      items={order.sale_order_id || "SO-????"}
                      allocations={allocationEdits.get(order.sale_order_id || "SO-????") ?? new Map()}
                      onAllocationChange={(soItemId, value) => handleAllocationChange(order.sale_order_id || "SO-????", soItemId, value)}
                    />
                  ))}
                
                  {reallocateData.shortfall_orders.map((order) => (
                    <SoAllocationCard
                      key={order.sale_order_id}
                      soNumber={order.so_number}
                      soStatus={order.so_status}
                      customerName={order.customer_name}
                      items={order.items}
                      allocations={allocationEdits.get(order.sale_order_id) ?? new Map()}
                      onAllocationChange={(soItemId, value) => handleAllocationChange(order.sale_order_id, soItemId, value)}
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    for (const order of reallocateData.shortfall_orders) {
                      const edits = allocationEdits.get(order.sale_order_id);
                      const hasManual = edits && Array.from(edits.values()).some((v) => v > 0);
                      if (hasManual) {
                        const allocations = order.items
                          .filter((item) => (edits?.get(item.sale_order_item_id) ?? 0) > 0)
                          .map((item) => ({
                            sale_order_item_id: item.sale_order_item_id,
                            inventory_lot_id: "",
                            quantity: edits!.get(item.sale_order_item_id)!,
                          }));
                        await AetherClient.allocateInventory({ sale_order_id: order.sale_order_id, mode: "manual", allocations });
                      } else {
                        await AetherClient.allocateInventory({ sale_order_id: order.sale_order_id, mode: "auto" });
                      }
                    }
                    toast(`${reallocateData.shortfall_orders.length} order(s) re-allocated`);
                    invalidate([...queryKeys.saleOrders]);
                  } catch (e) {
                    toast(e instanceof Error ? e.message : "Re-allocation failed", "error");
                  }
                  setReallocateData(null);
                  setAllocationEdits(new Map());
                  refetch();
                }}
                disabled={reallocateData.shortfall_orders.length === 0 && reallocateData.current_allocations.length == 1}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                Allocate
              </button>
              <button type="button" onClick={() => { setReallocateData(null); setAllocationEdits(new Map()); refetch(); }} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
