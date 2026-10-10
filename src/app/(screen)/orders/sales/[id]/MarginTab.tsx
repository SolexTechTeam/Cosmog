"use client";

import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import type { MarginResponse, WarehouseMarginResponse, DtcMarginResponse } from "@/types";

interface MarginTabProps {
  saleOrderId: string;
}

function isWarehouseMargin(data: MarginResponse): data is WarehouseMarginResponse {
  return "items" in data && Array.isArray((data as WarehouseMarginResponse).items);
}

function isDtcMargin(data: MarginResponse): data is DtcMarginResponse {
  return "revenue" in data && !("items" in data);
}

export default function MarginTab({ saleOrderId }: MarginTabProps) {
  const { data, loading, error } = useApi<MarginResponse>(
    [...queryKeys.margin(saleOrderId)],
    () => AetherClient.getSaleOrderMargin(saleOrderId),
  );

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const marginColor = (n: number) => (n >= 0 ? "text-primary" : "text-destructive");

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
        <p className="text-sm text-destructive">Failed to load margin data: {error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-lg border border-border bg-card p-4 min-h-[200px]">
        <p className="text-sm text-muted-foreground">Margin data is not available until inventory is allocated.</p>
      </section>
    );
  }

  /* ── DTC view ── */
  if (isDtcMargin(data)) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Margin Summary (Direct-to-Customer)
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{fmt(data.revenue)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="mt-1 text-lg font-bold tabular-nums">{fmt(data.cost)}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">Margin</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${marginColor(data.margin)}`}>{fmt(data.margin)}</p>
          </div>
        </div>
      </section>
    );
  }

  /* ── Warehouse view ── */
  if (isWarehouseMargin(data)) {
    return (
      <section className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-[200px]">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 text-right font-medium">Qty</th>
                <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                <th className="px-4 py-2 text-right font-medium">FIFO Cost</th>
                <th className="px-4 py-2 text-right font-medium">Margin/Unit</th>
                <th className="px-4 py-2 text-right font-medium">Revenue</th>
                <th className="px-4 py-2 text-right font-medium">Cost</th>
                <th className="px-4 py-2 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((item) => (
                <tr key={item.sale_order_item_id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{item.product_name}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(item.unit_price)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(item.weighted_fifo_cost)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${marginColor(item.margin_per_unit)}`}>
                    {fmt(item.margin_per_unit)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(item.total_revenue)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{fmt(item.total_cost)}</td>
                  <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${marginColor(item.total_margin)}`}>
                    {fmt(item.total_margin)}
                  </td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-muted-foreground">
                    No margin items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {data.items.length > 0 && (
          <div className="border-t border-border bg-muted/30 px-4 py-2">
            <dl className="ml-auto w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-xs text-muted-foreground">Total Revenue</dt>
                <dd className="tabular-nums font-medium">{fmt(data.order_total_revenue)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-xs text-muted-foreground">Total Cost</dt>
                <dd className="tabular-nums font-medium">{fmt(data.order_total_cost)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                <dt className="text-xs font-bold text-foreground">Total Margin</dt>
                <dd className={`tabular-nums text-base font-bold ${marginColor(data.order_total_margin)}`}>
                  {fmt(data.order_total_margin)}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </section>
    );
  }

  /* Fallback for unexpected shape */
  return (
    <section className="rounded-lg border border-border bg-card p-4 min-h-[200px]">
      <p className="text-sm text-muted-foreground">Margin data is not available until inventory is allocated.</p>
    </section>
  );
}
