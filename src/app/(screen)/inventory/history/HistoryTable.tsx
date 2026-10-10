"use client";

import { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import ErrorBlock from "@/components/ui/error-block";
import type { Product, LedgerEntry } from "@/types";
import type { ColDef } from "ag-grid-community";

const inputClass = "h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

function AdjustmentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: products } = useApi<Product[]>([...queryKeys.products], () => AetherClient.getProducts());
  const [productId, setProductId] = useState("");
  const [quantityChange, setQuantityChange] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const qty = Number(quantityChange);
    if (!productId || !Number.isFinite(qty) || qty === 0) {
      setError("Select a product and enter a non-zero quantity.");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await AetherClient.createLedgerAdjustment({
        product_id: productId,
        quantity_change: qty,
        ...(unitCost ? { unit_cost: Number(unitCost) } : {}),
        ...(unitPrice ? { unit_price: Number(unitPrice) } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create adjustment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4" onMouseDown={() => !saving && onClose()}>
      <form onSubmit={submit} onMouseDown={(e) => e.stopPropagation()} className="mx-auto my-8 w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold">Manual Adjustment</h2>
          <button type="button" onClick={onClose} disabled={saving} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted">Close</button>
        </div>
        {error && <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Product
            <select required value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
              <option value="">Select product</option>
              {(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Quantity Change
            <input required type="number" step="1" value={quantityChange} onChange={(e) => setQuantityChange(e.target.value)} placeholder="e.g. 5 or -3" className={inputClass} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Unit Cost
              <input type="number" min="0" step="0.01" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} placeholder="Optional" className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Unit Price
              <input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="Optional" className={inputClass} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Notes
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Reason for adjustment" className="rounded-md border border-input bg-background px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-ring" />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : "Add Adjustment"}</button>
        </div>
      </form>
    </div>
  );
}

export default function HistoryTable() {
  const { data, loading, error, refetch } = useApi<LedgerEntry[]>([...queryKeys.ledger], () => AetherClient.getLedger());
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAdjustment, setShowAdjustment] = useState(false);

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.movement_type.toLowerCase().includes(q) ||
          (r.product_name ?? "").toLowerCase().includes(q) ||
          (r.notes ?? "").toLowerCase().includes(q) ||
          (r.reference_type ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter) rows = rows.filter((r) => r.movement_type === typeFilter);
    if (dateFrom) {
      const from = new Date(dateFrom);
      rows = rows.filter((r) => new Date(r.created_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59");
      rows = rows.filter((r) => new Date(r.created_at) <= to);
    }
    return rows;
  }, [data, search, typeFilter, dateFrom, dateTo]);

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
        field: "movement_type",
        headerName: "Type",
        minWidth: 130,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      {
        field: "quantity_change",
        headerName: "Qty Change",
        minWidth: 110,
        valueFormatter: (p) => {
          const val = p.value ?? 0;
          const type = (p.data as LedgerEntry)?.movement_type;
          if (type === "po_in_transit" || type === "reserved") return `(${Math.abs(val)})`;
          return `${val > 0 ? "+" : ""}${val}`;
        },
        cellStyle: (p) => {
          const val = p.value as number;
          const type = (p.data as LedgerEntry)?.movement_type;
          if (type === "po_in_transit" || type === "reserved") return { color: "var(--muted-foreground)", fontWeight: 500 } as const;
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
        minWidth: 200,
        valueGetter: (p) => p.data?.reference_type ?? "",
        cellRenderer: (p: { data?: LedgerEntry }) => {
          const entry = p.data;
          if (!entry?.reference_type || !entry?.reference_id) return "—";
          const label = entry.reference_type.replace(/_/g, " ");
          const shortId = entry.reference_id.slice(0, 8);
          const hrefMap: Record<string, string> = {
            sale_order: `/orders/sales/${entry.reference_id}`,
            purchase_order: `/orders/procurement/${entry.reference_id}`,
          };
          const href = hrefMap[entry.reference_type];
          return (
            <span className="flex items-center gap-1.5">
              <span className="text-foreground/60 text-xs">{label}</span>
              {href ? (
                <Link href={href} className="text-primary hover:underline text-xs" onClick={(e) => e.stopPropagation()}>
                  {shortId}
                </Link>
              ) : (
                <span className="text-xs">{shortId}</span>
              )}
            </span>
          );
        },
      },
      { field: "notes", headerName: "Notes", minWidth: 180 },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(
    allColumns,
    new Set(["notes"])
  );

  if (error) {
    return <ErrorBlock message={`Failed to load ledger: ${error}`} onRetry={refetch} />;
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
              { label: "Shipped", value: "shipped" },
              { label: "Returned", value: "returned" },
              { label: "Adjustment", value: "adjustment" },
            ],
            value: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
        trailing={
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" aria-label="From date" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" aria-label="To date" />
            <button type="button" onClick={() => setShowAdjustment(true)} className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90">Add Adjustment</button>
            <ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />
          </div>
        }
      />
      <DataGrid<LedgerEntry> rows={filtered} columns={visibleColumns} loading={loading} pageSize={25} />
      {showAdjustment && <AdjustmentDialog onClose={() => setShowAdjustment(false)} onCreated={refetch} />}
    </div>
  );
}
