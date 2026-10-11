"use client";

import StatusBadge from "@/components/common/StatusBadge";

interface SoAllocationCardItem {
  sale_order_item_id: string;
  product_name: string;
  quantity_ordered: number;
  qty_shortfall: number;
}

interface SoAllocationCardProps {
  soNumber: string;
  soStatus: string;
  customerName: string | null;
  priorityPoints?: number;
  mode?: "shortfall" | "current";
  items: SoAllocationCardItem[];
  allocations: Map<string, number>;
  onAllocationChange: (saleOrderItemId: string, value: number) => void;
  maxPerItem?: Map<string, number>;
}

export default function SoAllocationCard({ soNumber, soStatus, customerName, priorityPoints, mode = "shortfall", items, allocations, onAllocationChange, maxPerItem }: SoAllocationCardProps) {
  const isCurrent = mode === "current";

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
        <span className="text-xs font-semibold text-primary">{soNumber}</span>
        <StatusBadge status={soStatus} />
        {priorityPoints != null && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">{priorityPoints.toFixed(1)} pts</span>
        )}
        {customerName && <span className="text-xs text-muted-foreground">{customerName}</span>}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Product</th>
            <th className="px-4 py-2 text-right font-medium">Ordered</th>
            <th className="px-4 py-2 text-right font-medium">{isCurrent ? "Keep Allocated" : "PO Allocation"}</th>
            {!isCurrent && <th className="px-4 py-2 text-right font-medium">Shortfall</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => {
            const qty = allocations.get(item.sale_order_item_id) ?? 0;
            const cap = maxPerItem?.get(item.sale_order_item_id) ?? item.qty_shortfall;
            const itemMax = isCurrent ? cap : Math.min(item.qty_shortfall, cap);
            return (
              <tr key={item.sale_order_item_id}>
                <td className="px-4 py-2 font-medium">{item.product_name}</td>
                <td className="px-4 py-2 text-right tabular-nums">{item.quantity_ordered}</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    min={0}
                    max={itemMax}
                    value={qty}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(itemMax, Number(e.target.value) || 0));
                      onAllocationChange(item.sale_order_item_id, val);
                    }}
                    className="w-16 rounded border border-border bg-background px-2 py-0.5 text-right text-sm tabular-nums focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </td>
                {!isCurrent && (
                  <td className={`px-4 py-2 text-right tabular-nums ${item.qty_shortfall > 0 ? "text-destructive font-medium" : ""}`}>
                    {item.qty_shortfall}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
