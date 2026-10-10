"use client";

import { useState } from "react";
import StatusBadge from "@/components/common/StatusBadge";

export interface OrderStatusOption {
  label: string;
  value: string;
}

interface OrderStatusWidgetProps {
  status: string;
  options: OrderStatusOption[];
  onUpdate: (status: string) => Promise<void>;
  isComplete?: boolean;
  completionLabel?: string;
}

export default function OrderStatusWidget({
  status,
  options,
  onUpdate,
  isComplete = false,
  completionLabel = "completed",
}: OrderStatusWidgetProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(nextStatus: string) {
    if (nextStatus === status || isComplete) return;

    setUpdating(true);
    setError(null);
    try {
      await onUpdate(nextStatus);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to update status.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <section className="min-w-[15rem] rounded-xl border-2 border-primary/30 bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">Status</p>
        <StatusBadge status={status} />
      </div>
      {isComplete ? (
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          This order is {completionLabel}; its status is locked.
        </p>
      ) : (
        <label className="mt-3 block">
          <span className="sr-only">Update status</span>
          <select
            value={status}
            onChange={(event) => handleChange(event.target.value)}
            disabled={updating}
            className="h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-base font-semibold capitalize text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-wait disabled:opacity-60"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      )}
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </section>
  );
}
