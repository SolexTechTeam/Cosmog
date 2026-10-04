"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import type { ColDef } from "ag-grid-community";

interface LedgerEntry {
  id: number;
  product_id: string;
  inventory_lot_id: string | null;
  movement_type: string;
  quantity_change: number;
  unit_cost: number | null;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

export default function HistoryTable() {
  const { data, loading, error } = useApi<LedgerEntry[]>("/api/inventory/ledger");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.movement_type.toLowerCase().includes(q) ||
          (r.notes ?? "").toLowerCase().includes(q) ||
          (r.reference_type ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter) rows = rows.filter((r) => r.movement_type === typeFilter);
    return rows;
  }, [data, search, typeFilter]);

  const columns: ColDef<LedgerEntry>[] = useMemo(
    () => [
      {
        field: "created_at",
        headerName: "Date",
        minWidth: 170,
        valueFormatter: (p) => p.value ? new Date(p.value).toLocaleString() : "—",
      },
      {
        field: "movement_type",
        headerName: "Type",
        minWidth: 130,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      {
        field: "quantity_change",
        headerName: "Qty Change",
        minWidth: 110,
        cellRenderer: (p: { value: number }) => {
          const val = p.value;
          const color = val > 0 ? "text-green-600" : val < 0 ? "text-red-600" : "text-foreground";
          return `<span class="${color} font-medium">${val > 0 ? "+" : ""}${val}</span>`;
        },
      },
      {
        field: "unit_cost",
        headerName: "Unit Cost",
        minWidth: 100,
        valueFormatter: (p) => p.value != null ? `$${p.value.toFixed(2)}` : "—",
      },
      { field: "reference_type", headerName: "Ref Type", minWidth: 140 },
      {
        field: "reference_id",
        headerName: "Ref ID",
        minWidth: 120,
        valueFormatter: (p) => p.value ? p.value.slice(0, 8) + "..." : "—",
      },
      { field: "notes", headerName: "Notes", minWidth: 180 },
    ],
    []
  );

  if (error) {
    return <p className="text-sm text-red-500">Failed to load ledger: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchFilterBar
        searchPlaceholder="Search ledger entries..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            key: "type",
            label: "Movement Type",
            options: [
              { label: "Lot Created", value: "lot_created" },
              { label: "Received", value: "received" },
              { label: "Reserved", value: "reserved" },
              { label: "Released", value: "released" },
              { label: "Fulfilled", value: "fulfilled" },
              { label: "Returned", value: "returned" },
              { label: "Adjustment", value: "adjustment" },
            ],
            value: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
      />
      <DataGrid<LedgerEntry> rows={filtered} columns={columns} loading={loading} pageSize={25} />
    </div>
  );
}
