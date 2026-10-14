"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { useLookup } from "@/hooks/useLookup";
import { AetherClient } from "@/lib/aether-client";
import { formatCustomerAddress } from "@/lib/customer-address";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import StatusBadge from "@/components/common/StatusBadge";
import SidebarCard from "@/components/common/orders/SidebarCard";
import PaginatedTable from "@/components/common/PaginatedTable";
import ErrorBlock from "@/components/ui/error-block";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { CircleAlert, CircleDollarSign, ClipboardList, Pencil, ShoppingCart } from "lucide-react";
import type { Customer, CustomerAddress, SaleOrder } from "@/types";

interface CustomerDetailProps {
  customerId: string;
}

const inputClass =
  "h-8 w-full min-w-0 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50";

export default function CustomerDetail({ customerId }: CustomerDetailProps) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const { data: customers, loading, error, refetch } = useApi<Customer[]>([...queryKeys.customers], () => AetherClient.getCustomers());
  const { data: saleOrders } = useApi<SaleOrder[]>([...queryKeys.saleOrders], () => AetherClient.getSaleOrders());
  const { options: customerTypeOptions } = useLookup("customer_type");

  const customer = customers?.find((c) => c.id === customerId);
  const orders = useMemo(
    () => (saleOrders ?? []).filter((o) => o.customer_id === customerId).sort((a, b) => b.order_date.localeCompare(a.order_date)),
    [saleOrders, customerId]
  );

  const [editingDetails, setEditingDetails] = useState(false);
  const [detailsDraft, setDetailsDraft] = useState({
    name: "", email: "", handle: "", customerType: "b2b", contactEmail: "", contactPhone: "", paymentTerms: "",
  });
  const [savingDetails, setSavingDetails] = useState(false);

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [editingAddress, setEditingAddress] = useState(false);
  const [addressValue, setAddressValue] = useState<CustomerAddress>({});
  const [savingAddress, setSavingAddress] = useState(false);

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

  const totalRevenue = orders.reduce((sum, o) => sum + o.order_total, 0);
  const openOrders = orders.filter((o) => o.status === "open" || o.status === "shipped");
  const outstanding = totalRevenue - orders.reduce((sum, o) => sum + o.amount_paid, 0);
  const contactInfo = (c.contact_info ?? {}) as Record<string, unknown>;
  const contactEmail = String(contactInfo.email ?? "");
  const contactPhone = String(contactInfo.phone ?? "");

  const fmt = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /* ---- inline edit handlers ---- */

  function startEditingDetails() {
    setDetailsDraft({
      name: c.name,
      email: c.email ?? "",
      handle: c.handle ?? "",
      customerType: c.customer_type,
      contactEmail,
      contactPhone,
      paymentTerms: c.payment_terms ?? "",
    });
    setEditingDetails(true);
  }

  async function saveDetails(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detailsDraft.name.trim()) return;
    setSavingDetails(true);
    try {
      const nextContactInfo = { ...contactInfo };
      if (detailsDraft.contactEmail.trim()) nextContactInfo.email = detailsDraft.contactEmail.trim();
      else delete nextContactInfo.email;
      if (detailsDraft.contactPhone.trim()) nextContactInfo.phone = detailsDraft.contactPhone.trim();
      else delete nextContactInfo.phone;

      await AetherClient.updateCustomer(c.id, {
        name: detailsDraft.name.trim(),
        email: detailsDraft.email.trim(),
        handle: detailsDraft.handle.trim(),
        customer_type: detailsDraft.customerType as Customer["customer_type"],
        contact_info: nextContactInfo,
        payment_terms: detailsDraft.paymentTerms.trim(),
      });
      setEditingDetails(false);
      toast("Customer details updated");
      invalidate([...queryKeys.customers]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update customer details", "error");
    } finally {
      setSavingDetails(false);
    }
  }

  function startEditingNotes() {
    setNotesValue(c.notes ?? "");
    setEditingNotes(true);
  }

  async function saveNotes() {
    setSavingNotes(true);
    try {
      await AetherClient.updateCustomer(c.id, { notes: notesValue.trim() });
      setEditingNotes(false);
      toast("Notes updated");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update notes", "error");
    } finally {
      setSavingNotes(false);
    }
  }

  function startEditingAddress() {
    setAddressValue(c.address ?? {});
    setEditingAddress(true);
  }

  async function saveAddress() {
    const address = Object.fromEntries(
      Object.entries(addressValue).filter(([, value]) => value?.trim())
    ) as CustomerAddress;

    setSavingAddress(true);
    try {
      await AetherClient.updateCustomer(c.id, { address });
      setEditingAddress(false);
      toast("Address updated");
      refetch();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update address", "error");
    } finally {
      setSavingAddress(false);
    }
  }

  /* ---- render ---- */

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/customers"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
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
            <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">
              {c.name}
            </h1>
            <StatusBadge status={c.customer_type} />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {c.handle ?? "No handle"} · {c.email ?? "No email"}
          </p>
        </div>
      </div>

      {/* Metric cards */}
      <MetricCardRow>
        <MetricCard density="dashboard" autoSizeValue icon={<ClipboardList size={18} />} iconClassName="text-primary" label="Total Orders" value={orders.length} />
        <MetricCard density="dashboard" autoSizeValue icon={<ShoppingCart size={18} />} iconClassName="text-primary" label="Open Orders" value={openOrders.length} />
        <MetricCard density="dashboard" autoSizeValue icon={<CircleDollarSign size={18} />} label="Revenue" value={fmt(totalRevenue)} />
        <MetricCard density="dashboard" autoSizeValue icon={<CircleAlert size={18} />} iconClassName={outstanding > 0 ? "text-destructive" : "text-emerald-600"} label="Outstanding" value={fmt(outstanding)} />
      </MetricCardRow>

      {/* Charcoal divider */}
      <div className="h-0.5 bg-sidebar" />

      {/* Two-column layout */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Main content */}
        <div className="flex flex-col gap-4">
          {/* Orders section */}
          <section className="rounded-lg border border-border bg-card px-5 py-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 mb-3">
              Orders
            </h2>
            <div className="overflow-x-auto rounded-md border border-border">
              <PaginatedTable className="border-0 rounded-none"><table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-xs font-medium">SO #</th>
                    <th className="px-3 py-2 text-xs font-medium">Date</th>
                    <th className="px-3 py-2 text-xs font-medium">Status</th>
                    <th className="px-3 py-2 text-xs font-medium">Payment</th>
                    <th className="px-3 py-2 text-xs font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-muted/50">
                        <td className="px-3 py-2">
                          <Link href={`/orders/sales/${order.id}`} className="font-medium text-primary hover:underline">{order.so_number}</Link>
                        </td>
                        <td className="px-3 py-2">{order.order_date}</td>
                        <td className="px-3 py-2"><StatusBadge status={order.status} /></td>
                        <td className="px-3 py-2"><StatusBadge status={order.payment_status} /></td>
                        <td className="px-3 py-2 text-right">{fmt(order.order_total)}</td>
                      </tr>
                    ))}
                  {orders.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-5 text-center text-muted-foreground">No sales orders</td></tr>
                  )}
                </tbody>
              </table></PaginatedTable>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-3">
          <SidebarCard title="Details">
            {editingDetails ? (
              <form onSubmit={saveDetails} className="space-y-3">
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Name
                  <input required autoFocus value={detailsDraft.name} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, name: event.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Account email
                  <input type="email" value={detailsDraft.email} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, email: event.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Handle
                  <input value={detailsDraft.handle} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, handle: event.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Customer type
                  <Select value={detailsDraft.customerType} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, customerType: event.target.value }))} className={inputClass}>
                    {(customerTypeOptions.length ? customerTypeOptions : [
                      { label: "B2B", value: "b2b" }, { label: "B2C", value: "b2c" }, { label: "Special", value: "special" },
                    ]).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Contact email
                  <input type="email" value={detailsDraft.contactEmail} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, contactEmail: event.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Contact phone
                  <input value={detailsDraft.contactPhone} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, contactPhone: event.target.value }))} className={inputClass} />
                </label>
                <label className="grid gap-1 text-xs font-medium text-muted-foreground">Payment terms
                  <input value={detailsDraft.paymentTerms} onChange={(event) => setDetailsDraft((draft) => ({ ...draft, paymentTerms: event.target.value }))} className={inputClass} />
                </label>
                <div className="flex items-center gap-2 pt-1">
                  <button type="submit" disabled={savingDetails} className="rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{savingDetails ? "Saving…" : "Save details"}</button>
                  <button type="button" onClick={() => setEditingDetails(false)} disabled={savingDetails} className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">Cancel</button>
                </div>
              </form>
            ) : (
              <>
                <dl className="space-y-2.5 text-sm">
                  <DetailRow label="Name" value={c.name} />
                  <DetailRow label="Account email" value={c.email || "—"} />
                  <DetailRow label="Handle" value={c.handle || "—"} />
                  <div><dt className="text-xs text-muted-foreground">Customer type</dt><dd className="mt-0.5"><StatusBadge status={c.customer_type} /></dd></div>
                  <DetailRow label="Contact email" value={contactEmail || "—"} />
                  <DetailRow label="Contact phone" value={contactPhone || "—"} />
                  <DetailRow label="Payment terms" value={c.payment_terms || "—"} />
                  <DetailRow label="Created" value={new Date(c.created_at).toLocaleDateString()} />
                </dl>
                <button type="button" onClick={startEditingDetails} className="mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
                  <Pencil size={13} /> Edit details
                </button>
              </>
            )}
          </SidebarCard>

          <SidebarCard title="Address">
            {editingAddress ? (
              <div className="flex flex-col gap-2">
                <input aria-label="Address line 1" placeholder="Address line 1" value={addressValue.line1 ?? ""} onChange={(e) => setAddressValue((address) => ({ ...address, line1: e.target.value }))} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50" autoFocus />
                <input aria-label="Address line 2" placeholder="Address line 2" value={addressValue.line2 ?? ""} onChange={(e) => setAddressValue((address) => ({ ...address, line2: e.target.value }))} className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="City" placeholder="City" value={addressValue.city ?? ""} onChange={(e) => setAddressValue((address) => ({ ...address, city: e.target.value }))} className="h-8 min-w-0 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
                  <input aria-label="State" placeholder="State" value={addressValue.state ?? ""} onChange={(e) => setAddressValue((address) => ({ ...address, state: e.target.value }))} className="h-8 min-w-0 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Postcode" placeholder="Postcode" value={addressValue.postcode ?? ""} onChange={(e) => setAddressValue((address) => ({ ...address, postcode: e.target.value }))} className="h-8 min-w-0 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
                  <input aria-label="Country" placeholder="Country" value={addressValue.country ?? ""} onChange={(e) => setAddressValue((address) => ({ ...address, country: e.target.value }))} className="h-8 min-w-0 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={saveAddress} disabled={savingAddress} className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{savingAddress ? "..." : "Save"}</button>
                  <button type="button" onClick={() => setEditingAddress(false)} className="text-xs text-muted-foreground/60 hover:text-foreground">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="whitespace-pre-wrap text-sm text-foreground">{formatCustomerAddress(c.address) || "No address"}</p>
                <button type="button" onClick={startEditingAddress} className="shrink-0 text-muted-foreground/40 hover:text-primary transition-colors"><Pencil size={13} /></button>
              </div>
            )}
          </SidebarCard>

          <SidebarCard title="Notes">
            {editingNotes ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={notesValue}
                  onChange={(e) => setNotesValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingNotes(false);
                  }}
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary/50 resize-y"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                  >
                    {savingNotes ? "..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingNotes(false)}
                    className="text-xs text-muted-foreground/60 hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground whitespace-pre-wrap">{c.notes || "No notes"}</p>
                <button
                  type="button"
                  onClick={startEditingNotes}
                  className="shrink-0 text-muted-foreground/40 hover:text-primary transition-colors"
                >
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </SidebarCard>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
    </div>
  );
}
