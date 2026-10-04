"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { Supplier } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function SuppliersTable() {
  const { data, loading, error } = useApi<Supplier[]>("/api/suppliers");
  const [search, setSearch] = useState("");

  const suppliers = data ?? [];

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter((r) => r.name.toLowerCase().includes(q));
  }, [suppliers, search]);

  const columns: ColDef<Supplier>[] = useMemo(
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

  if (error) {
    return <p className="text-sm text-red-500">Failed to load suppliers: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-muted p-5 shadow-sm">
        <h2 className="text-header mb-4">Overview</h2>
        <MetricCardRow>
          <MetricCard label="Total Suppliers" value={loading ? "—" : suppliers.length} />
        </MetricCardRow>
      </div>
      <div className="flex flex-col gap-4">
        <SearchFilterBar
          searchPlaceholder="Search suppliers..."
          searchValue={search}
          onSearchChange={setSearch}
        />
        <DataGrid<Supplier> rows={filtered} columns={columns} loading={loading} pageSize={25} />
      </div>
    </div>
  );
}
