"use client";

import type { ReceivePoResponse, SaleOrder } from "@/types";

interface ReceiveResultsDialogProps {
  result: ReceivePoResponse;
  saleOrders: SaleOrder[];
  onClose: () => void;
}

export default function ReceiveResultsDialog({ result, saleOrders, onClose }: ReceiveResultsDialogProps) {
  const ordersById = new Map(saleOrders.map((order) => [order.id, order]));
  const successful = result.reallocations.filter((row) => !row.error);
  const failed = result.reallocations.filter((row) => row.error);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" role="presentation" onMouseDown={onClose}>
      <section className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-modal="true" aria-labelledby="receive-results-title" onMouseDown={(event) => event.stopPropagation()}>
        <header className="border-b border-border px-5 py-3">
          <h2 id="receive-results-title" className="text-sm font-semibold text-foreground">PO Receive Results</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">Review the allocations made when the received stock became available.</p>
        </header>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-3 space-y-3">
          {result.reallocations.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No sales orders were reallocated.</p>
          ) : result.reallocations.map((row) => {
            const order = ordersById.get(row.sale_order_id);
            const moved = (row.items ?? []).reduce((sum, item) => sum + item.qty_from_warehouse + item.qty_from_incoming, 0);
            return (
              <article key={row.sale_order_id} className="rounded-md border border-border bg-muted/30 p-3">
                <h3 className="text-xs font-semibold text-primary">{order?.so_number ?? `SO ${row.sale_order_id.slice(0, 8)}`}</h3>
                {row.error ? (
                  <p className="mt-2 text-xs text-destructive">Allocation failed: {row.error}</p>
                ) : (row.items?.length ?? 0) > 0 ? (
                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-muted-foreground"><tr>
                        <th className="pb-1 font-medium">Product</th><th className="pb-1 text-right font-medium">From stock</th><th className="pb-1 text-right font-medium">Shortfall</th>
                      </tr></thead>
                      <tbody className="divide-y divide-border">{row.items?.map((item) => (
                        <tr key={item.sale_order_item_id}>
                          <td className="py-1.5 font-medium">{item.product_name}</td>
                          <td className="py-1.5 text-right tabular-nums">{item.qty_from_warehouse + item.qty_from_incoming}</td>
                          <td className={`py-1.5 text-right tabular-nums ${item.qty_shortfall > 0 ? "text-destructive" : ""}`}>{item.qty_shortfall}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">No new stock was allocated to this order.</p>
                )}
                {!row.error && moved > 0 && <p className="mt-2 text-right text-xs text-muted-foreground">{moved} unit{moved === 1 ? "" : "s"} allocated</p>}
              </article>
            );
          })}
          <p className="text-xs text-muted-foreground">{successful.length} order{successful.length === 1 ? "" : "s"} processed successfully; {failed.length} failed.</p>
        </div>
        <footer className="flex justify-end border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">Close</button>
        </footer>
      </section>
    </div>
  );
}
