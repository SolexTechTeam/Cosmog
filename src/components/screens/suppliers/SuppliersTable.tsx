"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import type { Supplier } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function SuppliersTable() {
  const { data, loading, error, refetch } = useApi<Supplier[]>("/api/suppliers");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newSupplier, setNewSupplier] = useState({ name: "", email: "", phone: "", default_lead_days: "1" });

  const suppliers = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter((r) => r.name.toLowerCase().includes(q));
  }, [suppliers, search]);

  const allColumns: ColDef<Supplier>[] = useMemo(
    () => [
      { field: "name", headerName: "Name", minWidth: 250 },
      { field: "default_lead_days", headerName: "Lead Days", minWidth: 110 },
      {
        headerName: "Email",
        valueGetter: (p) => (p.data?.contact_info as Record<string, string>)?.email ?? "—",
        minWidth: 220,
      },
      {
        headerName: "Phone",
        valueGetter: (p) => (p.data?.contact_info as Record<string, string>)?.phone ?? "—",
        minWidth: 160,
      },
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

  async function createSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const leadDays = Number(newSupplier.default_lead_days);
    if (!newSupplier.name.trim() || !Number.isInteger(leadDays) || leadDays < 1) {
      setCreateError("Supplier name and a lead time of at least one day are required.");
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      await api.post("/api/suppliers", { name: newSupplier.name.trim(), default_lead_days: leadDays, contact_info: { ...(newSupplier.email.trim() ? { email: newSupplier.email.trim() } : {}), ...(newSupplier.phone.trim() ? { phone: newSupplier.phone.trim() } : {}) } });
      setNewSupplier({ name: "", email: "", phone: "", default_lead_days: "1" });
      setShowCreate(false);
      refetch();
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : "Unable to create supplier.");
    } finally {
      setCreating(false);
    }
  }

  if (error) {
    return <p className="text-sm text-red-500">Failed to load suppliers: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <SearchFilterBar
          searchPlaceholder="Search suppliers..."
          searchValue={search}
          onSearchChange={setSearch}
          trailing={<div className="flex items-center gap-2"><button type="button" onClick={() => { setCreateError(null); setShowCreate(true); }} className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">Add Supplier</button><ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} /></div>}
        />
        <DataGrid<Supplier> rows={filtered} columns={visibleColumns} loading={loading} pageSize={25} />
      </div>
      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => !creating && setShowCreate(false)}><form onSubmit={createSupplier} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="add-supplier-title"><h2 id="add-supplier-title" className="text-lg font-semibold">Add Supplier</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium sm:col-span-2">Name<input required value={newSupplier.name} onChange={(event) => setNewSupplier((current) => ({ ...current, name: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Email<input type="email" value={newSupplier.email} onChange={(event) => setNewSupplier((current) => ({ ...current, email: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Phone<input value={newSupplier.phone} onChange={(event) => setNewSupplier((current) => ({ ...current, phone: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Lead days<input required type="number" min="1" step="1" value={newSupplier.default_lead_days} onChange={(event) => setNewSupplier((current) => ({ ...current, default_lead_days: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label></div>{createError && <p className="mt-3 text-sm text-destructive">{createError}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} disabled={creating} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button><button type="submit" disabled={creating} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{creating ? "Adding…" : "Add Supplier"}</button></div></form></div>}
    </div>
  );
}
