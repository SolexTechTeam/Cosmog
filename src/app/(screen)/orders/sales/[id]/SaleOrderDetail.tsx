"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi, queryKeys } from "@/hooks/useApi";
import { useLookup } from "@/hooks/useLookup";
import { AetherClient } from "@/lib/aether-client";
import { allocationLabel, isActiveSaleOrderStatus } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import StatusBadge from "@/components/common/StatusBadge";
import OrderDetailLayout from "@/components/common/orders/OrderDetailLayout";
import OrderStatusWidget from "@/components/common/orders/OrderStatusWidget";
import SidebarCard from "@/components/common/orders/SidebarCard";
import CreatePurchaseOrderDialog from "@/components/common/orders/CreatePurchaseOrderDialog";
import type { Profile, PurchaseOrder, SaleOrder } from "@/types";

interface SaleOrderDetailProps {
  saleOrderId: string;
}

const inputClass = "h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-normal outline-none focus:ring-1 focus:ring-ring";

type Tab = "items" | "details" | "notes";

export default function SaleOrderDetail({ saleOrderId }: SaleOrderDetailProps) {
  const { toast } = useToast();
  const { data: orders, loading, error, refetch } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());
  const { data: profiles } = useApi<Profile[]>([...queryKeys.profiles], () => AetherClient.getProfiles());
  const { data: purchaseOrders } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());
  const { options: priorityOptions } = useLookup("so_priority");
  const { options: fulfillmentOptions } = useLookup("so_fulfillment_type");

  const saleOrder = orders?.find((order) => order.id === saleOrderId);
  const isActive = isActiveSaleOrderStatus(saleOrder?.status ?? "");
  const procurementStatus = saleOrder ? allocationLabel(saleOrder.allocation_status) : undefined;

  const [activeTab, setActiveTab] = useState<Tab>("items");
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [poSearch, setPoSearch] = useState("");
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [showCreatePo, setShowCreatePo] = useState(false);

  if (loading) return <p className="text-sm text-muted-foreground">Loading sales order...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load sales order: {error}</p>;
  if (!saleOrder) return <p className="text-sm text-muted-foreground">Sales order not found.</p>;

  const poLinks = saleOrder.po_links ?? [];
  const items = saleOrder.items ?? [];
  const itemTotal = items.reduce((total, item) => total + item.quantity * item.unit_price, 0);
  const orderTotal = itemTotal + saleOrder.shipping_cost;
  const balance = orderTotal - saleOrder.amount_paid;
  const activeProfiles = (profiles ?? []).filter((p) => p.is_active);
  const canEdit = saleOrder.status === "open";
  const so = saleOrder;

  function startEditing() {
    setEditValues({
      priority: so.priority, owner_id: so.owner_id ?? "", fulfillment_type: so.fulfillment_type,
      payment_status: so.payment_status, shipping_cost: String(so.shipping_cost), amount_paid: String(so.amount_paid),
      shipped_date: so.shipped_date ?? "", delivered_date: so.delivered_date ?? "",
      tracking_reference: so.tracking_reference ?? "", shipping_details: so.shipping_details ?? "", notes: so.notes ?? "",
    });
    setEditError(null);
    setEditing(true);
    setActiveTab("details");
  }

  async function saveEdits() {
    setSaving(true); setEditError(null);
    try {
      const payload: Record<string, unknown> = {
        priority: editValues.priority, fulfillment_type: editValues.fulfillment_type,
        payment_status: editValues.payment_status, shipping_cost: Number(editValues.shipping_cost) || 0,
        amount_paid: Number(editValues.amount_paid) || 0,
      };
      if (editValues.owner_id) payload.owner_id = editValues.owner_id;
      if (editValues.shipped_date) payload.shipped_date = editValues.shipped_date;
      if (editValues.delivered_date) payload.delivered_date = editValues.delivered_date;
      if (editValues.tracking_reference) payload.tracking_reference = editValues.tracking_reference;
      if (editValues.shipping_details) payload.shipping_details = editValues.shipping_details;
      if (editValues.notes) payload.notes = editValues.notes;
      await AetherClient.updateSaleOrder(so.id, payload);
      setEditing(false); toast(`${so.so_number} updated`); refetch();
    } catch (e) { setEditError(e instanceof Error ? e.message : "Failed to save."); }
    finally { setSaving(false); }
  }

  async function inlinePatch(changes: Record<string, unknown>) {
    setInlineError(null);
    try { await AetherClient.updateSaleOrder(so.id, changes); toast(`${so.so_number} updated`); refetch(); }
    catch (e) { setInlineError(e instanceof Error ? e.message : "Failed to save."); }
  }

  async function linkPo(poId: string) {
    setInlineError(null);
    try { await AetherClient.linkPurchaseOrder(so.id, poId); toast("Purchase order linked"); refetch(); }
    catch (e) { setInlineError(e instanceof Error ? e.message : "Failed to link PO."); }
  }

  async function unlinkPo(poId: string) {
    setInlineError(null);
    try { await AetherClient.unlinkPurchaseOrder(so.id, poId); toast("Purchase order unlinked"); refetch(); }
    catch (e) { setInlineError(e instanceof Error ? e.message : "Failed to unlink PO."); }
  }

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: "items", label: `Items (${items.length})` },
    { key: "details", label: "Details" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <OrderDetailLayout
      backHref="/orders/sales"
      backLabel="Sales Orders"
      orderNumber={saleOrder.so_number}
      subtitle={<>
        <Link href={`/customers/${saleOrder.customer_id}`} className="text-primary hover:underline">{saleOrder.customer?.name ?? "Unknown"}</Link>
        <span className="text-muted-foreground/50"> · </span>{saleOrder.order_date}
      </>}
      statusWidget={
        <OrderStatusWidget
          status={saleOrder.status}
          isComplete={saleOrder.status === "completed"}
          options={[
            { label: "Open", value: "open" }, { label: "Shipped", value: "shipped" },
            { label: "Completed", value: "completed" }, { label: "Cancelled", value: "cancelled" },
            { label: "Returned", value: "returned" },
          ]}
          onUpdate={async (status) => {
            if (status === "completed" && items.some((item) => !item.unit_price || item.unit_price <= 0))
              throw new Error("All items must have a sale price before completing.");
            if (status === "shipped") await AetherClient.fulfillSaleOrder(saleOrder.id);
            else if (status === "cancelled") await AetherClient.releaseSaleOrder(saleOrder.id);
            else if (status === "returned") await AetherClient.returnSaleOrder(saleOrder.id);
            else await AetherClient.updateSaleOrder(saleOrder.id, { status });
            toast(`${saleOrder.so_number} → ${status}`); refetch();
          }}
        />
      }

      mainContent={<>
        <div className="flex items-center border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-auto">
            {canEdit && !editing && (
              <button type="button" onClick={startEditing} className="text-xs font-medium text-primary hover:underline">Edit order</button>
            )}
          </div>
        </div>

        {activeTab === "items" && (
          <section className="flex flex-col rounded-lg border border-border bg-card overflow-hidden min-h-[300px]">
            <div className="flex-1 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="border-b border-border bg-muted text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Product</th>
                    <th className="px-4 py-2 text-right font-medium">Qty</th>
                    <th className="px-4 py-2 text-right font-medium">Unit Price</th>
                    <th className="px-4 py-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-2.5">
                        <Link href={`/inventory/${item.product_id}`} className="font-medium text-primary hover:underline">{item.product?.name ?? item.product_id}</Link>
                        {item.product?.category && <span className="ml-2 text-xs text-muted-foreground">{item.product.category}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">${item.unit_price.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-medium">${(item.quantity * item.unit_price).toFixed(2)}</td>
                    </tr>
                  ))}
                  {items.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No items</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-auto border-t border-border bg-muted/30 px-4 py-2">
              <dl className="ml-auto w-56 space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Subtotal</dt><dd className="tabular-nums font-medium">${itemTotal.toFixed(2)}</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">GST</dt><dd className="tabular-nums">$0.00</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Tax</dt><dd className="tabular-nums">$0.00</dd></div>
                <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Shipping</dt><dd className="tabular-nums">${saleOrder.shipping_cost.toFixed(2)}</dd></div>
                <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                  <dt className="text-xs font-bold text-foreground">Total</dt>
                  <dd className="tabular-nums text-base font-bold text-primary">${orderTotal.toFixed(2)}</dd>
                </div>
              </dl>
            </div>
          </section>
        )}

        {activeTab === "details" && (
          editing ? (
            <section className="rounded-lg border border-primary/20 bg-muted p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/70">Editing</h2>
                <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Priority
                  <select value={editValues.priority} onChange={(e) => setEditValues((v) => ({ ...v, priority: e.target.value }))} className={inputClass}>
                    {(priorityOptions.length ? priorityOptions : [{ label: "Low", value: "low" }, { label: "Normal", value: "normal" }, { label: "High", value: "high" }, { label: "Urgent", value: "urgent" }]).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Owner
                  <select value={editValues.owner_id} onChange={(e) => setEditValues((v) => ({ ...v, owner_id: e.target.value }))} className={inputClass}>
                    <option value="">Unassigned</option>
                    {activeProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Fulfillment
                  <select value={editValues.fulfillment_type} onChange={(e) => setEditValues((v) => ({ ...v, fulfillment_type: e.target.value }))} className={inputClass}>
                    {(fulfillmentOptions.length ? fulfillmentOptions : [{ label: "Shipping", value: "shipping" }]).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Payment
                  <select value={editValues.payment_status} onChange={(e) => setEditValues((v) => ({ ...v, payment_status: e.target.value }))} className={inputClass}>
                    <option value="not_requested">Not requested</option><option value="awaiting_payment">Awaiting payment</option>
                    <option value="part_paid">Part paid</option><option value="paid">Paid</option>
                    <option value="refunded">Refunded</option><option value="cancelled">Cancelled</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Shipping cost
                  <input type="number" min="0" step="0.01" value={editValues.shipping_cost} onChange={(e) => setEditValues((v) => ({ ...v, shipping_cost: e.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Amount paid
                  <input type="number" min="0" step="0.01" value={editValues.amount_paid} onChange={(e) => setEditValues((v) => ({ ...v, amount_paid: e.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Shipped
                  <input type="date" value={editValues.shipped_date} onChange={(e) => setEditValues((v) => ({ ...v, shipped_date: e.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Delivered
                  <input type="date" value={editValues.delivered_date} onChange={(e) => setEditValues((v) => ({ ...v, delivered_date: e.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Tracking
                  <input value={editValues.tracking_reference} onChange={(e) => setEditValues((v) => ({ ...v, tracking_reference: e.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-3">Shipping details
                  <textarea value={editValues.shipping_details} onChange={(e) => setEditValues((v) => ({ ...v, shipping_details: e.target.value }))} rows={2} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm font-normal outline-none focus:ring-1 focus:ring-ring" />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground sm:col-span-3">Notes
                  <textarea value={editValues.notes} onChange={(e) => setEditValues((v) => ({ ...v, notes: e.target.value }))} rows={2} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm font-normal outline-none focus:ring-1 focus:ring-ring" />
                </label>
              </div>
              {editError && <p className="mt-2 text-xs text-destructive">{editError}</p>}
              <div className="mt-3">
                <button type="button" onClick={saveEdits} disabled={saving} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{saving ? "Saving..." : "Save changes"}</button>
              </div>
            </section>
          ) : (
            <section className="rounded-lg border border-border bg-card p-4">
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Owner</p><p className="text-sm font-medium">{saleOrder.owner_name ?? "Unassigned"}</p></div>
                <div><p className="text-xs text-muted-foreground">Priority</p><div className="mt-0.5"><StatusBadge status={saleOrder.priority} /></div></div>
                <div><p className="text-xs text-muted-foreground">Procurement</p><div className="mt-0.5">{isActive && procurementStatus ? <StatusBadge status={procurementStatus} /> : <span className="text-sm text-muted-foreground">—</span>}</div></div>
                <div><p className="text-xs text-muted-foreground">Fulfillment</p><p className="text-sm font-medium capitalize">{saleOrder.fulfillment_type.replace(/_/g, " ")}</p></div>
                <div><p className="text-xs text-muted-foreground">Business Channel</p><p className="text-sm font-medium capitalize">{saleOrder.business_channel?.replace(/_/g, " ") || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Source</p><p className="text-sm font-medium">{saleOrder.source || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Order Date</p><p className="text-sm font-medium tabular-nums">{saleOrder.order_date}</p></div>
                <div><p className="text-xs text-muted-foreground">Shipped Date</p><p className="text-sm font-medium tabular-nums">{saleOrder.shipped_date || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Delivered Date</p><p className="text-sm font-medium tabular-nums">{saleOrder.delivered_date || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Tracking Reference</p><p className="text-sm font-medium font-mono">{saleOrder.tracking_reference || "—"}</p></div>
                <div><p className="text-xs text-muted-foreground">Shipping Cost</p><p className="text-sm font-medium tabular-nums">{fmt(saleOrder.shipping_cost)}</p></div>
                <div><p className="text-xs text-muted-foreground">Amount Paid</p><p className="text-sm font-medium tabular-nums">{fmt(saleOrder.amount_paid)}</p></div>
                <div><p className="text-xs text-muted-foreground">Balance</p><p className={`text-sm font-semibold tabular-nums ${balance > 0 ? "text-primary" : "text-emerald-600"}`}>{fmt(balance)}</p></div>
                <div><p className="text-xs text-muted-foreground">Created</p><p className="text-sm font-medium tabular-nums">{saleOrder.created_at?.slice(0, 10)}</p></div>
                <div><p className="text-xs text-muted-foreground">Updated</p><p className="text-sm font-medium tabular-nums">{saleOrder.updated_at?.slice(0, 10)}</p></div>
              </div>
              {saleOrder.shipping_details && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-xs text-muted-foreground">Shipping Details</p>
                  <p className="mt-0.5 text-sm whitespace-pre-wrap">{saleOrder.shipping_details}</p>
                </div>
              )}
            </section>
          )
        )}

        {activeTab === "notes" && (
          <section className="rounded-lg border border-border bg-card p-4">
            {saleOrder.notes ? (
              <p className="text-sm whitespace-pre-wrap">{saleOrder.notes}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No notes on this order.</p>
            )}
          </section>
        )}
      </>}

      sidebar={<>
        
        <SidebarCard title="Customer">
          <Link href={`/customers/${saleOrder.customer_id}`} className="block rounded-md -mx-1 px-1 py-0.5 hover:bg-background transition-colors">
            <span className="text-sm font-semibold text-foreground">{saleOrder.customer?.name ?? "—"}</span>
            {saleOrder.customer?.handle && <span className="ml-1.5 text-xs text-muted-foreground">@{saleOrder.customer.handle}</span>}
          </Link>
        </SidebarCard>

        <SidebarCard title="Details">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Owner</dt><dd className="font-medium">{saleOrder.owner_name ?? "Unassigned"}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Priority</dt><dd><StatusBadge status={saleOrder.priority} /></dd></div>
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Fulfillment</dt><dd className="capitalize font-medium">{saleOrder.fulfillment_type.replace(/_/g, " ")}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Channel</dt><dd className="capitalize">{saleOrder.business_channel?.replace(/_/g, " ") || "—"}</dd></div>
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Source</dt><dd>{saleOrder.source || "—"}</dd></div>
            {isActive && procurementStatus && (
              <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Procurement</dt><dd><StatusBadge status={procurementStatus} /></dd></div>
            )}
            <div className="flex justify-between"><dt className="text-xs text-muted-foreground">Created</dt><dd className="tabular-nums">{saleOrder.created_at?.slice(0, 10)}</dd></div>
          </dl>
        </SidebarCard>

        <SidebarCard title="Linked Purchase Orders">
          {poLinks.length > 0 ? (
            <ul className="space-y-1.5 mb-2">
              {poLinks.map((link) => (
                <li key={link.purchase_order_id} className="flex flex-wrap items-center gap-1.5">
                  <Link href={`/orders/procurement/${link.purchase_order_id}`} className="text-sm font-medium text-primary hover:underline">{link.purchase_order?.po_number ?? link.purchase_order_id.slice(0, 8)}</Link>
                  {link.purchase_order && <StatusBadge status={link.purchase_order.status} />}
                  {link.purchase_order?.supplier && <span className="text-[11px] text-muted-foreground">{link.purchase_order.supplier.name}</span>}
                  <button type="button" onClick={() => unlinkPo(link.purchase_order_id)} className="text-[10px] text-muted-foreground hover:text-destructive ml-auto">unlink</button>
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-muted-foreground mb-2">None linked</p>}
          <div className="relative">
            <input placeholder="Search POs..." value={poSearch} onChange={(e) => setPoSearch(e.target.value)} className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring" />
            {poSearch && (
              <div className="absolute z-10 mt-1 max-h-32 w-full space-y-0.5 overflow-y-auto rounded-md border border-border bg-card p-1 shadow-lg">
                {(purchaseOrders ?? []).filter((po) => po.status !== "cancelled" && po.status !== "received" && !poLinks.some((l) => l.purchase_order_id === po.id) && (po.po_number.toLowerCase().includes(poSearch.toLowerCase()) || (po.supplier?.name ?? "").toLowerCase().includes(poSearch.toLowerCase()))).slice(0, 8).map((po) => (
                  <button key={po.id} type="button" onClick={() => { linkPo(po.id); setPoSearch(""); }} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted">
                    <span className="font-medium">{po.po_number}</span>
                    <span className="text-muted-foreground">{po.supplier?.name ?? "—"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {procurementStatus !== "ready_to_ship" && (
            <button type="button" onClick={() => setShowCreatePo(true)} className="mt-2 w-full rounded-md border border-dashed border-primary/30 py-1 text-xs font-medium text-primary hover:bg-primary/5">+ Create PO</button>
          )}
          {inlineError && <p className="mt-2 text-xs text-destructive">{inlineError}</p>}
        </SidebarCard>
        
        <SidebarCard title="Payment">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between items-baseline"><dt className="text-xs text-muted-foreground">Total</dt><dd className="font-bold tabular-nums text-primary">{fmt(orderTotal)}</dd></div>
            <div className="flex justify-between items-baseline"><dt className="text-xs text-muted-foreground">Paid</dt><dd className="font-bold tabular-nums">{fmt(saleOrder.amount_paid)}</dd></div>
            {balance > 0 && <div className="flex justify-between items-baseline"><dt className="text-xs text-muted-foreground">Balance</dt><dd className="font-semibold tabular-nums text-primary">{fmt(balance)}</dd></div>}
          </dl>
          <select
            defaultValue={saleOrder.payment_status}
            onChange={(e) => inlinePatch({ payment_status: e.target.value })}
            className="mt-2 h-7 w-full cursor-pointer rounded-md border border-border bg-background px-2 text-xs font-medium capitalize text-foreground outline-none transition hover:bg-muted focus:ring-1 focus:ring-primary/50"
          >
            <option value="not_requested">Not requested</option>
            <option value="awaiting_payment">Awaiting payment</option>
            <option value="part_paid">Part paid</option>
            <option value="paid">Paid</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </SidebarCard>
      </>}

      dialog={showCreatePo ? (
        <CreatePurchaseOrderDialog
          onClose={() => setShowCreatePo(false)}
          onCreated={() => { setShowCreatePo(false); toast("Purchase order created"); refetch(); }}
          initialItems={items.map((i) => ({ product_id: i.product_id, quantity_ordered: String(i.quantity), unit_cost: "" }))}
          linkedSaleOrderId={saleOrder.id}
        />
      ) : undefined}
    />
  );
}
