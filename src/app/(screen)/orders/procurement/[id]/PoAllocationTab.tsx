"use client";

import { useState } from "react";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { useToast } from "@/components/ui/toast";
import { AetherClient } from "@/lib/aether-client";
import StatusBadge from "@/components/common/StatusBadge";
import AllocationConfirmDialog from "@/components/common/orders/AllocationConfirmDialog";
import type { PoAllocationRecord, SuggestedAllocationItem, SaleOrder, InventoryLot } from "@/types";

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

type PreviewData = {
  previews: { sale_order_id: string; so_number?: string; suggested_allocations: SuggestedAllocationItem[] }[];
  ownLotIds: Map<string, number>;
};

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
  const { data: saleOrders } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());

  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  async function handleReallocate() {
    setLoadingPreview(true);
    try {
      const openSOs = (saleOrders ?? []).filter((so) => so.status === "open");
      const previews: PreviewData["previews"] = [];
      for (const so of openSOs) {
        try {
          const p = await AetherClient.previewAllocation(so.id);
          if (p.suggested_allocations?.length) {
            previews.push({ sale_order_id: so.id, so_number: so.so_number, suggested_allocations: p.suggested_allocations });
          }
        } catch {}
      }

      const po = await AetherClient.getPurchaseOrder(purchaseOrderId);
      const poItemIds = new Set((po?.items ?? []).map((i: any) => i.id));
      const ownLotIds = new Map<string, number>();
      try {
        const lots = await AetherClient.getInventoryLots();
        for (const l of lots) {
          if (l.purchase_order_item_id && poItemIds.has(l.purchase_order_item_id)) {
            ownLotIds.set(l.id, l.quantity_total);
          }
        }
      } catch {}

      setPreviewData({ previews, ownLotIds });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load allocation preview", "error");
    } finally {
      setLoadingPreview(false);
    }
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

      {previewData && (
        <AllocationConfirmDialog
          title="Re-allocate PO Stock"
          description="Distribute this PO's stock across sale orders. Edit quantities or accept auto-allocation."
          suggestions={previewData.previews}
          mode="confirm"
          ownLotIds={previewData.ownLotIds}
          onAutoAllocate={async (soIds) => {
            for (const soId of soIds) {
              try { await AetherClient.allocateInventory({ sale_order_id: soId, mode: "auto" }); } catch {}
            }
            toast(`${soIds.length} order(s) allocated`);
            invalidate([...queryKeys.saleOrders]);
            setPreviewData(null);
            refetch();
          }}
          onManualAllocate={async (soId, allocations) => {
            await AetherClient.allocateInventory({ sale_order_id: soId, mode: "manual", allocations });
            toast("Manual allocation saved");
            invalidate([...queryKeys.saleOrders]);
            setPreviewData(null);
            refetch();
          }}
          onClose={() => { setPreviewData(null); }}
        />
      )}
    </>
  );
}
