"use client";

import { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import DirectoryPageHeader from "@/components/common/DirectoryPageHeader";
import ErrorBlock from "@/components/ui/error-block";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import type { Supplier } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function SuppliersTable() {
  const { data, loading, error, refetch } = useApi<Supplier[]>([...queryKeys.suppliers], () => AetherClient.getSuppliers());
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newSupplier, setNewSupplier] = useState({ name: "", email: "", phone: "", default_lead_days: "1" });

  const suppliers = useMemo(() => data ?? [], [data]);
  const suppliersWithContact = suppliers.filter((supplier) => {
    const info = supplier.contact_info as Record<string, unknown> | undefined;
    return Boolean(info?.email || info?.phone);
  }).length;
  const averageLeadDays = suppliers.length
    ? (suppliers.reduce((sum, supplier) => sum + supplier.default_lead_days, 0) / suppliers.length).toFixed(1)
    : null;

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter((r) => r.name.toLowerCase().includes(q));
  }, [suppliers, search]);

  const allColumns: ColDef<Supplier>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Name",
        minWidth: 250,
        cellRenderer: (params: { value: string; data?: Supplier }) => params.data ? (
          <Link href={`/suppliers/${params.data.id}`} className="font-medium text-primary hover:underline">{params.value}</Link>
        ) : params.value,
      },
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
      await AetherClient.createSupplier({ name: newSupplier.name.trim(), default_lead_days: leadDays, contact_info: { ...(newSupplier.email.trim() ? { email: newSupplier.email.trim() } : {}), ...(newSupplier.phone.trim() ? { phone: newSupplier.phone.trim() } : {}) } });
      setNewSupplier({ name: "", email: "", phone: "", default_lead_days: "1" });
      setShowCreate(false);
      toast("Supplier created");
      refetch();
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : "Unable to create supplier.");
    } finally {
      setCreating(false);
    }
  }

  if (error) {
    return <ErrorBlock message={`Failed to load suppliers: ${error}`} onRetry={refetch} />;
  }

  return (
    <div className="flex flex-col gap-5">
      <DirectoryPageHeader
        title="Suppliers"
        description="Supplier contacts and default lead times for procurement."
        loading={loading}
        summary={[
          { label: "suppliers", value: suppliers.length },
          { label: "with contact details", value: suppliers.length ? `${suppliersWithContact} / ${suppliers.length}` : "—" },
          { label: "average lead time", value: averageLeadDays ? `${averageLeadDays} days` : "—" },
        ]}
        actions={<button type="button" onClick={() => { setCreateError(null); setShowCreate(true); }} className="h-9 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-auto">Add supplier</button>}
      />
      <section aria-label="Supplier directory" className="flex min-w-0 flex-col gap-2">
        <SearchFilterBar
          searchPlaceholder="Search suppliers..."
          searchValue={search}
          onSearchChange={setSearch}
          trailing={<ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />}
        />
        <p className="px-1 text-xs text-muted-foreground" aria-live="polite">
          {loading ? "Loading supplier records…" : `Showing ${filtered.length} of ${suppliers.length} suppliers`}
          {search && !loading && <button type="button" onClick={() => setSearch("")} className="ml-2 font-medium text-primary hover:underline">Clear search</button>}
        </p>
        <DataGrid<Supplier>
          rows={filtered}
          columns={visibleColumns}
          loading={loading}
          pageSize={25}
          showDetailsMenu
          detailsPageHref={(supplier) => `/suppliers/${supplier.id}`}
        />
      </section>
      {showCreate && (
        <Dialog loading={creating} onClose={() => setShowCreate(false)} title="Add Supplier" width={512}>
          <form onSubmit={createSupplier}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Name<Input required value={newSupplier.name} onChange={(event) => setNewSupplier((current) => ({ ...current, name: event.target.value }))} className="h-10 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">Email<Input type="email" value={newSupplier.email} onChange={(event) => setNewSupplier((current) => ({ ...current, email: event.target.value }))} className="h-10 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">Phone<Input value={newSupplier.phone} onChange={(event) => setNewSupplier((current) => ({ ...current, phone: event.target.value }))} className="h-10 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">Lead days<input required type="number" min="1" step="1" value={newSupplier.default_lead_days} onChange={(event) => setNewSupplier((current) => ({ ...current, default_lead_days: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label>
            </div>
            {createError && <p className="mt-3 text-sm text-destructive">{createError}</p>}
            <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} disabled={creating} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button><button type="submit" disabled={creating} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{creating ? "Adding…" : "Add Supplier"}</button></div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
