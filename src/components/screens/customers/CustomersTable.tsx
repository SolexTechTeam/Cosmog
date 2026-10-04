"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { Customer } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function CustomersTable() {
  const { data, loading, error, refetch } = useApi<Customer[]>("/api/customers");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", handle: "", email: "", customer_type: "b2b", payment_terms: "" });

  const customers = useMemo(() => data ?? [], [data]);
  const b2bCount = customers.filter((c) => c.customer_type === "b2b").length;
  const b2cCount = customers.filter((c) => c.customer_type === "b2c").length;

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
      { field: "name", headerName: "Name", minWidth: 200 },
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
      await api.post("/api/customers", {
        name: newCustomer.name.trim(),
        handle: newCustomer.handle.trim() || null,
        email: newCustomer.email.trim() || null,
        customer_type: newCustomer.customer_type,
        payment_terms: newCustomer.payment_terms.trim() || null,
        contact_info: {},
      });
      setNewCustomer({ name: "", handle: "", email: "", customer_type: "b2b", payment_terms: "" });
      setShowCreate(false);
      refetch();
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : "Unable to create customer.");
    } finally {
      setCreating(false);
    }
  }

  if (error) {
    return <p className="text-sm text-red-500">Failed to load customers: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-muted px-5 py-3">
        <h2 className="text-header mb-2">Overview</h2>
        <MetricCardRow>
          <MetricCard label="Total Customers" value={loading ? "—" : customers.length} />
          <MetricCard label="B2B" value={loading ? "—" : b2bCount} />
          <MetricCard label="B2C" value={loading ? "—" : b2cCount} />
        </MetricCardRow>
      </div>
      <div className="flex flex-col gap-4">
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
          trailing={<div className="flex items-center gap-2"><button type="button" onClick={() => { setCreateError(null); setShowCreate(true); }} className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">Add Customer</button><ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} /></div>}
        />
        <DataGrid<Customer> rows={filtered} columns={visibleColumns} loading={loading} pageSize={25} />
      </div>
      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => !creating && setShowCreate(false)}><form onSubmit={createCustomer} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="add-customer-title"><h2 id="add-customer-title" className="text-lg font-semibold">Add Customer</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium sm:col-span-2">Name<input required value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Handle<input value={newCustomer.handle} onChange={(event) => setNewCustomer((current) => ({ ...current, handle: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Type<select value={newCustomer.customer_type} onChange={(event) => setNewCustomer((current) => ({ ...current, customer_type: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal"><option value="b2b">B2B</option><option value="b2c">B2C</option><option value="special">Special</option></select></label><label className="grid gap-1 text-sm font-medium sm:col-span-2">Email<input type="email" value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium sm:col-span-2">Payment terms<input value={newCustomer.payment_terms} onChange={(event) => setNewCustomer((current) => ({ ...current, payment_terms: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label></div>{createError && <p className="mt-3 text-sm text-destructive">{createError}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} disabled={creating} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button><button type="submit" disabled={creating} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{creating ? "Adding…" : "Add Customer"}</button></div></form></div>}
    </div>
  );
}
