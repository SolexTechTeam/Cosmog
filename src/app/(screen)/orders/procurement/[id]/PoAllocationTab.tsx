"use client";

import { useState } from "react";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { useToast } from "@/components/ui/toast";
import { AetherClient } from "@/lib/aether-client";
import StatusBadge from "@/components/common/StatusBadge";
import PaginatedTable from "@/components/common/PaginatedTable";
import SoAllocationCard from "./SoAllocationCard";
import type { PoAllocationRecord, PoAllocationPreviewResponse } from "@/types";

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
  const [previewData, setPreviewData] = useState<PoAllocationPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [allocationEdits, setAllocationEdits] = useState<Map<string, Map<string, number>>>(new Map());
  const [currentEdits, setCurrentEdits] = useState<Map<string, Map<string, number>>>(new Map());

  async function handleReallocate() {
    setLoadingPreview(true);
    try {
      const result = await AetherClient.previewPoAllocation(purchaseOrderId);
      const shortEdits = new Map<string, Map<string, number>>();
      for (const order of result.shortfall_orders) {
        const items = new Map<string, number>();
        for (const item of order.items) {
          items.set(item.sale_order_item_id, item.suggested_quantity);
        }
        shortEdits.set(order.sale_order_id, items);
      }
      const curEdits = new Map<string, Map<string, number>>();
      for (const order of result.current_orders) {
        const items = new Map<string, number>();
        for (const item of order.items) {
          items.set(item.sale_order_item_id, item.quantity_allocated);
        }
        curEdits.set(order.sale_order_id, items);
      }
      setAllocationEdits(shortEdits);
      setCurrentEdits(curEdits);
      setPreviewData(result);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load allocation preview", "error");
    } finally {
      setLoadingPreview(false);
    }
  }

  function getReleasedByProduct(): Map<string, number> {
    if (!previewData) return new Map();
    const released = new Map<string, number>();
    for (const order of previewData.current_orders) {
      const soEdits = currentEdits.get(order.sale_order_id);
      for (const item of order.items) {
        const edited = soEdits?.get(item.sale_order_item_id) ?? item.quantity_allocated;
        const diff = item.quantity_allocated - edited;
        if (diff > 0) {
          released.set(item.product_id, (released.get(item.product_id) ?? 0) + diff);
        }
      }
    }
    return released;
  }

  function getEffectiveBudget(): Map<string, number> {
    if (!previewData) return new Map();
    const released = getReleasedByProduct();
    const budget = new Map<string, number>();
    for (const b of previewData.product_budget) {
      budget.set(b.product_id, b.total + (released.get(b.product_id) ?? 0));
    }
    return budget;
  }

  function computeMaxPerItem(targetSoId: string): Map<string, number> {
    if (!previewData) return new Map();
    const remaining = getEffectiveBudget();
    for (const order of previewData.shortfall_orders) {
      if (order.sale_order_id === targetSoId) continue;
      const soEdits = allocationEdits.get(order.sale_order_id);
      if (!soEdits) continue;
      for (const item of order.items) {
        const qty = soEdits.get(item.sale_order_item_id) ?? 0;
        if (qty > 0) {
          const cur = remaining.get(item.product_id) ?? 0;
          remaining.set(item.product_id, Math.max(0, cur - qty));
        }
      }
    }
    const targetOrder = previewData.shortfall_orders.find((o) => o.sale_order_id === targetSoId);
    const maxMap = new Map<string, number>();
    for (const item of targetOrder?.items ?? []) {
      maxMap.set(item.sale_order_item_id, remaining.get(item.product_id) ?? 0);
    }
    return maxMap;
  }

  function handleCurrentChange(soId: string, soItemId: string, value: number) {
    setCurrentEdits((prev) => {
      const next = new Map(prev);
      const items = new Map(next.get(soId) ?? new Map());
      items.set(soItemId, value);
      next.set(soId, items);
      return next;
    });
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
            disabled={loadingPreview}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loadingPreview ? "Loading..." : "Re-allocate"}
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
                  <PaginatedTable className="border-0 rounded-none"><table className="w-full min-w-[480px] text-left text-sm">
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
                  </table></PaginatedTable>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {previewData && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground">Re-allocation Preview</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Review suggested allocations. Edit quantities if needed.</p>
            </div>

            <div className="border-b border-border px-5 py-2 bg-muted/30">
              <div className="flex flex-wrap gap-4">
                {previewData.product_budget.map((b) => {
                  const effectiveBudget = getEffectiveBudget().get(b.product_id) ?? b.total;
                  let used = 0;
                  for (const order of previewData.shortfall_orders) {
                    const soEdits = allocationEdits.get(order.sale_order_id);
                    if (!soEdits) continue;
                    for (const item of order.items) {
                      if (item.product_id === b.product_id) used += soEdits.get(item.sale_order_item_id) ?? 0;
                    }
                  }
                  return (
                    <div key={b.product_id} className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">{b.product_name}:</span>
                      <span className={`font-semibold tabular-nums ${used > effectiveBudget ? "text-destructive" : used === effectiveBudget ? "text-primary" : ""}`}>{used}</span>
                      <span className="text-muted-foreground/60">/</span>
                      <span className="tabular-nums">{effectiveBudget}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="h-[60vh] overflow-y-auto px-5 py-3 space-y-3">
              {previewData.current_orders.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Allocations</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  {previewData.current_orders.map((order) => (
                    <SoAllocationCard
                      key={`current-${order.sale_order_id}`}
                      soNumber={order.so_number}
                      soStatus={order.so_status}
                      customerName={order.customer_name}
                      mode="current"
                      items={order.items.map((i) => ({
                        sale_order_item_id: i.sale_order_item_id,
                        product_name: i.product_name,
                        quantity_ordered: i.quantity_ordered,
                        qty_shortfall: i.quantity_allocated,
                      }))}
                      allocations={currentEdits.get(order.sale_order_id) ?? new Map()}
                      onAllocationChange={(soItemId, value) => handleCurrentChange(order.sale_order_id, soItemId, value)}
                      maxPerItem={new Map(order.items.map((i) => [i.sale_order_item_id, i.quantity_allocated]))}
                    />
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shortfall Orders</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                </>
              )}

              {previewData.shortfall_orders.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No orders with shortfalls for this PO's products.</p>
              ) : (
                previewData.shortfall_orders.map((order) => (
                  <SoAllocationCard
                    key={order.sale_order_id}
                    soNumber={order.so_number}
                    soStatus={order.so_status}
                    customerName={order.customer_name}
                    priorityPoints={order.priority_points}
                    items={order.items}
                    allocations={allocationEdits.get(order.sale_order_id) ?? new Map()}
                    onAllocationChange={(soItemId, value) => handleAllocationChange(order.sale_order_id, soItemId, value)}
                    maxPerItem={computeMaxPerItem(order.sale_order_id)}
                  />
                ))
              )}
            </div>

            <div className="flex justify-between border-t border-border px-5 py-3">
              <button type="button" onClick={() => { setPreviewData(null); setAllocationEdits(new Map()); setCurrentEdits(new Map()); refetch(); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Close
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => {
                  if (!previewData) return;
                  const shortEdits = new Map<string, Map<string, number>>();
                  for (const order of previewData.shortfall_orders) {
                    const items = new Map<string, number>();
                    for (const item of order.items) {
                      items.set(item.sale_order_item_id, item.suggested_quantity);
                    }
                    shortEdits.set(order.sale_order_id, items);
                  }
                  setAllocationEdits(shortEdits);
                  const curEdits = new Map<string, Map<string, number>>();
                  for (const order of previewData.current_orders) {
                    const items = new Map<string, number>();
                    for (const item of order.items) {
                      items.set(item.sale_order_item_id, item.quantity_allocated);
                    }
                    curEdits.set(order.sale_order_id, items);
                  }
                  setCurrentEdits(curEdits);
                }} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                  Reset to Suggested
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const releases: { sale_order_item_id: string; inventory_lot_id: string; quantity: number }[] = [];
                      for (const order of previewData.current_orders) {
                        const soEdits = currentEdits.get(order.sale_order_id);
                        for (const item of order.items) {
                          const edited = soEdits?.get(item.sale_order_item_id) ?? item.quantity_allocated;
                          const diff = item.quantity_allocated - edited;
                          if (diff > 0) {
                            let remaining = diff;
                            for (const lot of item.allocations) {
                              if (remaining <= 0) break;
                              const releaseQty = Math.min(remaining, lot.quantity);
                              releases.push({ sale_order_item_id: item.sale_order_item_id, inventory_lot_id: lot.inventory_lot_id, quantity: releaseQty });
                              remaining -= releaseQty;
                            }
                          }
                        }
                      }

                      const allocationSoIds: string[] = [];
                      for (const order of previewData.shortfall_orders) {
                        const edits = allocationEdits.get(order.sale_order_id);
                        if (edits && Array.from(edits.values()).some((v) => v > 0)) {
                          allocationSoIds.push(order.sale_order_id);
                        }
                      }

                      await AetherClient.applyPoAllocation(purchaseOrderId, { releases, allocation_so_ids: allocationSoIds });
                      toast("Allocation updated");
                      invalidate([...queryKeys.saleOrders]);
                      invalidate([...queryKeys.purchaseOrders]);
                    } catch (e) {
                      toast(e instanceof Error ? e.message : "Re-allocation failed", "error");
                    }
                    setPreviewData(null);
                    setAllocationEdits(new Map());
                    setCurrentEdits(new Map());
                    refetch();
                  }}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Accept &amp; Allocate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
