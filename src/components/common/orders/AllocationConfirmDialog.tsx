"use client";

import { useState } from "react";
import StatusBadge from "@/components/common/StatusBadge";
import type { SuggestedAllocationItem } from "@/types";

interface SoAllocationGroup {
  sale_order_id: string;
  suggested_allocations?: SuggestedAllocationItem[];
  priority_points?: number;
  items?: unknown[];
  error?: string;
}

interface AllocationConfirmDialogProps {
  title: string;
  description?: string;
  suggestions: SoAllocationGroup[];
  mode: "confirm" | "review";
  onConfirm?: () => Promise<void>;
  onClose: () => void;
}

export default function AllocationConfirmDialog({ title, description, suggestions, mode, onConfirm, onClose }: AllocationConfirmDialogProps) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!onConfirm) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  const validSuggestions = suggestions.filter((s) => !s.error);
  const errorCount = suggestions.filter((s) => s.error).length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" role="presentation" onMouseDown={onClose}>
      <div
        className="w-full max-w-2xl rounded-lg border border-border bg-card shadow-xl"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
          {validSuggestions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No allocation suggestions available.</p>
          ) : (
            <div className="space-y-4">
              {validSuggestions.map((group) => (
                <div key={group.sale_order_id} className="rounded-md border border-border bg-muted/50 p-3">
                  <p className="mb-2 text-xs font-semibold text-foreground">
                    SO: <span className="text-primary">{group.sale_order_id.slice(0, 8)}...</span>
                    {group.priority_points != null && (
                      <span className="ml-2 text-muted-foreground">({group.priority_points} pts)</span>
                    )}
                  </p>

                  {group.suggested_allocations && group.suggested_allocations.length > 0 ? (
                    <table className="w-full text-left text-xs">
                      <thead className="text-muted-foreground">
                        <tr>
                          <th className="pb-1 font-medium">Product</th>
                          <th className="pb-1 text-right font-medium">Needed</th>
                          <th className="pb-1 text-right font-medium">Allocated</th>
                          <th className="pb-1 text-right font-medium">Suggested</th>
                          <th className="pb-1 text-right font-medium">Shortfall</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {group.suggested_allocations.map((item) => (
                          <tr key={item.sale_order_item_id}>
                            <td className="py-1.5 font-medium">{item.product_name}</td>
                            <td className="py-1.5 text-right tabular-nums">{item.quantity_needed}</td>
                            <td className="py-1.5 text-right tabular-nums">{item.already_allocated}</td>
                            <td className="py-1.5 text-right">
                              {item.allocations.length > 0 ? (
                                <div className="flex flex-col items-end gap-0.5">
                                  {item.allocations.map((lot, i) => (
                                    <span key={i} className="flex items-center gap-1">
                                      <StatusBadge status={lot.lot_status} />
                                      <span className="tabular-nums">{lot.quantity}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className={`py-1.5 text-right tabular-nums ${item.shortfall > 0 ? "text-destructive font-medium" : ""}`}>
                              {item.shortfall > 0 ? item.shortfall : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-xs text-muted-foreground">No items to allocate.</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {errorCount > 0 && (
            <p className="mt-3 text-xs text-destructive">{errorCount} order(s) had allocation errors.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          {mode === "confirm" ? (
            <>
              <button type="button" onClick={onClose} disabled={loading} className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
                Skip Allocation
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || validSuggestions.length === 0}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
              >
                {loading ? "Allocating..." : "Confirm Allocation"}
              </button>
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
