"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useApi, useInvalidate, queryKeys, invalidatePurchaseOrderInventoryEffects } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import ColumnPicker from "@/components/common/ColumnPicker";
import StatusBadge from "@/components/common/StatusBadge";
import CreatePurchaseOrderDialog from "@/components/common/orders/CreatePurchaseOrderDialog";
import PoAllocationDialog from "@/components/common/orders/PoAllocationDialog";
import SoAllocationCard from "./[id]/SoAllocationCard";
import OrderScreenLayout from "@/components/common/orders/OrderScreenLayout";
import ProcurementOverviewCards from "./ProcurementOverviewCards";
import LinkedSaleOrdersEditor from "@/components/common/orders/LinkedSaleOrdersEditor";
import ErrorBlock from "@/components/ui/error-block";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import PurchaseOrderQuantityFields, { itemDraftsFromOrder, purchaseItemsChanged, savePurchaseOrderItems, type PurchaseItemDraft } from "@/components/common/orders/PurchaseOrderQuantityFields";
import type { PurchaseOrder, SaleOrder, PoAllocationRecord, PoAllocationPreviewResponse } from "@/types";
import { canTransitionPurchaseOrder, getPurchaseOrderTransitions } from "@/lib/order-status";
import type { ColDef } from "ag-grid-community";

interface PurchaseOrderItemsProps {
  purchaseOrder: PurchaseOrder;
  onUpdated: () => void;
}

const poSelectClass = "h-8 rounded-md border border-input bg-background px-2 text-xs font-normal outline-none focus:ring-1 focus:ring-ring";
const poInputClass = "h-8 rounded-md border border-input bg-background px-2 text-xs font-normal outline-none focus:ring-1 focus:ring-ring";

type DialogData =
  | { type: "po-allocate"; data: PoAllocationPreviewResponse }
  | { type: "receive"; allocations: PoAllocationRecord[]; purchaseOrderId: string };

function InlinePurchaseOrderEditor({ purchaseOrder, onSaved, onShippedPreview }: {
  purchaseOrder: PurchaseOrder;
  onSaved: () => void;
  onShippedPreview: (preview: PoAllocationPreviewResponse) => void;
}) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogData, setDialogData] = useState<DialogData | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [allocationEdits, setAllocationEdits] = useState<Map<string, Map<string, number>>>(new Map());
  const [editingQuantities, setEditingQuantities] = useState(false);
  const [quantityDrafts, setQuantityDrafts] = useState<PurchaseItemDraft[]>([]);

  async function saveQuantities(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await savePurchaseOrderItems(purchaseOrder, quantityDrafts);
      await invalidate([...queryKeys.purchaseOrders]);
      setEditingQuantities(false);
      onSaved();
      toast("PO products updated");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update products.");
    } finally {
      setSaving(false);
    }
  }

  async function patch(changes: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      await AetherClient.updatePurchaseOrder(purchaseOrder.id, changes);
      toast(`PO ${purchaseOrder.po_number} updated`);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function buildProductBudget(): Map<string, number> {
    if (dialogData?.type === "po-allocate") {
      const budget = new Map<string, number>();
      for (const b of dialogData.data.product_budget) {
        budget.set(b.product_id, b.total);
      }
      return budget;
    }
    const budget = new Map<string, number>();
    for (const item of purchaseOrder.items ?? []) {
      budget.set(item.product_id, (budget.get(item.product_id) ?? 0) + item.quantity_ordered);
    }
    return budget;
  }

  function computeMaxPerItem(targetSoId: string): Map<string, number> {
    if (dialogData?.type !== "po-allocate") return new Map();
    const remaining = buildProductBudget();
    for (const order of dialogData.data.shortfall_orders) {
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
    const targetOrder = dialogData.data.shortfall_orders.find((o) => o.sale_order_id === targetSoId);
    const maxMap = new Map<string, number>();
    for (const item of targetOrder?.items ?? []) {
      maxMap.set(item.sale_order_item_id, remaining.get(item.product_id) ?? 0);
    }
    return maxMap;
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

  function initEditsFromSuggestions(data: PoAllocationPreviewResponse) {
    const edits = new Map<string, Map<string, number>>();
    for (const order of data.shortfall_orders) {
      const items = new Map<string, number>();
      for (const item of order.items) {
        items.set(item.sale_order_item_id, item.suggested_quantity);
      }
      edits.set(order.sale_order_id, items);
    }
    return edits;
  }

  function resetToSuggested() {
    if (dialogData?.type !== "po-allocate") return;
    setAllocationEdits(initEditsFromSuggestions(dialogData.data));
  }

  async function completeReceive() {
    await AetherClient.receivePurchaseOrder(purchaseOrder.id);
    const allocations = await AetherClient.getCurrentPoAllocation(purchaseOrder.id);
    toast(`PO received — ${allocations.length} allocations found`);
    invalidate([...queryKeys.saleOrders]);
    invalidate([...queryKeys.purchaseOrders]);
    if (allocations.length) {
      setDialogData({ type: "receive", allocations, purchaseOrderId: purchaseOrder.id });
    } else {
      onSaved();
    }
  }

  async function handleStatusChange(status: string) {
    if (!canTransitionPurchaseOrder(purchaseOrder.status, status)) {
      setError(`Unsupported purchase-order transition: ${purchaseOrder.status} → ${status}`);
      return;
    }
    if (status === "cancelled") {
      setShowCancelConfirm(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const current = purchaseOrder.status;

      if (status === "confirmed" && current === "draft") {
        // draft → confirmed: status only
        await AetherClient.confirmPurchaseOrder(purchaseOrder.id);
        // Refresh the row after the status change.
        await invalidate([...queryKeys.purchaseOrders]);
        onSaved();
        toast("PO confirmed");
      } else if (status === "in transit") {
        // confirmed → in transit: create lots, post incoming ledger, preview allocation
        await AetherClient.shipPurchaseOrder(purchaseOrder.id);
        toast(`PO ${purchaseOrder.po_number} → in transit`);
        if (purchaseOrder.fulfillment_type === "warehouse") {
          try {
            onShippedPreview(await AetherClient.previewPoAllocation(purchaseOrder.id));
          } catch (previewError) {
            setError(previewError instanceof Error ? `PO shipped; allocation preview failed: ${previewError.message}` : "PO shipped; allocation preview failed");
          }
        }
        await invalidatePurchaseOrderInventoryEffects(invalidate);
        onSaved();
      } else if (status === "received") {
        // in transit → received
        await completeReceive();
      } else {
        throw new Error(`Unsupported purchase-order transition: ${current} → ${status}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmCancellation() {
    setSaving(true);
    setError(null);
    try {
      const result = await AetherClient.cancelPurchaseOrder(purchaseOrder.id);
      await invalidatePurchaseOrderInventoryEffects(invalidate);
      toast(result.already_cancelled ? `PO ${purchaseOrder.po_number} is already cancelled` : `PO ${purchaseOrder.po_number} cancelled; ${result.quantity_reversed} incoming units reversed`);
      setShowCancelConfirm(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel purchase order.");
      setShowCancelConfirm(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitAllocations() {
    if (dialogData?.type !== "po-allocate") return;
    const shortfallOrders = dialogData.data.shortfall_orders;
    setDialogData(null);
    for (const order of shortfallOrders) {
      const edits = allocationEdits.get(order.sale_order_id);
      const hasAllocation = edits && Array.from(edits.values()).some((v) => v > 0);
      if (!hasAllocation) continue;
      try {
        await AetherClient.allocateInventory({ sale_order_id: order.sale_order_id, mode: "auto" });
      } catch { /* non-blocking */ }
    }
    invalidate([...queryKeys.saleOrders]);
    invalidate([...queryKeys.purchaseOrders]);
    toast("Allocation complete");
    setAllocationEdits(new Map());
    onSaved();
  }

  function handleSkipAllocation() {
    setDialogData(null);
    setAllocationEdits(new Map());
    invalidate([...queryKeys.purchaseOrders]);
    onSaved();
  }

  const isDone = purchaseOrder.status === "received" || purchaseOrder.status === "cancelled";

  return (
    <>
      {showCancelConfirm && <ConfirmDialog
        title="Cancel this purchase order?"
        description="Any unreceived incoming quantity will be reversed and its active reservations released. Received inventory is preserved."
        confirmLabel="Cancel Purchase Order"
        variant="destructive"
        loading={saving}
        onConfirm={confirmCancellation}
        onCancel={() => setShowCancelConfirm(false)}
      />}
      <div className="grid gap-3 p-3 text-xs md:grid-cols-[minmax(16rem,1fr)_minmax(0,1.5fr)]">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-0.5 font-medium text-muted-foreground">
              Status
              <Select value={purchaseOrder.status} onChange={(e) => handleStatusChange(e.target.value)} disabled={saving || isDone} className={poSelectClass}>
                <option value={purchaseOrder.status}>{purchaseOrder.status}</option>
                {getPurchaseOrderTransitions(purchaseOrder.status).map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-0.5 font-medium text-muted-foreground">
              Fulfillment
              <Select defaultValue={purchaseOrder.fulfillment_type} onChange={(e) => patch({ fulfillment_type: e.target.value })} disabled={saving || isDone} className={poSelectClass}>
                <option value="warehouse">Warehouse</option>
                <option value="direct_delivery">Direct delivery</option>
              </Select>
            </label>
            <label className="grid gap-0.5 font-medium text-muted-foreground">
              Expected arrival
              <input type="date" defaultValue={purchaseOrder.expected_arrival ?? ""} onChange={(e) => patch({ expected_arrival: e.target.value || undefined })} disabled={saving || isDone} className={poInputClass} />
            </label>
            <label className="grid gap-0.5 font-medium text-muted-foreground">
              Notes
              <input defaultValue={purchaseOrder.notes ?? ""} onBlur={(e) => { if (e.target.value !== (purchaseOrder.notes ?? "")) patch({ notes: e.target.value || undefined }); }} disabled={saving || isDone} className={poInputClass} placeholder="—" />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Supplier: <Link href={`/suppliers/${purchaseOrder.supplier_id}`} className="text-primary hover:underline">{purchaseOrder.supplier?.name ?? "—"}</Link>
          </p>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="overflow-x-auto rounded-md border border-border bg-card">
          {(purchaseOrder.status === "draft" || purchaseOrder.status === "confirmed") && (
            <div className="flex justify-end border-b border-border px-3 py-2">
              <button type="button" onClick={() => { setQuantityDrafts(itemDraftsFromOrder(purchaseOrder)); setError(null); setEditingQuantities(true); }} className="text-xs font-medium text-primary hover:underline">Edit products</button>
            </div>
          )}
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3 py-1.5 font-medium">Product</th>
                <th className="px-3 py-1.5 text-right font-medium">Qty</th>
                <th className="px-3 py-1.5 text-right font-medium">Landed Total Cost (AUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(purchaseOrder.items ?? []).map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-1.5">{item.product?.name ?? "—"}</td>
                  <td className="px-3 py-1.5 text-right">{item.quantity_ordered}</td>
                  <td className="px-3 py-1.5 text-right">${(item.quantity_ordered * (item.landed_unit_cost ?? (item.unit_cost + (item.shipping_cost ?? 0) / item.quantity_ordered))).toFixed(2)}</td>
                </tr>
              ))}
              {(purchaseOrder.items ?? []).length === 0 && (
                <tr><td colSpan={3} className="px-3 py-3 text-center text-muted-foreground">No items</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingQuantities && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="presentation">
          <form onSubmit={saveQuantities} className="max-h-[75vh] w-full max-w-[36.8rem] overflow-y-auto rounded-lg border border-border bg-card p-5 shadow-xl" role="dialog" aria-modal="true" aria-label="Edit PO products">
            <PurchaseOrderQuantityFields order={purchaseOrder} drafts={quantityDrafts} onChange={setQuantityDrafts} disabled={saving} />
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setEditingQuantities(false); setError(null); }} disabled={saving} className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>, document.body
      )}

      {dialogData?.type === "po-allocate" && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground">Allocation Preview</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Review allocations before confirming. Edit quantities if needed.</p>
            </div>
            <div className="border-b border-border px-5 py-2 bg-muted/30">
              <div className="flex flex-wrap gap-4">
                {dialogData.data.product_budget.map((b) => {
                  let used = 0;
                  for (const order of dialogData.data.shortfall_orders) {
                    const soEdits = allocationEdits.get(order.sale_order_id);
                    if (!soEdits) continue;
                    for (const item of order.items) {
                      if (item.product_id === b.product_id) used += soEdits.get(item.sale_order_item_id) ?? 0;
                    }
                  }
                  return (
                    <div key={b.product_id} className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">{b.product_name}:</span>
                      <span className={`font-semibold tabular-nums ${used > b.total ? "text-destructive" : used === b.total ? "text-primary" : ""}`}>{used}</span>
                      <span className="text-muted-foreground/60">/</span>
                      <span className="tabular-nums">{b.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-[60vh] overflow-y-auto px-5 py-3 space-y-3">
              {dialogData.data.current_orders.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Allocations</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  {dialogData.data.current_orders.map((order) => (
                    <div key={order.sale_order_id} className="rounded-lg border border-border overflow-hidden opacity-75">
                      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
                        <span className="text-xs font-semibold text-primary">{order.so_number}</span>
                        <StatusBadge status={order.so_status} />
                        {order.customer_name && <span className="text-xs text-muted-foreground">{order.customer_name}</span>}
                      </div>
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-border text-xs text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2 font-medium">Product</th>
                            <th className="px-4 py-2 text-right font-medium">Ordered</th>
                            <th className="px-4 py-2 text-right font-medium">Allocated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {order.items.map((item) => (
                            <tr key={item.product_id}>
                              <td className="px-4 py-2 font-medium">{item.product_name}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{item.quantity_ordered}</td>
                              <td className="px-4 py-2 text-right tabular-nums font-medium">{item.quantity_allocated}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shortfall Orders</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                </>
              )}

              {dialogData.data.shortfall_orders.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No orders with shortfalls for the products on this purchase order.</p>
              ) : (
                dialogData.data.shortfall_orders.map((order) => (
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
              <button type="button" onClick={handleSkipAllocation} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Skip Allocation
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={resetToSuggested} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                  Reset to Suggested
                </button>
                <button type="button" onClick={handleSubmitAllocations} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  Accept &amp; Allocate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {dialogData?.type === "receive" && (
        <PoAllocationDialog
          allocations={dialogData.allocations}
          onConfirm={async () => {
            await AetherClient.receivePurchaseOrder(purchaseOrder.id);
            toast(`PO ${purchaseOrder.po_number} received`);
            invalidate([...queryKeys.purchaseOrders]);
            invalidate([...queryKeys.saleOrders]);
            setDialogData(null);
            onSaved();
          }}
          onReallocate={async () => {
            const previewResult = await AetherClient.previewPoAllocation(purchaseOrder.id);
            setAllocationEdits(initEditsFromSuggestions(previewResult));
            setDialogData({ type: "po-allocate", data: previewResult });
          }}
          onClose={() => { setDialogData(null); onSaved(); }}
        />
      )}
    </>
  );
}

function PurchaseOrderItems({ purchaseOrder, onUpdated }: PurchaseOrderItemsProps) {
  const { toast } = useToast();
  const [order, setOrder] = useState(purchaseOrder);
  const [drafts, setDrafts] = useState<PurchaseItemDraft[]>(() => itemDraftsFromOrder(purchaseOrder));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canEdit = order.status === "draft" || order.status === "confirmed";

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await savePurchaseOrderItems(order, drafts);
      if (updated) setOrder(updated);
      setEditing(false);
      onUpdated();
      toast("PO products updated");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Failed to update products.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">Items</h3>
        {canEdit && !editing && <button type="button" onClick={() => { setDrafts(itemDraftsFromOrder(order)); setError(null); setEditing(true); }} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Edit products</button>}
      </div>
      {editing ? (
        <form onSubmit={save} className="space-y-3">
          <PurchaseOrderQuantityFields order={order} drafts={drafts} onChange={setDrafts} disabled={saving} />
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setEditing(false); setError(null); }} disabled={saving} className="rounded-md border border-border px-3 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={saving || !purchaseItemsChanged(order, drafts)} className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50">{saving ? "Saving…" : "Save products"}</button>
          </div>
        </form>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-muted text-muted-foreground"><tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 text-right font-medium">Unit Cost (AUD)</th>
              <th className="px-3 py-2 text-right font-medium">Shipping (AUD)</th>
              <th className="px-3 py-2 text-right font-medium">Qty Ordered</th>
              <th className="px-3 py-2 text-right font-medium">Qty Received</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {(order.items ?? []).map((item) => <tr key={item.id}>
                <td className="px-3 py-2">{item.product?.name ?? "—"}</td>
                <td className="px-3 py-2">{item.product?.category ?? "—"}</td>
                <td className="px-3 py-2 text-right">${item.unit_cost.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">${Number(item.shipping_cost ?? 0).toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{item.quantity_ordered}</td>
                <td className="px-3 py-2 text-right">{item.quantity_received}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

interface ProcurementTableProps {
  detailsRowId?: string;
}

export default function ProcurementTable({ detailsRowId }: ProcurementTableProps) {
  const { data, loading, error, refetch } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());
  const { data: saleOrders, refetch: refetchSaleOrders } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [parentDialogData, setParentDialogData] = useState<DialogData | null>(null);
  const [parentAllocationEdits, setParentAllocationEdits] = useState<Map<string, Map<string, number>>>(new Map());
  const [quantityDrafts, setQuantityDrafts] = useState<PurchaseItemDraft[]>([]);

  function openShippedPreview(preview: PoAllocationPreviewResponse) {
    const edits = new Map<string, Map<string, number>>();
    for (const order of preview.shortfall_orders) {
      edits.set(order.sale_order_id, new Map(order.items.map((item) => [item.sale_order_item_id, item.suggested_quantity])));
    }
    setParentAllocationEdits(edits);
    setParentDialogData({ type: "po-allocate", data: preview });
  }

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.po_number.toLowerCase().includes(q) ||
          (r.supplier?.name ?? "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
    if (typeFilter) rows = rows.filter((r) => r.fulfillment_type === typeFilter);
    return rows;
  }, [data, search, statusFilter, typeFilter]);

  const allColumns: ColDef<PurchaseOrder>[] = useMemo(
    () => [
      {
        field: "po_number",
        headerName: "PO #",
        minWidth: 130,
        cellRenderer: (params: { value: string; data?: PurchaseOrder }) => params.data ? (
          <Link href={`/orders/procurement/${params.data.id}`} className="font-medium text-primary hover:underline">{params.value}</Link>
        ) : params.value,
      },
      {
        headerName: "Supplier",
        valueGetter: (p) => p.data?.supplier?.name ?? "—",
        minWidth: 180,
      },
      { field: "order_date", headerName: "Order Date", sort: "desc", minWidth: 110 },
      {
        field: "status",
        headerName: "Status",
        minWidth: 120,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      { field: "fulfillment_type", headerName: "Type", minWidth: 130 },
      { field: "shipped_date", headerName: "Shipped", minWidth: 110 },
      { field: "expected_arrival", headerName: "Expected", minWidth: 110 },
      { field: "received_date", headerName: "Received", minWidth: 110 },
      {
        headerName: "Items",
        valueGetter: (p) => (p.data?.items ?? []).length,
        minWidth: 80,
      },
      {
        headerName: "Total Cost",
        minWidth: 120,
        valueGetter: (p) => `$${(p.data?.order_total ?? 0).toFixed(2)}`,
      },
      {
        headerName: "Created By",
        valueGetter: (p) => p.data?.created_by_profile?.name ?? "—",
        minWidth: 120,
      },
    ],
    []
  ); 

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(allColumns,
    new Set(["Supplier", "received_date", "shipped_date", "expected_arrival", "Created By"])
  );

  if (error) {
    return <ErrorBlock message={`Failed to load purchase orders: ${error}`} onRetry={refetch} />;
  }

  return (<>
    <OrderScreenLayout
      title="Purchase Orders"
      subtitle="Manage supplier procurement and receiving"
      overview={<ProcurementOverviewCards orders={filtered} loading={loading} error={error} />}
      filters={<SearchFilterBar
        searchPlaceholder="Search POs, suppliers..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { label: "Draft", value: "draft" },
              { label: "Confirmed", value: "confirmed" },
              { label: "In Transit", value: "in transit" },
              { label: "Received", value: "received" },
              { label: "Cancelled", value: "cancelled" },
            ],
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            key: "type",
            label: "All",
            options: [
              { label: "Warehouse", value: "warehouse" },
              { label: "Direct Delivery", value: "direct_delivery" },
            ],
            value: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
        trailing={<div className="flex items-center gap-2"><button type="button" onClick={() => setIsCreating(true)} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90">Add Purchase Order</button><ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} /></div>}
      />}
      table={<DataGrid<PurchaseOrder>
        rows={filtered}
        columns={visibleColumns}
        loading={loading}
        pageSize={25}
        detailsTitle="PO Details"
        detailsRowId={detailsRowId}
        showDetailsMenu
        detailsPageHref={(purchaseOrder) => `/orders/procurement/${purchaseOrder.id}`}
        expandOnRowDoubleClick
        expandedRowHeight={260}
        getExpandedDetailsTitle={(purchaseOrder) => `${purchaseOrder.po_number} Details`}
        renderExpandedRowDetails={(purchaseOrder) => <InlinePurchaseOrderEditor purchaseOrder={purchaseOrder} onSaved={refetch} onShippedPreview={openShippedPreview} />}
        editConfig={{
          onOpen: (purchaseOrder) => setQuantityDrafts(itemDraftsFromOrder(purchaseOrder)),
          renderExtraFields: (purchaseOrder) => (
            <PurchaseOrderQuantityFields order={purchaseOrder} drafts={quantityDrafts} onChange={setQuantityDrafts} />
          ),
          hasExtraChanges: (purchaseOrder) => (purchaseOrder.status === "draft" || purchaseOrder.status === "confirmed") &&
            purchaseItemsChanged(purchaseOrder, quantityDrafts),
          fields: [
            {
              key: "status",
              label: "Status",
              type: "status",
              options: (order) => [order.status, ...getPurchaseOrderTransitions(order.status)].map((status) => ({
                label: status === "in transit" ? "In Transit" : status.charAt(0).toUpperCase() + status.slice(1),
                value: status,
              })),
            },
            {
              key: "fulfillment_type",
              label: "Fulfillment",
              type: "select",
              options: [
                { label: "Warehouse", value: "warehouse" },
                { label: "Direct Delivery", value: "direct_delivery" },
              ],
            },
            { key: "shipped_date", label: "Shipped Date", type: "date" },
            { key: "expected_arrival", label: "Expected Arrival", type: "date" },
            { key: "received_date", label: "Received Date", type: "date" },
            { key: "notes", label: "Notes", type: "textarea" },
          ],
          onSave: async (purchaseOrder, changes) => {
            const { status, ...otherChanges } = changes;
            if (typeof status === "string") {
              if (!canTransitionPurchaseOrder(purchaseOrder.status, status)) {
                throw new Error(`Unsupported purchase-order transition: ${purchaseOrder.status} → ${status}`);
              }
              if (status === "cancelled" && !window.confirm(`Cancel PO ${purchaseOrder.po_number}? This will reverse incoming quantities.`)) {
                throw new Error("Status change cancelled.");
              }
            }
            await savePurchaseOrderItems(purchaseOrder, quantityDrafts);
            if (Object.keys(otherChanges).length) await AetherClient.updatePurchaseOrder(purchaseOrder.id, otherChanges);
            if (typeof status === "string") {
              if (status === "cancelled") {
                const result = await AetherClient.cancelPurchaseOrder(purchaseOrder.id);
                await invalidatePurchaseOrderInventoryEffects(invalidate);
                toast(result.already_cancelled ? `PO ${purchaseOrder.po_number} is already cancelled` : `PO ${purchaseOrder.po_number} cancelled; ${result.quantity_reversed} incoming units reversed`);
              } else if (status === "confirmed") {
                await AetherClient.confirmPurchaseOrder(purchaseOrder.id);
                await invalidate([...queryKeys.purchaseOrders]);
                refetch();
                toast("PO confirmed");
              } else if (status === "in transit") {
                await AetherClient.shipPurchaseOrder(purchaseOrder.id);
                await invalidatePurchaseOrderInventoryEffects(invalidate);
                toast(`PO ${purchaseOrder.po_number} → in transit`);
                if (purchaseOrder.fulfillment_type === "warehouse") {
                  try {
                    openShippedPreview(await AetherClient.previewPoAllocation(purchaseOrder.id));
                  } catch (error) {
                    toast(error instanceof Error ? `PO shipped; allocation preview failed: ${error.message}` : "PO shipped; allocation preview failed");
                  }
                }
              } else if (status === "received") {
                await AetherClient.receivePurchaseOrder(purchaseOrder.id);
                const allocations = await AetherClient.getCurrentPoAllocation(purchaseOrder.id);
                await invalidatePurchaseOrderInventoryEffects(invalidate);
                toast(`PO ${purchaseOrder.po_number} received — ${allocations.length} allocations found`);
                if (allocations.length) setParentDialogData({ type: "receive", allocations, purchaseOrderId: purchaseOrder.id });
              }
            }
            await invalidate([...queryKeys.saleOrders]);
            refetch();
          },
        }}
        renderRowDetails={(purchaseOrder) => (
          <div className="space-y-6 p-5">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">PO #</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.po_number}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Supplier</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.supplier?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="mt-1 text-sm capitalize text-foreground">{purchaseOrder.status}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Fulfillment</dt>
                <dd className="mt-1 text-sm capitalize text-foreground">{purchaseOrder.fulfillment_type.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Order Date</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.order_date}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Expected Arrival</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.expected_arrival ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Shipped Date</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.shipped_date ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Received Date</dt>
                <dd className="mt-1 text-sm text-foreground">{purchaseOrder.received_date ?? "—"}</dd>
              </div>
              {purchaseOrder.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{purchaseOrder.notes}</dd>
                </div>
              )}
            </dl>

            <PurchaseOrderItems
              key={purchaseOrder.id}
              purchaseOrder={purchaseOrder}
              onUpdated={refetch}
            />

            <LinkedSaleOrdersEditor
              purchaseOrderId={purchaseOrder.id}
              saleOrders={saleOrders ?? []}
              onUpdated={refetchSaleOrders}
            />

            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Additional Fields</h3>
              <dl className="divide-y divide-border rounded-md border border-border">
                {Object.entries(purchaseOrder)
                  .filter(([field]) => ![
                    "po_number",
                    "supplier",
                    "status",
                    "fulfillment_type",
                    "order_date",
                    "shipped_date",
                    "expected_arrival",
                    "received_date",
                    "notes",
                    "items",
                  ].includes(field))
                  .map(([field, value]) => (
                  <div key={field} className="grid gap-1 px-3 py-2 sm:grid-cols-[10rem_1fr] sm:gap-4">
                    <dt className="text-sm font-medium text-muted-foreground">
                      {field.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
                    </dt>
                    <dd className="min-w-0 whitespace-pre-wrap break-words text-sm text-foreground">
                      {value == null || value === "" ? "—" : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                    </dd>
                  </div>
                  ))}
              </dl>
            </div>
          </div>
        )}
      />}
      dialog={isCreating ? <CreatePurchaseOrderDialog onClose={() => setIsCreating(false)} onCreated={() => { toast("Purchase order created"); refetch(); }} /> : undefined}
    />

    {parentDialogData?.type === "po-allocate" && (() => {
      const allocateData = parentDialogData.data;
      function parentBuildBudget(): Map<string, number> {
        const budget = new Map<string, number>();
        for (const b of allocateData.product_budget) {
          budget.set(b.product_id, b.total);
        }
        return budget;
      }
      function parentComputeMax(targetSoId: string): Map<string, number> {
        const remaining = parentBuildBudget();
        for (const order of allocateData.shortfall_orders) {
          if (order.sale_order_id === targetSoId) continue;
          const soEdits = parentAllocationEdits.get(order.sale_order_id);
          if (!soEdits) continue;
          for (const item of order.items) {
            const qty = soEdits.get(item.sale_order_item_id) ?? 0;
            if (qty > 0) {
              const cur = remaining.get(item.product_id) ?? 0;
              remaining.set(item.product_id, Math.max(0, cur - qty));
            }
          }
        }
        const targetOrder = allocateData.shortfall_orders.find((o) => o.sale_order_id === targetSoId);
        const maxMap = new Map<string, number>();
        for (const item of targetOrder?.items ?? []) {
          maxMap.set(item.sale_order_item_id, remaining.get(item.product_id) ?? 0);
        }
        return maxMap;
      }
      return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16">
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold text-foreground">Allocation Preview</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Review allocations before confirming. Edit quantities if needed.</p>
            </div>
            <div className="border-b border-border px-5 py-2 bg-muted/30">
              <div className="flex flex-wrap gap-4">
                {allocateData.product_budget.map((b) => {
                  let used = 0;
                  for (const order of allocateData.shortfall_orders) {
                    const soEdits = parentAllocationEdits.get(order.sale_order_id);
                    if (!soEdits) continue;
                    for (const item of order.items) {
                      if (item.product_id === b.product_id) used += soEdits.get(item.sale_order_item_id) ?? 0;
                    }
                  }
                  return (
                    <div key={b.product_id} className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">{b.product_name}:</span>
                      <span className={`font-semibold tabular-nums ${used > b.total ? "text-destructive" : used === b.total ? "text-primary" : ""}`}>{used}</span>
                      <span className="text-muted-foreground/60">/</span>
                      <span className="tabular-nums">{b.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="h-[60vh] overflow-y-auto px-5 py-3 space-y-3">
              {allocateData.current_orders.length > 0 && (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current Allocations</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  {allocateData.current_orders.map((order) => (
                    <div key={order.sale_order_id} className="rounded-lg border border-border overflow-hidden opacity-75">
                      <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2">
                        <span className="text-xs font-semibold text-primary">{order.so_number}</span>
                        <StatusBadge status={order.so_status} />
                        {order.customer_name && <span className="text-xs text-muted-foreground">{order.customer_name}</span>}
                      </div>
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-border text-xs text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2 font-medium">Product</th>
                            <th className="px-4 py-2 text-right font-medium">Ordered</th>
                            <th className="px-4 py-2 text-right font-medium">Allocated</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {order.items.map((item) => (
                            <tr key={item.product_id}>
                              <td className="px-4 py-2 font-medium">{item.product_name}</td>
                              <td className="px-4 py-2 text-right tabular-nums">{item.quantity_ordered}</td>
                              <td className="px-4 py-2 text-right tabular-nums font-medium">{item.quantity_allocated}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shortfall Orders</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                </>
              )}

              {allocateData.shortfall_orders.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">No orders with shortfalls for the products on this purchase order.</p>
              ) : (
                allocateData.shortfall_orders.map((order) => (
                  <SoAllocationCard
                    key={order.sale_order_id}
                    soNumber={order.so_number}
                    soStatus={order.so_status}
                    customerName={order.customer_name}
                    priorityPoints={order.priority_points}
                    items={order.items}
                    allocations={parentAllocationEdits.get(order.sale_order_id) ?? new Map()}
                    onAllocationChange={(soItemId, value) => {
                      setParentAllocationEdits((prev) => {
                        const next = new Map(prev);
                        const items = new Map(next.get(order.sale_order_id) ?? new Map());
                        items.set(soItemId, value);
                        next.set(order.sale_order_id, items);
                        return next;
                      });
                    }}
                    maxPerItem={parentComputeMax(order.sale_order_id)}
                  />
                ))
              )}
            </div>
            <div className="flex justify-between border-t border-border px-5 py-3">
              <button type="button" onClick={() => { setParentDialogData(null); setParentAllocationEdits(new Map()); refetch(); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Skip Allocation
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => {
                  const edits = new Map<string, Map<string, number>>();
                  for (const order of allocateData.shortfall_orders) {
                    const items = new Map<string, number>();
                    for (const item of order.items) {
                      items.set(item.sale_order_item_id, item.suggested_quantity);
                    }
                    edits.set(order.sale_order_id, items);
                  }
                  setParentAllocationEdits(edits);
                }} className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
                  Reset to Suggested
                </button>
                <button type="button" onClick={async () => {
                  const shortfallOrders = allocateData.shortfall_orders;
                  setParentDialogData(null);
                  for (const order of shortfallOrders) {
                    const edits = parentAllocationEdits.get(order.sale_order_id);
                    const hasAllocation = edits && Array.from(edits.values()).some((v) => v > 0);
                    if (!hasAllocation) continue;
                    try {
                      await AetherClient.allocateInventory({ sale_order_id: order.sale_order_id, mode: "auto" });
                    } catch {}
                  }
                  invalidate([...queryKeys.saleOrders]);
                  invalidate([...queryKeys.purchaseOrders]);
                  toast("Allocation complete");
                  setParentAllocationEdits(new Map());
                  refetch();
                }} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                  Accept &amp; Allocate
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    })()}
    {parentDialogData?.type === "receive" && (
      <PoAllocationDialog
        allocations={parentDialogData.allocations}
        onConfirm={async () => {
          await AetherClient.receivePurchaseOrder(parentDialogData.purchaseOrderId);
          toast(`PO received`);
          invalidate([...queryKeys.purchaseOrders]);
          invalidate([...queryKeys.saleOrders]);
          setParentDialogData(null);
          refetch();
        }}
        onReallocate={async () => {
          const previewResult = await AetherClient.previewPoAllocation(parentDialogData.purchaseOrderId);
          const edits = new Map<string, Map<string, number>>();
          for (const order of previewResult.shortfall_orders) {
            const items = new Map<string, number>();
            for (const item of order.items) {
              items.set(item.sale_order_item_id, item.suggested_quantity);
            }
            edits.set(order.sale_order_id, items);
          }
          setParentAllocationEdits(edits);
          setParentDialogData({ type: "po-allocate", data: previewResult });
        }}
        onClose={() => { setParentDialogData(null); refetch(); }}
      />
    )}
  </>);
}
