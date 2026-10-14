import Link from "next/link";
import PaginatedTable from "@/components/common/PaginatedTable";
import type { InventoryLot, PurchaseOrder } from "@/types";

interface InventoryLotsTableProps {
  error?: string | null;
  lots: InventoryLot[];
  poMap: Map<string, PurchaseOrder>;
}

export default function InventoryLotsTable({ error, lots, poMap }: InventoryLotsTableProps) {
  const currentLots = lots.filter((lot) => lot.lot_status !== "depleted");

  if (error) {
    return <p className="text-sm text-destructive">Unable to load inventory lots: {error}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <PaginatedTable className="border-0 rounded-none"><table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">PO #</th>
            <th className="px-3 py-2 font-medium">Received</th>
            <th className="px-3 py-2 text-right font-medium">On-Hand</th>
            <th className="px-3 py-2 text-right font-medium">Reserved</th>
            <th className="px-3 py-2 text-right font-medium">Available</th>
            <th className="px-3 py-2 text-right font-medium">Unit Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {currentLots.map((lot) => {
            const poId = lot.purchase_order_item?.purchase_order_id;
            const po = poId ? poMap.get(poId) : undefined;
            return (
              <tr key={lot.id} className="hover:bg-muted/50">
                <td className="px-3 py-2 text-foreground">
                  {po ? <Link href={`/orders/procurement/${po.id}`} className="font-medium text-primary hover:underline">{po.po_number}</Link> : "—"}
                </td>
                <td className="px-3 py-2 text-foreground">{lot.received_at?.slice(0, 10) ?? "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{lot.quantity_on_hand}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{lot.quantity_reserved}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{Math.max(0, (lot.lot_status === "incoming" ? lot.quantity_total : lot.quantity_on_hand) - lot.quantity_reserved)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">${lot.unit_cost.toFixed(2)}</td>
              </tr>
            );
          })}
          {currentLots.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">No current inventory lots</td>
            </tr>
          )}
        </tbody>
      </table></PaginatedTable>
    </div>
  );
}
