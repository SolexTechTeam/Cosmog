"use client";

import { useState } from "react";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { useToast } from "@/components/ui/toast";
import { AetherClient } from "@/lib/aether-client";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import type {
  AllocationResponse,
  AllocationItemBreakdown,
  AllocationPreviewResponse,
} from "@/types";

interface AllocationTabProps {
  saleOrderId: string;
  fulfillmentType: string;
  status: string;
}

export default function AllocationTab({ saleOrderId, fulfillmentType, status }: AllocationTabProps) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const { data, loading, error } = useApi<AllocationResponse>(
    [...queryKeys.allocation(saleOrderId)],
    () => AetherClient.getSaleOrderAllocation(saleOrderId),
  );

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<AllocationPreviewResponse | null>(null);
  const [manualPreview, setManualPreview] = useState<AllocationPreviewResponse | null>(null);
  const [manualQuantities, setManualQuantities] = useState<Record<string, string>>({});
  const [manualError, setManualError] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [allocatingManual, setAllocatingManual] = useState(false);
  const [showPoolConfirm, setShowPoolConfirm] = useState(false);
  const [poolLoading, setPoolLoading] = useState(false);

  function toggleRow(itemId: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function handlePreview() {
    setLoadingPreview(true);
    try {
      const result = await AetherClient.previewAllocation(saleOrderId);
      setPreview(result);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to preview allocation", "error");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleConfirmAllocate() {
    setAllocating(true);
    try {
      await AetherClient.allocateInventory({ sale_order_id: saleOrderId, mode: "auto" });
      toast("Inventory allocated successfully");
      setPreview(null);
      invalidate([...queryKeys.allocation(saleOrderId)]);
      invalidate([...queryKeys.saleOrders]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to allocate inventory", "error");
    } finally {
      setAllocating(false);
    }
  }

  async function handleOpenManualAllocation() {
    setLoadingPreview(true);
    try {
      setManualPreview(await AetherClient.previewAllocation(saleOrderId));
      setManualQuantities({});
      setManualError(null);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to load available lots", "error");
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleManualAllocate() {
    if (!manualPreview) return;

    let allocations: { sale_order_item_id: string; inventory_lot_id: string; quantity: number }[];
    try {
      allocations = manualPreview.suggested_allocations.flatMap((item) => {
      const remaining = item.quantity_needed - item.already_allocated;
      const lots = item.available_lots ?? [];
      const selected = lots.map((lot) => ({
        lot,
        quantity: Number(manualQuantities[`${item.sale_order_item_id}:${lot.lot_id}`] || 0),
      })).filter(({ quantity }) => Number.isInteger(quantity) && quantity > 0);
      const total = selected.reduce((sum, { quantity }) => sum + quantity, 0);

      if (total > remaining) throw new Error(`${item.product_name} only needs ${remaining} more.`);
      if (selected.some(({ lot, quantity }) => quantity > lot.available_quantity)) {
        throw new Error(`One or more ${item.product_name} lots exceed their available quantity.`);
      }

        return selected.map(({ lot, quantity }) => ({
          sale_order_item_id: item.sale_order_item_id,
          inventory_lot_id: lot.lot_id,
          quantity,
        }));
      });
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Check the allocation quantities.");
      return;
    }

    if (!allocations.length) {
      setManualError("Enter at least one allocation quantity.");
      return;
    }

    setAllocatingManual(true);
    setManualError(null);
    try {
      await AetherClient.allocateInventory({ sale_order_id: saleOrderId, mode: "manual", allocations });
      toast("Manual allocation saved");
      setManualPreview(null);
      invalidate([...queryKeys.allocation(saleOrderId)]);
      invalidate([...queryKeys.saleOrders]);
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Failed to save manual allocation.");
    } finally {
      setAllocatingManual(false);
    }
  }

  async function handleReallocatePool() {
    setPoolLoading(true);
    try {
      await AetherClient.reallocatePool();
      toast("Pool re-allocation complete");
      setShowPoolConfirm(false);
      invalidate([...queryKeys.allocation(saleOrderId)]);
      invalidate([...queryKeys.saleOrders]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Pool re-allocation failed", "error");
    } finally {
      setPoolLoading(false);
    }
  }

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
        <p className="text-sm text-destructive">Failed to load allocation: {error}</p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="rounded-lg border border-border bg-card p-4 min-h-[200px]">
        <p className="text-sm text-muted-foreground">Allocation data is not yet available.</p>
      </section>
    );
  }

  const isWarehouse = data.channel === "warehouse";
  const canAct = status === "open" && isWarehouse;

  return (
    <section className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Allocation Status</span>
          <StatusBadge status={data.allocation_status} />
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-muted-foreground">Priority Points</span>
          <span className="text-sm font-semibold tabular-nums">{data.priority_points}</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <span className="text-xs text-muted-foreground">Channel</span>
          <span className="text-sm font-medium capitalize">{data.channel.replace(/_/g, " ")}</span>
        </div>
      </div>

      {/* DTC guidance */}
      {!isWarehouse && (
        <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Direct-to-customer order. Coverage is determined by linked purchase orders.
        </p>
      )}

      {/* Table */}
      <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-[200px]">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
              <tr>
                {isWarehouse && <th className="w-8 px-2 py-2" />}
                <th className="px-4 py-2 font-medium">Product</th>
                <th className="px-4 py-2 text-right font-medium">Qty Needed</th>
                {isWarehouse ? (
                  <>
                    <th className="px-4 py-2 text-right font-medium">From Warehouse</th>
                    <th className="px-4 py-2 text-right font-medium">From Incoming</th>
                  </>
                ) : (
                  <th className="px-4 py-2 text-right font-medium">Covered by POs</th>
                )}
                <th className="px-4 py-2 text-right font-medium">Shortfall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.map((item) => {
                const isExpanded = expandedRows.has(item.sale_order_item_id);
                const hasLots = isWarehouse && item.allocations && item.allocations.length > 0;
                return (
                  <AllocationRow
                    key={item.sale_order_item_id}
                    item={item}
                    isWarehouse={isWarehouse}
                    isExpanded={isExpanded}
                    hasLots={!!hasLots}
                    onToggle={() => toggleRow(item.sale_order_item_id)}
                    fmt={fmt}
                  />
                );
              })}
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={isWarehouse ? 6 : 4} className="px-4 py-6 text-center text-muted-foreground">
                    No allocation items
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action buttons */}
      {canAct && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={loadingPreview}
            className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {loadingPreview ? "Loading..." : "Allocate"}
          </button>
          <button
            type="button"
            onClick={handleOpenManualAllocation}
            disabled={loadingPreview}
            className="h-8 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted disabled:opacity-60"
          >
            Allocate Manually
          </button>
          <button
            type="button"
            onClick={() => setShowPoolConfirm(true)}
            className="h-8 rounded-md bg-destructive/10 px-3 text-xs font-semibold text-destructive hover:bg-destructive/20"
          >
            Re-allocate Pool
          </button>
        </div>
      )}

      {/* Preview section */}
      {preview && (
        <div className="rounded-lg border border-primary/20 bg-muted/50 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70 mb-3">
            Allocation Preview
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Product</th>
                  <th className="px-4 py-2 text-right font-medium">Needed</th>
                  <th className="px-4 py-2 text-right font-medium">Already Allocated</th>
                  <th className="px-4 py-2 font-medium">Suggested Lots</th>
                  <th className="px-4 py-2 text-right font-medium">Shortfall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.suggested_allocations.map((sa) => (
                  <tr key={sa.sale_order_item_id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-2.5 font-medium">{sa.product_name}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{sa.quantity_needed}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{sa.already_allocated}</td>
                    <td className="px-4 py-2.5">
                      {sa.allocations.length > 0 ? (
                        <ul className="space-y-0.5">
                          {sa.allocations.map((a, i) => (
                            <li key={i} className="text-xs">
                              <span className="font-mono text-muted-foreground">{a.lot_id.slice(0, 8)}</span>
                              <span className="mx-1">·</span>
                              <StatusBadge status={a.lot_status} />
                              <span className="mx-1">·</span>
                              <span className="tabular-nums">{a.quantity} @ {fmt(a.unit_cost)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${sa.shortfall > 0 ? "text-destructive" : ""}`}>
                      {sa.shortfall}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleConfirmAllocate}
              disabled={allocating}
              className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {allocating ? "Allocating..." : "Confirm (Auto)"}
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="h-8 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {manualPreview && (
        <div className="rounded-lg border border-primary/20 bg-muted/50 p-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">Manual Allocation</h3>
              <p className="mt-1 text-xs text-muted-foreground">Choose available lots. Existing allocations remain unchanged.</p>
            </div>
            <button type="button" onClick={() => setManualPreview(null)} disabled={allocatingManual} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <div className="space-y-4">
            {manualPreview.suggested_allocations.map((item) => {
              const remaining = item.quantity_needed - item.already_allocated;
              const lots = item.available_lots ?? [];
              const selected = lots.reduce((sum, lot) => sum + (Number(manualQuantities[`${item.sale_order_item_id}:${lot.lot_id}`]) || 0), 0);
              return (
                <div key={item.sale_order_item_id} className="overflow-x-auto rounded-md border border-border bg-card">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
                    <span className="font-medium">{item.product_name}</span>
                    <span className="text-xs text-muted-foreground">{selected} selected / {remaining} remaining</span>
                  </div>
                  {lots.length ? (
                    <table className="w-full min-w-[480px] text-xs">
                      <thead className="bg-muted text-muted-foreground"><tr><th className="px-3 py-2 text-left font-medium">Lot</th><th className="px-3 py-2 text-left font-medium">Status</th><th className="px-3 py-2 text-right font-medium">Available</th><th className="px-3 py-2 text-right font-medium">Unit Cost</th><th className="px-3 py-2 text-right font-medium">Allocate</th></tr></thead>
                      <tbody className="divide-y divide-border">
                        {lots.map((lot) => {
                          const key = `${item.sale_order_item_id}:${lot.lot_id}`;
                          return <tr key={lot.lot_id}><td className="px-3 py-2 font-mono text-muted-foreground">{lot.lot_id.slice(0, 8)}</td><td className="px-3 py-2"><StatusBadge status={lot.lot_status} /></td><td className="px-3 py-2 text-right tabular-nums">{lot.available_quantity}</td><td className="px-3 py-2 text-right tabular-nums">{fmt(lot.unit_cost)}</td><td className="px-3 py-2 text-right"><input type="number" min="0" max={lot.available_quantity} step="1" value={manualQuantities[key] ?? ""} onChange={(e) => setManualQuantities((current) => ({ ...current, [key]: e.target.value }))} className="h-8 w-20 rounded-md border border-input bg-background px-2 text-right tabular-nums outline-none focus:ring-1 focus:ring-ring" aria-label={`Allocate from lot ${lot.lot_id}`} /></td></tr>;
                        })}
                      </tbody>
                    </table>
                  ) : <p className="px-3 py-4 text-xs text-muted-foreground">No available lots for this product.</p>}
                </div>
              );
            })}
          </div>
          {manualError && <p role="alert" className="mt-3 text-xs text-destructive">{manualError}</p>}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={handleManualAllocate} disabled={allocatingManual} className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{allocatingManual ? "Saving..." : "Confirm Manual Allocation"}</button>
            <button type="button" onClick={() => setManualPreview(null)} disabled={allocatingManual} className="h-8 rounded-md px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</button>
          </div>
        </div>
      )}

      {/* Pool re-allocate confirm dialog */}
      {showPoolConfirm && (
        <ConfirmDialog
          title="Re-allocate Pool"
          description="This will re-allocate all unassigned warehouse stock across open orders by priority."
          confirmLabel="Re-allocate"
          variant="destructive"
          loading={poolLoading}
          onConfirm={handleReallocatePool}
          onCancel={() => setShowPoolConfirm(false)}
        />
      )}
    </section>
  );
}

/* ── Allocation row with expandable lot details ── */

function AllocationRow({
  item,
  isWarehouse,
  isExpanded,
  hasLots,
  onToggle,
  fmt,
}: {
  item: AllocationItemBreakdown;
  isWarehouse: boolean;
  isExpanded: boolean;
  hasLots: boolean;
  onToggle: () => void;
  fmt: (n: number) => string;
}) {
  const colSpan = isWarehouse ? 6 : 4;

  return (
    <>
      <tr className="hover:bg-muted/50 transition-colors">
        {isWarehouse && (
          <td className="px-2 py-2.5 text-center">
            {hasLots && (
              <button
                type="button"
                onClick={onToggle}
                className="text-xs text-muted-foreground hover:text-foreground"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? "▼" : "▶"}
              </button>
            )}
          </td>
        )}
        <td className="px-4 py-2.5 font-medium">{item.product_name}</td>
        <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity}</td>
        {isWarehouse ? (
          <>
            <td className="px-4 py-2.5 text-right tabular-nums">{item.qty_from_warehouse}</td>
            <td className="px-4 py-2.5 text-right tabular-nums">{item.qty_from_incoming}</td>
          </>
        ) : (
          <td className="px-4 py-2.5 text-right tabular-nums">{item.qty_covered_by_pos ?? 0}</td>
        )}
        <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${item.qty_shortfall > 0 ? "text-destructive" : ""}`}>
          {item.qty_shortfall}
        </td>
      </tr>
      {isWarehouse && isExpanded && hasLots && (
        <tr>
          <td colSpan={colSpan} className="bg-muted/30 px-4 py-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="px-2 py-1 text-left font-medium">Lot ID</th>
                  <th className="px-2 py-1 text-left font-medium">Status</th>
                  <th className="px-2 py-1 text-right font-medium">Quantity</th>
                  <th className="px-2 py-1 text-right font-medium">Unit Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {item.allocations!.map((lot, i) => (
                  <tr key={`${lot.lot_id}-${i}`}>
                    <td className="px-2 py-1 font-mono text-muted-foreground">{lot.lot_id.slice(0, 8)}</td>
                    <td className="px-2 py-1"><StatusBadge status={lot.lot_status} /></td>
                    <td className="px-2 py-1 text-right tabular-nums">{lot.quantity}</td>
                    <td className="px-2 py-1 text-right tabular-nums">{fmt(lot.unit_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
