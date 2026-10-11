"use client";

import { useState, useMemo } from "react";
import StatusBadge from "@/components/common/StatusBadge";
import type { PoShortfallResponse, ShortfallOrder, ShortfallOrderItem } from "@/types";

interface ShortfallAllocationDialogProps {
  shortfall: PoShortfallResponse;
  onAllocate: (allocations: { sale_order_id: string; items: { sale_order_item_id: string; inventory_lot_id: string; quantity: number }[] }[]) => Promise<void>;
  onClose: () => void;
}

type EditState = Map<string, Map<string, number>>;

export default function ShortfallAllocationDialog({ shortfall, onAllocate, onClose }: ShortfallAllocationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [editState, setEditState] = useState<EditState>(() => new Map());

  const lotsByProduct = useMemo(() => {
    const map = new Map<string, { lot_id: string; available: number; lot_status: string }[]>();
    for (const pp of shortfall.po_products) {
      map.set(pp.product_id, pp.lots);
    }
    return map;
  }, [shortfall.po_products]);

  function getQty(soItemId: string, lotId: string): number {
    return editState.get(soItemId)?.get(lotId) ?? 0;
  }

  function updateQty(soItemId: string, lotId: string, qty: number) {
    setEditState((prev) => {
      const next = new Map(prev);
      const lotMap = new Map(next.get(soItemId) ?? new Map());
      lotMap.set(lotId, Math.max(0, qty));
      next.set(soItemId, lotMap);
      return next;
    });
  }

  function getTotalAssignedToLot(lotId: string): number {
    let total = 0;
    for (const lotMap of editState.values()) {
      total += lotMap.get(lotId) ?? 0;
    }
    return total;
  }

  function getLotRemaining(lotId: string, available: number): number {
    return available - getTotalAssignedToLot(lotId);
  }

  const hasAllocations = useMemo(() => {
    for (const lotMap of editState.values()) {
      for (const qty of lotMap.values()) {
        if (qty > 0) return true;
      }
    }
    return false;
  }, [editState]);

  async function handleAllocate() {
    setLoading(true);
    try {
      const byOrder = new Map<string, { sale_order_id: string; items: { sale_order_item_id: string; inventory_lot_id: string; quantity: number }[] }>();
      for (const order of shortfall.shortfall_orders) {
        for (const item of order.items) {
          const lotMap = editState.get(item.sale_order_item_id);
          if (!lotMap) continue;
          for (const [lotId, qty] of lotMap) {
            if (qty <= 0) continue;
            let entry = byOrder.get(order.sale_order_id);
            if (!entry) {
              entry = { sale_order_id: order.sale_order_id, items: [] };
              byOrder.set(order.sale_order_id, entry);
            }
            entry.items.push({ sale_order_item_id: item.sale_order_item_id, inventory_lot_id: lotId, quantity: qty });
          }
        }
      }
      await onAllocate(Array.from(byOrder.values()));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" role="presentation" onMouseDown={onClose}>
      <div className="w-full max-w-3xl rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Re-allocate to Shortfall Orders</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {shortfall.shortfall_orders.length} order{shortfall.shortfall_orders.length !== 1 ? "s" : ""} with shortfalls for products in this PO
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
          {shortfall.shortfall_orders.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No orders with shortfalls for this PO&apos;s products.</p>
          ) : (
            <div className="space-y-4">
              {shortfall.shortfall_orders.map((order) => (
                <ShortfallOrderCard
                  key={order.sale_order_id}
                  order={order}
                  lotsByProduct={lotsByProduct}
                  getQty={getQty}
                  updateQty={updateQty}
                  getLotRemaining={getLotRemaining}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAllocate}
            disabled={loading || !hasAllocations}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? "Allocating..." : "Allocate"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShortfallOrderCard({
  order,
  lotsByProduct,
  getQty,
  updateQty,
  getLotRemaining,
}: {
  order: ShortfallOrder;
  lotsByProduct: Map<string, { lot_id: string; available: number; lot_status: string }[]>;
  getQty: (soItemId: string, lotId: string) => number;
  updateQty: (soItemId: string, lotId: string, qty: number) => void;
  getLotRemaining: (lotId: string, available: number) => number;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold text-primary">{order.so_number}</span>
        <StatusBadge status={order.so_status} />
        {order.customer_name && (
          <span className="text-xs text-muted-foreground">{order.customer_name}</span>
        )}
      </div>

      <div className="space-y-3">
        {order.items.map((item) => {
          const lots = lotsByProduct.get(item.product_id) ?? [];
          return (
            <div key={item.sale_order_item_id} className="rounded border border-border bg-background p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium">{item.product_name}</span>
                <span className="text-xs text-destructive font-medium">Shortfall: {item.qty_shortfall}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                <span>Ordered: {item.quantity_ordered}</span>
                <span>Warehouse: {item.qty_from_warehouse}</span>
                <span>Incoming: {item.qty_from_incoming}</span>
              </div>
              {lots.length > 0 ? (
                <div className="space-y-1">
                  {lots.map((lot) => {
                    const remaining = getLotRemaining(lot.lot_id, lot.available);
                    const currentQty = getQty(item.sale_order_item_id, lot.lot_id);
                    const max = remaining + currentQty;
                    return (
                      <div key={lot.lot_id} className="flex items-center gap-2 text-xs">
                        <StatusBadge status={lot.lot_status} />
                        <span className="text-muted-foreground tabular-nums">{remaining} avail</span>
                        <input
                          type="number"
                          min={0}
                          max={Math.min(max, item.qty_shortfall)}
                          value={currentQty || ""}
                          placeholder="0"
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            updateQty(item.sale_order_item_id, lot.lot_id, Math.min(val, max, item.qty_shortfall));
                          }}
                          className="h-6 w-16 rounded border border-border bg-background px-1 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No available lots from this PO for this product.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
