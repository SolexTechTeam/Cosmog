"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi, queryKeys } from "@/hooks/useApi";
import { useLookup } from "@/hooks/useLookup";
import { AetherClient } from "@/lib/aether-client";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import SidebarCard from "@/components/common/orders/SidebarCard";
import ErrorBlock from "@/components/ui/error-block";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { Pencil } from "lucide-react";
import type { Customer, SaleOrder } from "@/types";

interface CustomerDetailProps {
  customerId: string;
}

const inputClass =
  "h-8 w-48 rounded-md border border-zinc-300 bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50";

export default function CustomerDetail({ customerId }: CustomerDetailProps) {
  const { toast } = useToast();
  const { data: customers, loading, error, refetch } = useApi<Customer[]>([...queryKeys.customers], () => AetherClient.getCustomers());
  const { data: saleOrders } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());
  const { options: customerTypeOptions } = useLookup("customer_type");

  const customer = customers?.find((c) => c.id === customerId);
  const orders = useMemo(
    () => (saleOrders ?? []).filter((o) => o.customer_id === customerId).sort((a, b) => b.order_date.localeCompare(a.order_date)),
    [saleOrders, customerId]
  );

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [editingType, setEditingType] = useState(false);
  const [typeValue, setTypeValue] = useState("");
  const [savingType, setSavingType] = useState(false);

  const [editingTerms, setEditingTerms] = useState(false);
  const [termsValue, setTermsValue] = useState("");
  const [savingTerms, setSavingTerms] = useState(false);

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
    return <ErrorBlock message={`Failed to load customer: ${error}`} onRetry={refetch} />;
  }

  if (!customer) {
    return <ErrorBlock message="Customer not found." onRetry={refetch} />;
  }

  const c = customer;

  const totalRevenue = orders.reduce((sum, o) => {
    const itemTotal = (o.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    return sum + itemTotal + o.shipping_cost;
  }, 0);
  const openOrders = orders.filter((o) => o.status === "open" || o.status === "shipped");
  const outstanding = totalRevenue - orders.reduce((sum, o) => sum + o.amount_paid, 0);
  const contactInfo = (c.contact_info ?? {}) as Record<string, unknown>;
  const contactEmail = String(contactInfo.email ?? "");
  const contactPhone = String(contactInfo.phone ?? "");

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /* ---- inline edit handlers ---- */

  function startEditingName() {
    setNameValue(c.name);
    setEditingName(true);
  }

  async function saveName() {
    if (!nameValue.trim()) return;
    setSavingName(true);
    try {
      await AetherClient.updateCustomer(c.id, { name: nameValue.trim() });
      setEditingName(false);
      toast("Name updated");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update name", "error");
    } finally {
      setSavingName(false);
    }
  }

  function startEditingType() {
    setTypeValue(c.customer_type);
    setEditingType(true);
  }

  async function saveType(value: string) {
    setSavingType(true);
    try {
      await AetherClient.updateCustomer(c.id, { customer_type: value as Customer["customer_type"] });
      setEditingType(false);
      toast("Customer type updated");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update type", "error");
    } finally {
      setSavingType(false);
    }
  }

  function startEditingTerms() {
    setTermsValue(c.payment_terms ?? "");
    setEditingTerms(true);
  }

  async function saveTerms() {
    setSavingTerms(true);
    try {
      await AetherClient.updateCustomer(c.id, { payment_terms: termsValue.trim() });
      setEditingTerms(false);
      toast("Payment terms updated");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update payment terms", "error");
    } finally {
      setSavingTerms(false);
    }
  }

  /* ---- render ---- */

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-xs font-medium text-foreground/60 hover:text-foreground transition-colors"
      >
        <span>&larr;</span> Customers
      </Link>

      {/* Header: avatar + name + badges */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <span className="text-xl font-bold text-primary">
            {c.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {c.name}
            </h1>
            <StatusBadge status={c.customer_type} />
          </div>
          <p className="mt-0.5 text-sm text-foreground/60">
            {c.handle ?? "No handle"} · {c.email ?? "No email"}
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <MetricCardRow className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        <MetricCard label="Total Orders" value={orders.length} accent="primary" />
        <MetricCard label="Open Orders" value={openOrders.length} accent="warning" />
        <MetricCard label="Revenue" value={fmt(totalRevenue)} accent="success" />
        <MetricCard label="Outstanding" value={fmt(outstanding)} accent={outstanding > 0 ? "danger" : "default"} />
      </MetricCardRow>

      {/* Charcoal divider */}
      <div className="h-0.5 bg-sidebar" />

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main content */}
        <div className="flex flex-col gap-4">
          {/* Account section card */}
          <section className="rounded-lg border border-zinc-300 bg-muted px-5 py-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 mb-3">
              Account
            </h2>
            <dl className="space-y-3 text-sm">
              {/* Name - inline editable */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-foreground/60">Name</dt>
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
                      className="text-xs text-foreground/40 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd className="font-medium">{c.name}</dd>
                    <button
                      type="button"
                      onClick={startEditingName}
                      className="text-foreground/30 hover:text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Email - read only */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-foreground/60">Email</dt>
                <dd className="font-medium">{c.email ?? "—"}</dd>
              </div>

              {/* Handle - read only */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-foreground/60">Handle</dt>
                <dd className="font-medium">{c.handle ?? "—"}</dd>
              </div>

              {/* Customer Type - inline editable dropdown */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-foreground/60">Type</dt>
                {editingType ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={typeValue}
                      onChange={(e) => {
                        setTypeValue(e.target.value);
                        saveType(e.target.value);
                      }}
                      disabled={savingType}
                      className={inputClass}
                      autoFocus
                    >
                      {(customerTypeOptions.length ? customerTypeOptions : [
                        { label: "B2B", value: "b2b" },
                        { label: "B2C", value: "b2c" },
                        { label: "Special", value: "special" },
                      ]).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setEditingType(false)}
                      className="text-xs text-foreground/40 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd><StatusBadge status={c.customer_type} /></dd>
                    <button
                      type="button"
                      onClick={startEditingType}
                      className="text-foreground/30 hover:text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Terms - inline editable */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-foreground/60">Payment Terms</dt>
                {editingTerms ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={termsValue}
                      onChange={(e) => setTermsValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTerms();
                        if (e.key === "Escape") setEditingTerms(false);
                      }}
                      className={inputClass}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveTerms}
                      disabled={savingTerms}
                      className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {savingTerms ? "..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingTerms(false)}
                      className="text-xs text-foreground/40 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd className="font-medium">{c.payment_terms ?? "—"}</dd>
                    <button
                      type="button"
                      onClick={startEditingTerms}
                      className="text-foreground/30 hover:text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>
            </dl>
          </section>

          {/* Orders section */}
          <section className="rounded-lg border border-zinc-300 bg-card px-5 py-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 mb-3">
              Orders
            </h2>
            <div className="overflow-x-auto rounded-md border border-zinc-300">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-muted text-foreground/60">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium">SO #</th>
                    <th className="px-3 py-2 text-xs font-medium">Date</th>
                    <th className="px-3 py-2 text-xs font-medium">Status</th>
                    <th className="px-3 py-2 text-xs font-medium">Payment</th>
                    <th className="px-3 py-2 text-xs font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {orders.map((order) => {
                    const itemTotal = (order.items ?? []).reduce((s, i) => s + i.quantity * i.unit_price, 0);
                    return (
                      <tr key={order.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2">
                          <Link href={`/orders/sales/${order.id}`} className="font-medium text-primary hover:underline">{order.so_number}</Link>
                        </td>
                        <td className="px-3 py-2">{order.order_date}</td>
                        <td className="px-3 py-2"><StatusBadge status={order.status} /></td>
                        <td className="px-3 py-2"><StatusBadge status={order.payment_status} /></td>
                        <td className="px-3 py-2 text-right">{fmt(itemTotal + order.shipping_cost)}</td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-5 text-center text-foreground/60">No sales orders</td></tr>
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
                <dt className="text-xs text-foreground/60">Type</dt>
                <dd className="mt-0.5"><StatusBadge status={c.customer_type} /></dd>
              </div>
              <div>
                <dt className="text-xs text-foreground/60">Payment Terms</dt>
                <dd className="mt-0.5 font-medium">{c.payment_terms ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-foreground/60">Created</dt>
                <dd className="mt-0.5 font-medium">{new Date(c.created_at).toLocaleDateString()}</dd>
              </div>
            </dl>
          </SidebarCard>

          <SidebarCard title="Contact">
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-foreground/60">Email</dt>
                <dd className="mt-0.5 font-medium">{contactEmail || c.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-foreground/60">Phone</dt>
                <dd className="mt-0.5 font-medium">{contactPhone || "—"}</dd>
              </div>
            </dl>
          </SidebarCard>
        </div>
      </div>
    </div>
  );
}
