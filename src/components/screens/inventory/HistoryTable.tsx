"use client";

import { useState, useMemo, type FormEvent } from "react";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi } from "@/hooks/useApi";
import { api } from "@/lib/api";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import type { Product } from "@/types";
import type { ColDef } from "ag-grid-community";

interface LedgerEntry {
  id: number;
  product_id: string;
  product_name: string | null;
  inventory_lot_id: string | null;
  movement_type: string;
  quantity_change: number;
  unit_cost: number | null;
  unit_price: number | null;
  reference_type: string | null;
  reference_id: string | null;
  performed_by: string | null;
  notes: string | null;
  created_at: string;
}

const inputClass = "h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

function AdjustmentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { data: products } = useApi<Product[]>("/api/products");
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
      await api.post("/api/inventory/ledger/adjustment", {
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
  const { data, loading, error, refetch } = useApi<LedgerEntry[]>("/api/inventory/ledger");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
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
    return rows;
  }, [data, search, typeFilter]);

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
          if (type === "po_in_transit" || type === "reserved") return { color: "#6b7280", fontWeight: 500 } as const;
          if (val > 0) return { color: "#16a34a", fontWeight: 500 } as const;
          if (val < 0) return { color: "#dc2626", fontWeight: 500 } as const;
          return null;
        },
      },
      {
        field: "unit_cost",
        headerName: "Unit Cost",
        minWidth: 100,
        valueFormatter: (p) => p.value != null ? `$${p.value.toFixed(2)}` : "—",
      },
      // TODO: Add reference to the attribute
      {
        headerName: "Cost Sold",
        minWidth: 120,
        valueGetter: (p) => {
          const quantityChange = p.data?.quantity_change ?? 0;
          const unitPrice = p.data?.unit_price;
          return quantityChange < 0 && unitPrice != null ? Math.abs(quantityChange) * unitPrice : null;
        },
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

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(
    allColumns,
    new Set(["reference_type", "reference_id", "notes"])
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
              { label: "Shipped", value: "shipped" },
              { label: "Returned", value: "returned" },
              { label: "Adjustment", value: "adjustment" },
            ],
            value: typeFilter,
            onChange: setTypeFilter,
          },
        ]}
        trailing={<div className="flex items-center gap-2"><button type="button" onClick={() => setShowAdjustment(true)} className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">Add Adjustment</button><ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} /></div>}
      />
      <DataGrid<LedgerEntry> rows={filtered} columns={visibleColumns} loading={loading} pageSize={25} />
      {showAdjustment && <AdjustmentDialog onClose={() => setShowAdjustment(false)} onCreated={refetch} />}
    </div>
  );
}
