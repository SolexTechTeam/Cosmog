"use client";

import { useMemo, useState, type FormEvent } from "react";
import { AetherClient } from "@/lib/aether-client";
import { Dialog } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { StockStatus } from "@/types";

const inputClass = "h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

interface TransformProductDialogProps {
  items: StockStatus[];
  onClose: () => void;
  onTransformed: () => void;
}

export default function TransformProductDialog({ items, onClose, onTransformed }: TransformProductDialogProps) {
  const sourceItems = useMemo(() => items.filter((item) => item.qty_available > 0), [items]);
  const [sourceProductId, setSourceProductId] = useState("");
  const [targetProductId, setTargetProductId] = useState("");
  const [sourceQuantity, setSourceQuantity] = useState("");
  const [outputQuantity, setOutputQuantity] = useState("");
  const [targetUnitCost, setTargetUnitCost] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const source = items.find((item) => item.product_id === sourceProductId);
  const targets = items.filter((item) => item.product_id !== sourceProductId);

  function chooseTarget(productId: string) {
    setTargetProductId(productId);
    const target = items.find((item) => item.product_id === productId);
    if (target && !targetUnitCost) setTargetUnitCost(target.avg_cost.toFixed(2));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const sourceQty = Number(sourceQuantity);
    const outputQty = Number(outputQuantity);
    const unitCost = Number(targetUnitCost);

    if (!source || !targetProductId) {
      setError("Select the source and output products.");
      return;
    }
    if (!Number.isInteger(sourceQty) || sourceQty < 1 || sourceQty > source.qty_available) {
      setError(`Source quantity must be between 1 and ${source.qty_available}.`);
      return;
    }
    if (!Number.isInteger(outputQty) || outputQty < 1) {
      setError("Output quantity must be a whole number of at least 1.");
      return;
    }
    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setError("Enter a valid target unit cost.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await AetherClient.transformInventory({
        from_product_id: sourceProductId,
        to_product_id: targetProductId,
        source_quantity: sourceQty,
        output_quantity: outputQty,
        target_unit_cost: unitCost,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      onTransformed();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert inventory.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog description="Available source stock becomes a new output lot." loading={saving} onClose={onClose} title="Convert Products" width={512}>
      <form onSubmit={submit}>
        {error && <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Source Product
            <Select required value={sourceProductId} onChange={(event) => { setSourceProductId(event.target.value); setTargetProductId(""); setTargetUnitCost(""); }} className={inputClass} disabled={saving || sourceItems.length === 0}>
              <option value="">{sourceItems.length ? "Select source product" : "No available stock"}</option>
              {sourceItems.map((item) => <option key={item.product_id} value={item.product_id}>{item.name} ({item.qty_available} available)</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Output Product
            <Select required value={targetProductId} onChange={(event) => chooseTarget(event.target.value)} className={inputClass} disabled={saving || !sourceProductId}>
              <option value="">Select output product</option>
              {targets.map((item) => <option key={item.product_id} value={item.product_id}>{item.name}</option>)}
            </Select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm font-medium">
              Source Quantity
              <input required type="number" min="1" max={source?.qty_available} step="1" value={sourceQuantity} onChange={(event) => setSourceQuantity(event.target.value)} placeholder="e.g. 2" className={inputClass} disabled={saving} />
              {source && <span className="text-xs font-normal text-muted-foreground">{source.qty_available} available</span>}
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Output Quantity
              <input required type="number" min="1" step="1" value={outputQuantity} onChange={(event) => setOutputQuantity(event.target.value)} placeholder="e.g. 72" className={inputClass} disabled={saving} />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium">
            Output Unit Cost
            <input required type="number" min="0" step="0.01" value={targetUnitCost} onChange={(event) => setTargetUnitCost(event.target.value)} placeholder="e.g. 2.50" className={inputClass} disabled={saving} />
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Notes
            <TextArea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} placeholder="e.g. Opened two cases into 72 boxes" disabled={saving} />
          </label>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">The inventory history will show a negative conversion for the source and a positive conversion for the output.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button>
          <button type="submit" disabled={saving || sourceItems.length === 0} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Converting…" : "Convert Products"}</button>
        </div>
      </form>
    </Dialog>
  );
}
