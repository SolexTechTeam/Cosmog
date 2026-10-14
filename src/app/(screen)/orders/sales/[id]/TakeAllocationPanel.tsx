"use client";

import { useState } from "react";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import StatusBadge from "@/components/common/StatusBadge";
import type { ReassignCandidate, ReassignCandidatesResponse } from "@/types";

interface Props {
  targetItemId: string;
  productName: string;
  onComplete: (donorSaleOrderId: string) => void;
  onClose: () => void;
}

export default function TakeAllocationPanel({ targetItemId, productName, onComplete, onClose }: Props) {
  const { data, loading, error, refetch } = useApi<ReassignCandidatesResponse>(
    [...queryKeys.reassignCandidates(targetItemId)],
    () => AetherClient.getReassignCandidates(targetItemId),
  );
  const [selected, setSelected] = useState<ReassignCandidate | null>(null);
  const [quantity, setQuantity] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const amount = Number(quantity);
  const validAmount = selected && Number.isInteger(amount) && amount >= 1 && amount <= selected.maximum_transferable;

  async function transfer() {
    if (!selected || !validAmount) return;
    setSaving(true);
    setActionError(null);
    try {
      await AetherClient.reassignAllocation({
        from_sale_order_item_id: selected.from_sale_order_item_id,
        to_sale_order_item_id: targetItemId,
        inventory_lot_id: selected.inventory_lot_id,
        quantity: amount,
      });
      setConfirming(false);
      onComplete(selected.sale_order_id);
    } catch (e) {
      setConfirming(false);
      setSelected(null);
      setQuantity("");
      setActionError(e instanceof Error ? e.message : "Could not transfer allocation.");
      await refetch();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-primary/30 bg-card p-4" aria-label={`Take allocation for ${productName}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Take allocation for {productName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Move reserved stock from another open sales order. That order will have less allocated stock after the transfer.</p>
        </div>
        <button type="button" onClick={onClose} disabled={saving} className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50">Close</button>
      </div>

      {loading && <p className="mt-4 text-sm text-muted-foreground">Loading other sales orders…</p>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">Could not load allocations: {error}</p>}
      {data && (
        <>
          <p className="mt-4 text-xs font-medium">Still needed: <span className="tabular-nums">{data.quantity_remaining}</span></p>
          {data.candidates.length === 0 ? (
            <p className="mt-3 rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">No eligible allocations on other open sales orders.</p>
          ) : (
            <div className="mt-3 max-h-64 space-y-2 overflow-y-auto" role="radiogroup" aria-label="Donor allocation">
              {data.candidates.map((candidate) => {
                const key = `${candidate.from_sale_order_item_id}:${candidate.inventory_lot_id}`;
                const chosen = selected?.from_sale_order_item_id === candidate.from_sale_order_item_id && selected.inventory_lot_id === candidate.inventory_lot_id;
                return (
                  <label key={key} className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm ${chosen ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                    <input type="radio" name={`donor-${targetItemId}`} checked={chosen} onChange={() => { setSelected(candidate); setQuantity(String(candidate.maximum_transferable)); setActionError(null); }} />
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{candidate.so_number}</span>
                      <span className="ml-2 text-xs text-muted-foreground">Lot {candidate.inventory_lot_id.slice(0, 8)}</span>
                    </span>
                    <StatusBadge status={candidate.lot_status} />
                    <span className="whitespace-nowrap text-xs tabular-nums">{candidate.allocated_quantity} allocated · max {candidate.maximum_transferable}</span>
                  </label>
                );
              })}
            </div>
          )}
          {selected && (
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1 text-xs font-medium" htmlFor={`take-qty-${targetItemId}`}>
                Quantity to transfer
                <input id={`take-qty-${targetItemId}`} type="number" min={1} max={selected.maximum_transferable} step={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-9 w-28 rounded-md border border-border bg-background px-2 text-sm tabular-nums" />
              </label>
              <button type="button" onClick={() => setConfirming(true)} disabled={!validAmount || saving} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Review transfer</button>
              <span className="text-xs text-muted-foreground">Up to {selected.maximum_transferable} from this allocation</span>
            </div>
          )}
        </>
      )}
      {actionError && <p role="alert" className="mt-3 text-xs text-destructive">{actionError} The available allocations have been refreshed.</p>}
      {confirming && selected && (
        <ConfirmDialog
          title="Transfer allocation?"
          description={`Move ${amount} ${productName} from ${selected.so_number} to this sales order? ${selected.so_number} will have ${amount} fewer units allocated. Total reserved stock will not change.`}
          confirmLabel="Transfer allocation"
          loading={saving}
          onConfirm={transfer}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  );
}
