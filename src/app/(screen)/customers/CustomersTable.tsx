"use client";

import { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import ErrorBlock from "@/components/ui/error-block";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import type { Customer } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function CustomersTable() {
  const { data, loading, error, refetch } = useApi<Customer[]>([...queryKeys.customers], () => AetherClient.getCustomers());
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", handle: "", email: "", customer_type: "b2b", payment_terms: "" });

  const customers = useMemo(() => data ?? [], [data]);
  const b2bCount = customers.filter((c) => c.customer_type === "b2b").length;
  const b2cCount = customers.filter((c) => c.customer_type === "b2c").length;
  const specialCount = customers.filter((c) => c.customer_type === "special").length;

  const filtered = useMemo(() => {
    let rows = customers;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.handle ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter) rows = rows.filter((r) => r.customer_type === typeFilter);
    return rows;
  }, [customers, search, typeFilter]);

  const allColumns: ColDef<Customer>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Name",
        minWidth: 200,
        cellRenderer: (params: { value: string; data?: Customer }) => params.data ? (
          <Link href={`/customers/${params.data.id}`} className="font-medium text-primary hover:underline">{params.value}</Link>
        ) : params.value,
      },
      { field: "handle", headerName: "Handle", minWidth: 180 },
      { field: "email", headerName: "Email", minWidth: 220 },
      {
        field: "customer_type",
        headerName: "Type",
        minWidth: 100,
        valueFormatter: (p) => (p.value ?? "").toUpperCase(),
      },
      { field: "payment_terms", headerName: "Payment Terms", minWidth: 130 },
      {
        field: "created_at",
        headerName: "Created",
        minWidth: 110,
        valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : "—",
      },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(allColumns);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newCustomer.name.trim()) {
      setCreateError("Customer name is required.");
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      await AetherClient.createCustomer({
        name: newCustomer.name.trim(),
        handle: newCustomer.handle.trim() || "",
        email: newCustomer.email.trim() || "",
        customer_type: newCustomer.customer_type,
        payment_terms: newCustomer.payment_terms.trim() || "",
        contact_info: {},
      });
      setNewCustomer({ name: "", handle: "", email: "", customer_type: "b2b", payment_terms: "" });
      setShowCreate(false);
      toast("Customer created");
      refetch();
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : "Unable to create customer.");
    } finally {
      setCreating(false);
    }
  }

  if (error) {
    return <ErrorBlock message={`Failed to load customers: ${error}`} onRetry={refetch} />;
  }

  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="shrink-0">
          <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">Customers</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage your customer accounts</p>
        </div>
        <div className="min-w-0 flex-1 lg:max-w-3xl">
          <MetricCardRow className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <MetricCard label="Total" loading={loading} value={customers.length} />
            <MetricCard label="B2B" loading={loading} value={b2bCount} accent="primary" />
            <MetricCard label="B2C" loading={loading} value={b2cCount} />
            {specialCount > 0 && <MetricCard label="Special" loading={loading} value={specialCount} accent="warning" />}
          </MetricCardRow>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SearchFilterBar
          searchPlaceholder="Search name, handle, email..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              key: "type",
              label: "Type",
              options: [
                { label: "B2B", value: "b2b" },
                { label: "B2C", value: "b2c" },
                { label: "Special", value: "special" },
              ],
              value: typeFilter,
              onChange: setTypeFilter,
            },
          ]}
          trailing={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setCreateError(null); setShowCreate(true); }}
                className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Add Customer
              </button>
              <ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />
            </div>
          }
        />
        <DataGrid<Customer>
          rows={filtered}
          columns={visibleColumns}
          loading={loading}
          pageSize={25}
          showDetailsMenu
          detailsPageHref={(customer) => `/customers/${customer.id}`}
        />
      </div>

      {showCreate && (
        <Dialog loading={creating} onClose={() => setShowCreate(false)} title="Add Customer" width={512}>
          <form onSubmit={createCustomer}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Name<Input required value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} className="h-9 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">Handle<Input value={newCustomer.handle} onChange={(event) => setNewCustomer((current) => ({ ...current, handle: event.target.value }))} className="h-9 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">Type<Select value={newCustomer.customer_type} onChange={(event) => setNewCustomer((current) => ({ ...current, customer_type: event.target.value }))} className="h-9 font-normal"><option value="b2b">B2B</option><option value="b2c">B2C</option><option value="special">Special</option></Select></label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Email<Input type="email" value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} className="h-9 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Payment terms<Input value={newCustomer.payment_terms} onChange={(event) => setNewCustomer((current) => ({ ...current, payment_terms: event.target.value }))} className="h-9 font-normal" /></label>
            </div>
            {createError && <p className="mt-3 text-sm text-destructive">{createError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} disabled={creating} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button>
              <button type="submit" disabled={creating} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{creating ? "Adding..." : "Add Customer"}</button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
