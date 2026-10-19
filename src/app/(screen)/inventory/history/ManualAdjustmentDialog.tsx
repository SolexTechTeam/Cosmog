"use client";

import { useState, type FormEvent } from "react";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { Dialog } from "@/components/ui/dialog";
import { TextArea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Tooltip } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import type { InventoryLot, Product } from "@/types";

const inputClass = "h-10 w-full rounded-md border border-input bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

function isValidAudAmount(value: string): boolean {
  return /^\d+(?:\.\d{1,2})?$/.test(value);
}

export default function ManualAdjustmentDialog({ onClose }: { onClose: () => void }) {
  const { data: products } = useApi<Product[]>([...queryKeys.products], () => AetherClient.getProducts());
  const invalidate = useInvalidate();
  const [adjustmentType, setAdjustmentType] = useState<"increment" | "decrement" | "">("");
  const [productId, setProductId] = useState("");
  const [quantityToAdd, setQuantityToAdd] = useState("");
  const [quantityToRemove, setQuantityToRemove] = useState("");
  const [unitCostInput, setUnitCostInput] = useState("");
  const [lotQuantities, setLotQuantities] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const quantity = Number(quantityToAdd);
  const decreaseTarget = Number(quantityToRemove);
  const isIncrement = adjustmentType === "increment";
  const isDecrement = adjustmentType === "decrement";
  const { data: lots, loading: lotsLoading, error: lotsError } = useApi<InventoryLot[]>(
    [...queryKeys.inventoryLots, productId],
    () => AetherClient.getInventoryLots({ product_id: productId, status: "on_hand" }),
    { enabled: Boolean(productId && isDecrement) }
  );
  const selectedDecrements = Object.entries(lotQuantities)
    .map(([inventory_lot_id, value]) => ({ inventory_lot_id, quantity: Number(value) }))
    .filter((lot) => Number.isInteger(lot.quantity) && lot.quantity > 0);
  const selectedQuantity = selectedDecrements.reduce((sum, lot) => sum + lot.quantity, 0);
  const isUnitCostValid = isValidAudAmount(unitCostInput);
  const selectedLotsExceedAvailable = selectedDecrements.some((selected) => {
    const lot = lots?.find((item) => item.id === selected.inventory_lot_id);
    return !lot || selected.quantity > lot.quantity_on_hand - lot.quantity_reserved;
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!adjustmentType || !productId) {
      setError("Choose whether to add or remove stock, then select a product.");
      return;
    }
    if (isIncrement && (!Number.isInteger(quantity) || quantity <= 0)) {
      setError("Enter a whole number of units to add.");
      return;
    }
    if (isIncrement && !isUnitCostValid) {
      setError("Enter the landed cost per unit in AUD to the nearest cent.");
      return;
    }
    if (isDecrement && (!Number.isInteger(decreaseTarget) || decreaseTarget <= 0)) {
      setError("Enter a whole-number quantity to remove.");
      return;
    }
    if (isDecrement && (selectedQuantity !== decreaseTarget || selectedLotsExceedAvailable)) {
      setError(`The quantities selected from lots must add up to exactly ${decreaseTarget} units.`);
      return;
    }
    try {
      setSaving(true);
      setError(null);
      await AetherClient.createLedgerAdjustment({
        product_id: productId,
        quantity_change: isIncrement ? quantity : -decreaseTarget,
        ...(isIncrement ? { unit_cost_aud: Number(unitCostInput) } : { lot_decrements: selectedDecrements }),
        ...(isIncrement && notes.trim() ? { notes: notes.trim() } : {}),
      });
      await Promise.all([
        invalidate([...queryKeys.ledger]),
        invalidate([...queryKeys.inventoryLots]),
        invalidate([...queryKeys.stockStatus]),
        invalidate([...queryKeys.inventorySummary]),
      ]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create adjustment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog loading={saving} onClose={onClose} title="Manual Adjustment" width={580}>
      <form className="px-1" onSubmit={submit}>
        {error && <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm font-medium">
            Adjustment type
            <Select required value={adjustmentType} onChange={(e) => { setAdjustmentType(e.target.value as "increment" | "decrement" | ""); setLotQuantities({}); setError(null); }} className={inputClass}>
              <option value="">Choose an action</option>
              <option value="increment">Add stock</option>
              <option value="decrement">Remove stock</option>
            </Select>
            <span className="text-xs font-normal text-muted-foreground">
              {isIncrement ? "Add units by creating a new inventory lot." : isDecrement ? "Choose existing lots and the quantity to remove from each." : "Choose whether this adjustment adds or removes inventory."}
            </span>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            Product
            <Select searchable required value={productId} onChange={(e) => { setProductId(e.target.value); setLotQuantities({}); setError(null); }} className={inputClass}>
              <option value="">Select product</option>
              {(products ?? []).map((p) => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
            </Select>
          </label>
          {isIncrement && (
            <>
              <label className="grid gap-1 text-sm font-medium">
                Quantity to add
                <input required type="number" min="1" step="1" value={quantityToAdd} onChange={(e) => { setQuantityToAdd(e.target.value); setError(null); }} placeholder="Number of units" className={inputClass} />
              </label>
              <label className="grid gap-1 text-sm font-medium">
                Landed cost per unit (AUD)
                <span className="flex h-10 overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
                  <span aria-hidden="true" className="flex items-center border-r border-input bg-muted px-3 text-sm text-muted-foreground">$AUD</span>
                  <input required aria-label="Landed cost per unit in AUD" type="number" min="0" step="0.01" value={unitCostInput} onChange={(e) => { setUnitCostInput(e.target.value); setError(null); }} placeholder="0.00" className="h-full min-w-0 flex-1 bg-transparent px-3 outline-none" />
                </span>
                <span className="text-xs font-normal text-muted-foreground">Enter the cost per-unit</span>
              </label>

              <label className="grid gap-1 text-sm font-medium">
                Notes (optional: Shows on ledger upon click)
                <TextArea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Add a reason or reference" />
              </label>
            </>
          )}
          {isDecrement && productId && (
            <>
              <label className="grid gap-1 text-sm font-medium">
                Quantity to remove
                <input required type="number" min="1" step="1" value={quantityToRemove} onChange={(e) => { setQuantityToRemove(e.target.value); setError(null); }} placeholder="Total units to remove" className={inputClass} />
              </label>
              <fieldset className="grid gap-2 rounded-md border p-3">
                <legend className="px-1 text-sm font-medium">Choose lots to remove</legend>
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-foreground">Assign the full quantity across lots</p>
                    <Tooltip content="Enter how many units to remove from each lot. The lot quantities must add up exactly to the quantity to remove. Reserved units are not available.">
                      <button type="button" aria-label="Help assigning lot quantities" className="rounded-sm text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                        <Info size={16} />
                      </button>
                    </Tooltip>
                  </div>
                  <p aria-live="polite" className={`mt-1 text-s font-bold tabular-nums ${selectedQuantity === decreaseTarget && decreaseTarget > 0 ? "text-green-700" : "text-foreground"}`}>
                    {selectedQuantity} of {Number.isInteger(decreaseTarget) && decreaseTarget > 0 ? decreaseTarget : "—"} units assigned
                  </p>
                  {Number.isInteger(decreaseTarget) && decreaseTarget > 0 && selectedQuantity < decreaseTarget && <p className="text-xs font-medium text-muted-foreground">Assign {decreaseTarget - selectedQuantity} more {decreaseTarget - selectedQuantity === 1 ? "unit" : "units"} to a lot.</p>}
                  {Number.isInteger(decreaseTarget) && decreaseTarget > 0 && selectedQuantity > decreaseTarget && <p className="text-xs font-medium text-destructive">Reduce the lot quantities by {selectedQuantity - decreaseTarget} {selectedQuantity - decreaseTarget === 1 ? "unit" : "units"} to match.</p>}
                </div>
                {lotsLoading && <p className="text-sm text-muted-foreground">Loading on-hand lots…</p>}
                {lotsError && <p className="text-sm text-destructive">Could not load inventory lots: {lotsError}</p>}
                {!lotsLoading && !lotsError && (lots ?? []).some((lot) => lot.quantity_on_hand - lot.quantity_reserved > 0) && (
                  <div className="max-h-60 overflow-auto rounded-md border border-border">
                    <table className="w-full min-w-[450px] border-collapse text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
                        <tr>
                          <th scope="col" className="px-3 py-2 font-semibold">Received</th>
                          <th scope="col" className="px-3 py-2 font-semibold">Unit cost</th>
                          <th scope="col" className="px-3 py-2 text-right font-semibold">Available</th>
                          <th scope="col" className="px-3 py-2 text-right font-semibold">Remove</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {(lots ?? []).filter((lot) => lot.quantity_on_hand - lot.quantity_reserved > 0).map((lot) => {
                          const available = lot.quantity_on_hand - lot.quantity_reserved;
                          return (
                            <tr key={lot.id} className="hover:bg-muted/50">
                              <td className="whitespace-nowrap px-3 py-2">{new Date(lot.received_at ?? lot.created_at).toLocaleDateString()}</td>
                              <td className="whitespace-nowrap px-3 py-2">A${Number(lot.unit_cost).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right tabular-nums">{available}</td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  aria-label={`Quantity to remove from lot received ${new Date(lot.received_at ?? lot.created_at).toLocaleDateString()}`}
                                  type="number"
                                  min="0"
                                  max={available}
                                  step="1"
                                  value={lotQuantities[lot.id] ?? "0"}
                                  onChange={(e) => { setLotQuantities((current) => ({ ...current, [lot.id]: e.target.value })); setError(null); }}
                                  onBlur={() => { if (!lotQuantities[lot.id]) setLotQuantities((current) => ({ ...current, [lot.id]: "0" })); }}
                                  className="h-9 w-20 rounded-md border border-input bg-background px-2 text-right tabular-nums outline-none focus:ring-2 focus:ring-ring"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {!lotsLoading && !lotsError && (lots ?? []).every((lot) => lot.quantity_on_hand - lot.quantity_reserved <= 0) && <p className="text-sm text-muted-foreground">No available on-hand lots.</p>}
                <p className="text-xs text-muted-foreground">Only available stock can be removed; reserved units are excluded.</p>
              </fieldset>
            </>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button>
          <button type="submit" disabled={saving || !adjustmentType || !productId || (isIncrement && (!Number.isInteger(quantity) || quantity <= 0 || !isUnitCostValid)) || (isDecrement && (!Number.isInteger(decreaseTarget) || decreaseTarget <= 0 || lotsLoading || Boolean(lotsError) || selectedQuantity !== decreaseTarget || selectedLotsExceedAvailable))} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{saving ? "Saving…" : isIncrement ? "Add Stock" : isDecrement ? "Remove Stock" : "Save Adjustment"}</button>
        </div>
      </form>
    </Dialog>
  );
}
