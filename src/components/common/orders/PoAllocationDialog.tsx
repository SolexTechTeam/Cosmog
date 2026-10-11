"use client";

import StatusBadge from "@/components/common/StatusBadge";
import type { PoAllocationRecord } from "@/types";

interface PoAllocationDialogProps {
  allocations: PoAllocationRecord[];
  onClose: () => void;
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

export default function PoAllocationDialog({ allocations, onClose }: PoAllocationDialogProps) {
  const groups = groupBySaleOrder(allocations);
  const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity_allocated, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" role="presentation" onMouseDown={onClose}>
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">Current PO Allocations</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {totalAllocated} unit{totalAllocated !== 1 ? "s" : ""} allocated across {groups.length} sale order{groups.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
          {groups.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No active allocations for this purchase order.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.sale_order_id} className="rounded-md border border-border bg-muted/50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-semibold text-primary">
                      {group.so_number ?? group.sale_order_id.slice(0, 8) + "..."}
                    </span>
                    {group.so_status && <StatusBadge status={group.so_status} />}
                    {group.customer_name && (
                      <span className="text-xs text-muted-foreground">{group.customer_name}</span>
                    )}
                  </div>

                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="pb-1 font-medium">Product</th>
                        <th className="pb-1 text-right font-medium">Ordered</th>
                        <th className="pb-1 text-right font-medium">Warehouse</th>
                        <th className="pb-1 text-right font-medium">Incoming</th>
                        <th className="pb-1 text-right font-medium">Allocated</th>
                        <th className="pb-1 text-right font-medium">Shortfall</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {group.items.map((item) => (
                        <tr key={item.allocation_id}>
                          <td className="py-1.5 font-medium">{item.product_name ?? "—"}</td>
                          <td className="py-1.5 text-right tabular-nums">{item.quantity_ordered ?? "—"}</td>
                          <td className="py-1.5 text-right tabular-nums">{item.qty_from_warehouse ?? 0}</td>
                          <td className="py-1.5 text-right tabular-nums">{item.qty_from_incoming ?? 0}</td>
                          <td className="py-1.5 text-right tabular-nums font-medium">{item.quantity_allocated}</td>
                          <td className={`py-1.5 text-right tabular-nums ${(item.qty_shortfall ?? 0) > 0 ? "text-destructive font-medium" : ""}`}>
                            {(item.qty_shortfall ?? 0) > 0 ? item.qty_shortfall : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
