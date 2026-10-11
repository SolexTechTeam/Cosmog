"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import SidebarCard from "@/components/common/orders/SidebarCard";
import ErrorBlock from "@/components/ui/error-block";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Pencil } from "lucide-react";
import type { PurchaseOrder, Supplier } from "@/types";

interface SupplierDetailProps {
  supplierId: string;
}

const inputClass =
  "h-8 w-48 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50";

export default function SupplierDetail({ supplierId }: SupplierDetailProps) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const { data: suppliers, loading, error, refetch } = useApi<Supplier[]>([...queryKeys.suppliers], () => AetherClient.getSuppliers());
  const { data: purchaseOrders } = useApi<PurchaseOrder[]>([...queryKeys.purchaseOrders], () => AetherClient.getPurchaseOrders());

  const supplier = suppliers?.find((s) => s.id === supplierId);
  const orders = useMemo(
    () => (purchaseOrders ?? []).filter((o) => o.supplier_id === supplierId).sort((a, b) => b.order_date.localeCompare(a.order_date)),
    [purchaseOrders, supplierId]
  );

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [editingLeadDays, setEditingLeadDays] = useState(false);
  const [leadDaysValue, setLeadDaysValue] = useState("");
  const [savingLeadDays, setSavingLeadDays] = useState(false);

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailValue, setEmailValue] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  /* ---- loading / error / not-found ---- */

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
        </div>
        <Skeleton className="h-0.5 w-full" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorBlock message={`Failed to load supplier: ${error}`} onRetry={refetch} />;
  }

  if (!supplier) {
    return <ErrorBlock message="Supplier not found." onRetry={refetch} />;
  }

  const s = supplier;
  const contactInfo = (s.contact_info ?? {}) as Record<string, unknown>;
  const contactEmail = String(contactInfo.email ?? "");
  const contactPhone = String(contactInfo.phone ?? "");

  const totalCost = orders.reduce((sum, o) => sum + o.order_total, 0);
  const activeOrders = orders.filter((o) => o.status !== "received" && o.status !== "cancelled");
  const receivedOrders = orders.filter((o) => o.status === "received");

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /* ---- inline edit handlers ---- */

  function startEditingName() {
    setNameValue(s.name);
    setEditingName(true);
  }

  async function saveName() {
    if (!nameValue.trim()) return;
    setSavingName(true);
    try {
      await AetherClient.updateSupplier(s.id, { name: nameValue.trim() });
      setEditingName(false);
      toast("Name updated");
      invalidate([...queryKeys.suppliers]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update name", "error");
    } finally {
      setSavingName(false);
    }
  }

  function startEditingLeadDays() {
    setLeadDaysValue(String(s.default_lead_days));
    setEditingLeadDays(true);
  }

  async function saveLeadDays() {
    const days = Number(leadDaysValue);
    if (!Number.isInteger(days) || days < 1) return;
    setSavingLeadDays(true);
    try {
      await AetherClient.updateSupplier(s.id, { default_lead_days: days });
      setEditingLeadDays(false);
      toast("Lead days updated");
      invalidate([...queryKeys.suppliers]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update lead days", "error");
    } finally {
      setSavingLeadDays(false);
    }
  }

  function startEditingEmail() {
    setEmailValue(contactEmail);
    setEditingEmail(true);
  }

  async function saveEmail() {
    setSavingEmail(true);
    try {
      const ci: Record<string, string> = {};
      if (emailValue.trim()) ci.email = emailValue.trim();
      if (contactPhone) ci.phone = contactPhone;
      await AetherClient.updateSupplier(s.id, { contact_info: Object.keys(ci).length ? ci : {} });
      setEditingEmail(false);
      toast("Email updated");
      invalidate([...queryKeys.suppliers]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update email", "error");
    } finally {
      setSavingEmail(false);
    }
  }

  function startEditingPhone() {
    setPhoneValue(contactPhone);
    setEditingPhone(true);
  }

  async function savePhone() {
    setSavingPhone(true);
    try {
      const ci: Record<string, string> = {};
      if (contactEmail) ci.email = contactEmail;
      if (phoneValue.trim()) ci.phone = phoneValue.trim();
      await AetherClient.updateSupplier(s.id, { contact_info: Object.keys(ci).length ? ci : {} });
      setEditingPhone(false);
      toast("Phone updated");
      invalidate([...queryKeys.suppliers]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update phone", "error");
    } finally {
      setSavingPhone(false);
    }
  }

  /* ---- render ---- */

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/suppliers"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>&larr;</span> Suppliers
      </Link>

      {/* Header: avatar + name */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <span className="text-xl font-bold text-primary">
            {s.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {s.name}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Default lead time: {s.default_lead_days} day{s.default_lead_days !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <MetricCardRow className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label="Total POs" value={orders.length} />
        <MetricCard label="Active POs" value={activeOrders.length} accent="primary" />
        <MetricCard label="Received" value={receivedOrders.length} accent="success" />
        <MetricCard label="Total Spend" value={fmt(totalCost)} />
      </MetricCardRow>

      {/* Charcoal divider */}
      <div className="h-0.5 bg-sidebar" />

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main content */}
        <div className="flex flex-col gap-4">
          {/* Account section card */}
          <section className="rounded-lg border border-border bg-muted px-5 py-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 mb-3">
              Account
            </h2>
            <dl className="space-y-3 text-sm">
              {/* Name - inline editable */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted-foreground">Name</dt>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      className={inputClass}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveName}
                      disabled={savingName}
                      className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {savingName ? "..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="text-xs text-muted-foreground/60 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd className="font-medium">{s.name}</dd>
                    <button
                      type="button"
                      onClick={startEditingName}
                      className="text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Default Lead Days - inline editable */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted-foreground">Default Lead Days</dt>
                {editingLeadDays ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={leadDaysValue}
                      onChange={(e) => setLeadDaysValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveLeadDays();
                        if (e.key === "Escape") setEditingLeadDays(false);
                      }}
                      className={inputClass}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveLeadDays}
                      disabled={savingLeadDays}
                      className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {savingLeadDays ? "..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingLeadDays(false)}
                      className="text-xs text-muted-foreground/60 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd className="font-medium">{s.default_lead_days} day{s.default_lead_days !== 1 ? "s" : ""}</dd>
                    <button
                      type="button"
                      onClick={startEditingLeadDays}
                      className="text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Email - inline editable */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted-foreground">Email</dt>
                {editingEmail ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={emailValue}
                      onChange={(e) => setEmailValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEmail();
                        if (e.key === "Escape") setEditingEmail(false);
                      }}
                      className={inputClass}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveEmail}
                      disabled={savingEmail}
                      className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {savingEmail ? "..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingEmail(false)}
                      className="text-xs text-muted-foreground/60 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd className="font-medium">{contactEmail || "—"}</dd>
                    <button
                      type="button"
                      onClick={startEditingEmail}
                      className="text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Phone - inline editable */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted-foreground">Phone</dt>
                {editingPhone ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={phoneValue}
                      onChange={(e) => setPhoneValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") savePhone();
                        if (e.key === "Escape") setEditingPhone(false);
                      }}
                      className={inputClass}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={savePhone}
                      disabled={savingPhone}
                      className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {savingPhone ? "..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPhone(false)}
                      className="text-xs text-muted-foreground/60 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd className="font-medium">{contactPhone || "—"}</dd>
                    <button
                      type="button"
                      onClick={startEditingPhone}
                      className="text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>
            </dl>
          </section>

          {/* Purchase Orders section */}
          <section className="rounded-lg border border-border bg-card px-5 py-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 mb-3">
              Purchase Orders
            </h2>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium">PO #</th>
                    <th className="px-3 py-2 text-xs font-medium">Date</th>
                    <th className="px-3 py-2 text-xs font-medium">Status</th>
                    <th className="px-3 py-2 text-xs font-medium">Type</th>
                    <th className="px-3 py-2 text-xs font-medium text-right">Items</th>
                    <th className="px-3 py-2 text-xs font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2">
                          <Link href={`/orders/procurement/${order.id}`} className="font-medium text-primary hover:underline">{order.po_number}</Link>
                        </td>
                        <td className="px-3 py-2">{order.order_date}</td>
                        <td className="px-3 py-2"><StatusBadge status={order.status} /></td>
                        <td className="px-3 py-2 capitalize">{order.fulfillment_type.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2 text-right">{(order.items ?? []).length}</td>
                        <td className="px-3 py-2 text-right">{fmt(order.order_total)}</td>
                      </tr>
                    ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-5 text-center text-muted-foreground">No purchase orders</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-3">
          <SidebarCard title="Details">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Lead Time</dt>
                <dd className="mt-0.5 font-medium">{s.default_lead_days} day{s.default_lead_days !== 1 ? "s" : ""}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Created</dt>
                <dd className="mt-0.5 font-medium">{new Date(s.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </SidebarCard>

          <SidebarCard title="Contact">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="mt-0.5 font-medium">{contactEmail || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="mt-0.5 font-medium">{contactPhone || "—"}</dd>
              </div>
            </dl>
          </SidebarCard>
        </div>
      </div>
    </div>
  );
}
