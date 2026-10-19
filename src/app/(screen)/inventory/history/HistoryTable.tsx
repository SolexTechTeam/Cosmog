"use client";

import { useState, useMemo, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { getLedgerReference } from "@/lib/ledger-reference";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import ErrorBlock from "@/components/ui/error-block";
import type { LedgerEntry } from "@/types";
import type { ColDef } from "ag-grid-community";
import ManualAdjustmentDialog from "./ManualAdjustmentDialog";

export default function HistoryTable() {
  const [pageSize, setPageSize] = useState(50);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [dateRangeError, setDateRangeError] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  // Ledger date filters use UTC calendar dates in the API contract.
  const today = new Date().toISOString().slice(0, 10);
  const fromMax = dateTo && dateTo < today ? dateTo : today;
  const filters = { movement_type: typeFilter || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, q: debouncedSearch || undefined, limit: pageSize };

  function changeDateFrom(value: string) {
    if (value && (value > today || (dateTo && value > dateTo))) {
      setDateRangeError(value > today ? "Dates cannot be after today." : "From date must be on or before To date.");
      return;
    }
    setDateRangeError("");
    setDateFrom(value);
  }

  function changeDateTo(value: string) {
    if (value && value > today) {
      setDateRangeError("Dates cannot be after today.");
      return;
    }
    if (value && dateFrom && value < dateFrom) {
      setDateRangeError("From date must be on or before To date.");
      return;
    }
    setDateRangeError("");
    setDateTo(value);
  }
  const ledgerQuery = useInfiniteQuery({
    queryKey: [...queryKeys.ledger, "history", filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => AetherClient.getLedger({ ...filters, cursor: pageParam ?? undefined }),
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
  const rows = useMemo(() => ledgerQuery.data?.pages.flatMap((page) => page.items) ?? [], [ledgerQuery.data]);

  const allColumns: ColDef<LedgerEntry>[] = useMemo(
    () => [
      {
        field: "created_at",
        headerName: "Date",
        minWidth: 170,
        sort:"desc",
        valueFormatter: (p) => p.value ? new Date(p.value).toLocaleString() : "—",
      },
      {
        field: "product_name",
        headerName: "Product",
        minWidth: 180,
        valueFormatter: (p) => p.value ?? "—",
      },
      {
        field: "product_category",
        headerName: "Category",
        minWidth: 150,
        valueFormatter: (p) => p.value ?? "—",
      },
      {
        field: "movement_type",
        headerName: "Type",
        minWidth: 130,
        cellRenderer: (p: { value: string; data?: LedgerEntry }) => {
          const isCancellation = p.value === "po_incoming" && (p.data?.quantity_change ?? 0) < 0 && p.data?.notes?.includes("Cancelled purchase order");
          return StatusBadge({ status: isCancellation ? "po_incoming_reversed" : p.value });
        },
      },
      {
        field: "quantity_change",
        headerName: "Qty Change",
        minWidth: 110,
        valueFormatter: (p) => {
          const val = p.value ?? 0;
          const type = (p.data as LedgerEntry)?.movement_type;
          if (type === "po_incoming") return `${val > 0 ? "+" : val < 0 ? "−" : ""}${Math.abs(val)}`;
          if (type === "reserved") return `(${Math.abs(val)})`;
          return `${val > 0 ? "+" : ""}${val}`;
        },
        cellStyle: (p) => {
          const val = p.value as number;
          const type = (p.data as LedgerEntry)?.movement_type;
          if (type === "po_incoming" && val < 0) return { color: "var(--destructive)", fontWeight: 500 } as const;
          if (type === "po_incoming" || type === "reserved") return { color: "var(--muted-foreground)", fontWeight: 500 } as const;
          if (val > 0) return { color: "var(--chart-3)", fontWeight: 500 } as const;
          if (val < 0) return { color: "var(--destructive)", fontWeight: 500 } as const;
          return null;
        },
      },
      {
        field: "unit_cost",
        headerName: "Unit Cost",
        minWidth: 100,
        valueFormatter: (p) => p.value != null ? `$${p.value.toFixed(2)}` : "—",
      },
      {
        headerName: "Line Value",
        minWidth: 120,
        valueGetter: (p) => {
          const quantityChange = p.data?.quantity_change ?? 0;
          const unitPrice = p.data?.unit_price;
          return quantityChange < 0 && unitPrice != null ? Math.abs(quantityChange) * unitPrice : null;
        },
        valueFormatter: (p) => p.value != null ? `$${p.value.toFixed(2)}` : "—",
      },
      {
        colId: "reference",
        headerName: "Reference",
        minWidth: 145,
        valueGetter: (p) => p.data ? getLedgerReference(p.data).label : "",
        cellRenderer: (p: { data?: LedgerEntry }) => {
          const entry = p.data;
          if (!entry) return "—";
          const { label, href } = getLedgerReference(entry);
          return href ? (
            <Link href={href} className="text-primary hover:underline" onClick={(event) => event.stopPropagation()}>
              {label}
            </Link>
          ) : <span className="text-muted-foreground">{label}</span>;
        },
      },
      {
        field: "performed_by_name",
        headerName: "Initiated By",
        minWidth: 150,
        valueFormatter: (p) => p.value ?? "—",
      },
      { field: "notes", headerName: "Notes", minWidth: 180 },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(
    allColumns,
    new Set(["notes"])
  );

  if (ledgerQuery.isError && rows.length === 0) {
    return <ErrorBlock message={`Failed to load ledger: ${ledgerQuery.error.message}`} onRetry={() => void ledgerQuery.refetch()} />;
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
              { label: "PO Incoming", value: "po_incoming" },
              { label: "Received", value: "received" },
              { label: "Allocated", value: "reserved" },
              { label: "Released", value: "released" },
              { label: "Shipped", value: "shipped" },
              { label: "Returned", value: "returned" },
              { label: "Adjustment", value: "adjustment" },
              { label: "Conversion", value: "conversion" },
            ],
            value: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
        trailing={
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} max={fromMax} onChange={(e) => changeDateFrom(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" aria-label="From date" aria-describedby="ledger-date-range-help" />
            <input type="date" value={dateTo} min={dateFrom || undefined} max={today} onChange={(e) => changeDateTo(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" aria-label="To date" aria-describedby="ledger-date-range-help" />
            <select aria-label="Rows per page" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground">
              {[25, 50, 100].map((size) => <option key={size} value={size}>{size} per page</option>)}
            </select>
            <button type="button" onClick={() => setShowAdjustment(true)} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90">Add Adjustment</button>
            <ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />
          </div>
        }
      />
      <p id="ledger-date-range-help" className="-mt-3 text-xs text-muted-foreground">Dates must be today or earlier, and From must be on or before To.{dateRangeError ? ` ${dateRangeError}` : ""}</p>
      <DataGrid<LedgerEntry> rows={rows} columns={visibleColumns} loading={ledgerQuery.isLoading} pageSize={pageSize} />
      {ledgerQuery.isError && rows.length > 0 && <ErrorBlock message={`Failed to load older entries: ${ledgerQuery.error.message}`} onRetry={() => void ledgerQuery.fetchNextPage()} />}
      {ledgerQuery.hasNextPage ? (
        <button type="button" disabled={ledgerQuery.isFetchingNextPage} onClick={() => void ledgerQuery.fetchNextPage()} className="mx-auto rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-60">{ledgerQuery.isFetchingNextPage ? "Loading…" : "Load more"}</button>
      ) : <p className="text-center text-xs text-muted-foreground">End of history · {rows.length} entries loaded</p>}
      {showAdjustment && <ManualAdjustmentDialog onClose={() => setShowAdjustment(false)} />}
    </div>
  );
}
