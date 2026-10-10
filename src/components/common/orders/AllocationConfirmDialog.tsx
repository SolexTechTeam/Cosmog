"use client";

import { useState, useMemo } from "react";
import StatusBadge from "@/components/common/StatusBadge";
import type { SuggestedAllocationItem } from "@/types";

interface SoAllocationGroup {
  sale_order_id: string;
  so_number?: string;
  suggested_allocations?: SuggestedAllocationItem[];
  priority_points?: number;
  items?: unknown[];
  error?: string;
}

interface ManualAllocation {
  sale_order_item_id: string;
  inventory_lot_id: string;
  quantity: number;
}

interface AllocationConfirmDialogProps {
  title: string;
  description?: string;
  suggestions: SoAllocationGroup[];
  mode: "confirm" | "review";
  ownLotIds?: Map<string, number>;
  onAutoAllocate?: (soIds: string[]) => Promise<void>;
  onManualAllocate?: (soId: string, allocations: ManualAllocation[]) => Promise<void>;
  onClose: () => void;
}

type EditState = Map<string, Map<string, number>>;

function buildEditState(suggestions: SoAllocationGroup[]): EditState {
  const state: EditState = new Map();
  for (const group of suggestions) {
    if (group.error || !group.suggested_allocations) continue;
    for (const item of group.suggested_allocations) {
      const lotMap = new Map<string, number>();
      for (const lot of item.allocations) {
        lotMap.set(lot.lot_id, lot.quantity);
      }
      state.set(item.sale_order_item_id, lotMap);
    }
  }
  return state;
}

function isEdited(original: SoAllocationGroup[], editState: EditState): boolean {
  for (const group of original) {
    if (group.error || !group.suggested_allocations) continue;
    for (const item of group.suggested_allocations) {
      const lotMap = editState.get(item.sale_order_item_id);
      if (!lotMap) continue;
      for (const lot of item.allocations) {
        const edited = lotMap.get(lot.lot_id);
        if (edited !== lot.quantity) return true;
      }
    }
  }
  return false;
}

export default function AllocationConfirmDialog({ title, description, suggestions, mode, ownLotIds, onAutoAllocate, onManualAllocate, onClose }: AllocationConfirmDialogProps) {
  const [loading, setLoading] = useState(false);
  const [editState, setEditState] = useState<EditState>(() => buildEditState(suggestions));

  const filteredSuggestions = useMemo(() => {
    const valid = suggestions.filter((s) => !s.error);
    if (!ownLotIds || ownLotIds.size === 0) return valid;
    return valid
      .map((group) => {
        if (!group.suggested_allocations) return null;
        const relevantItems = group.suggested_allocations.filter((item) =>
          item.allocations.some((lot) => ownLotIds.has(lot.lot_id))
        );
        if (relevantItems.length === 0) return null;
        return { ...group, suggested_allocations: relevantItems };
      })
      .filter(Boolean) as SoAllocationGroup[];
  }, [suggestions, ownLotIds]);
  const errorCount = suggestions.filter((s) => s.error).length;
  const hasEdits = useMemo(() => isEdited(suggestions, editState), [suggestions, editState]);

  function isOwnLot(lotId: string): boolean {
    return !ownLotIds || ownLotIds.has(lotId);
  }

  function getLotMax(lotId: string): number | undefined {
    return ownLotIds?.get(lotId);
  }

  const unallocatedWarning = useMemo(() => {
    if (!ownLotIds || ownLotIds.size === 0) return null;
    let totalPo = 0;
    let totalAllocated = 0;
    for (const [lotId, maxQty] of ownLotIds) {
      totalPo += maxQty;
      for (const group of filteredSuggestions) {
        for (const item of group.suggested_allocations ?? []) {
          for (const lot of item.allocations) {
            if (lot.lot_id === lotId) {
              totalAllocated += editState.get(item.sale_order_item_id)?.get(lot.lot_id) ?? lot.quantity;
            }
          }
        }
      }
    }
    const remaining = totalPo - totalAllocated;
    if (remaining > 0) return `${remaining} unit${remaining !== 1 ? "s" : ""} from this PO remain unallocated.`;
    return null;
  }, [ownLotIds, filteredSuggestions, editState]);

  function updateQty(itemId: string, lotId: string, qty: number) {
    const max = getLotMax(lotId);
    const clamped = max != null ? Math.min(Math.max(0, qty), max) : Math.max(0, qty);
    setEditState((prev) => {
      const next = new Map(prev);
      const lotMap = new Map(next.get(itemId) ?? new Map());
      lotMap.set(lotId, clamped);
      next.set(itemId, lotMap);
      return next;
    });
  }

  function getQty(itemId: string, lotId: string, fallback: number): number {
    return editState.get(itemId)?.get(lotId) ?? fallback;
  }

  function getEditedShortfall(item: SuggestedAllocationItem): number {
    const totalEdited = item.allocations.reduce((sum, lot) => sum + getQty(item.sale_order_item_id, lot.lot_id, lot.quantity), 0);
    return Math.max(0, item.quantity_needed - item.already_allocated - totalEdited);
  }

  async function handleAutoAllocate() {
    if (!onAutoAllocate) return;
    setLoading(true);
    try {
      const soIds = filteredSuggestions.map((s) => s.sale_order_id);
      await onAutoAllocate(soIds);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualAllocate() {
    if (!onManualAllocate) return;
    setLoading(true);
    try {
      for (const group of filteredSuggestions) {
        if (!group.suggested_allocations) continue;
        const allocations: ManualAllocation[] = [];
        for (const item of group.suggested_allocations) {
          for (const lot of item.allocations) {
            const qty = getQty(item.sale_order_item_id, lot.lot_id, lot.quantity);
            if (qty > 0) {
              allocations.push({ sale_order_item_id: item.sale_order_item_id, inventory_lot_id: lot.lot_id, quantity: qty });
            }
          }
        }
        if (allocations.length > 0) {
          await onManualAllocate(group.sale_order_id, allocations);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" role="presentation" onMouseDown={onClose}>
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
          {filteredSuggestions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No allocation suggestions available.</p>
          ) : (
            <div className="space-y-4">
              {filteredSuggestions.map((group) => (
                <div key={group.sale_order_id} className="rounded-md border border-border bg-muted/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">
                    {group.so_number ? (
                      <span className="text-primary">{group.so_number}</span>
                    ) : (
                      <span>SO: <span className="text-primary">{group.sale_order_id.slice(0, 8)}...</span></span>
                    )}
                    {group.priority_points != null && <span className="ml-2 text-muted-foreground">({group.priority_points} pts)</span>}
                  </p>

                  {group.suggested_allocations && group.suggested_allocations.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="pb-1 font-medium">Product</th>
                          <th className="pb-1 text-right font-medium">Needed</th>
                          <th className="pb-1 text-right font-medium">Already</th>
                          <th className="pb-1 text-center font-medium">Lot Allocations</th>
                          <th className="pb-1 text-right font-medium">Shortfall</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.suggested_allocations.map((item) => {
                          const shortfall = mode === "confirm" ? getEditedShortfall(item) : item.shortfall;
                          return (
                            <tr key={item.sale_order_item_id}>
                              <td className="py-1.5 font-medium">{item.product_name}</td>
                              <td className="py-1.5 text-right tabular-nums">{item.quantity_needed}</td>
                              <td className="py-1.5 text-right tabular-nums">{item.already_allocated}</td>
                              <td className="py-1.5">
                                {item.allocations.length > 0 ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {item.allocations.map((lot, i) => {
                                      const editable = mode === "confirm" && isOwnLot(lot.lot_id);
                                      return (
                                        <div key={i} className="flex items-center gap-1.5">
                                          <StatusBadge status={lot.lot_status} />
                                          {editable ? (
                                            <input
                                              type="number"
                                              min={0}
                                              max={getLotMax(lot.lot_id)}
                                              value={getQty(item.sale_order_item_id, lot.lot_id, lot.quantity)}
                                              onChange={(e) => updateQty(item.sale_order_item_id, lot.lot_id, parseInt(e.target.value) || 0)}
                                              className="h-6 w-14 rounded border border-border bg-background px-1 text-center text-xs tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
                                            />
                                          ) : (
                                            <span className="tabular-nums text-muted-foreground">{lot.quantity}</span>
                                          )}
                                          <span className="text-muted-foreground tabular-nums">${lot.unit_cost.toFixed(2)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className={`py-1.5 text-right tabular-nums ${shortfall > 0 ? "text-destructive font-medium" : ""}`}>
                                {shortfall > 0 ? shortfall : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-muted-foreground">No items to allocate.</p>
                  )}
                </div>
              ))}
            </div>
          )}
          {errorCount > 0 && <p className="mt-3 text-xs text-destructive">{errorCount} order(s) had allocation errors.</p>}
          {unallocatedWarning && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 dark:border-amber-700 dark:bg-amber-950/30">
              <span className="mt-px text-amber-600 dark:text-amber-400">&#9888;</span>
              <p className="text-xs font-medium text-amber-800 dark:text-amber-300">{unallocatedWarning}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          {mode === "confirm" ? (
            <>
              <button type="button" onClick={onClose} disabled={loading} className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
                {filteredSuggestions.length === 0 ? "Continue" : "Skip Allocation"}
              </button>
              {hasEdits ? (
                <button
                  type="button"
                  onClick={handleManualAllocate}
                  disabled={loading || filteredSuggestions.length === 0}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Allocating..." : "Save Manual Allocation"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAutoAllocate}
                  disabled={loading || filteredSuggestions.length === 0}
                  className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {loading ? "Allocating..." : "Accept & Allocate"}
                </button>
              )}
            </>
          ) : (
            <button type="button" onClick={onClose} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
