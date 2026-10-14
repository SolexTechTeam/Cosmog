"use client";

import { useState, useRef, useEffect } from "react";
import StatusBadge from "@/components/common/StatusBadge";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import { ChevronDown } from "lucide-react";

const transitionDescriptions: Record<string, string> = {
  cancelled: "Releases all inventory reservations",
  returned: "Reverses fulfillment, returns stock",
  shipped: "Allocates and fulfills inventory",
  received: "Receives inventory into lots",
};

export interface OrderStatusOption {
  label: string;
  value: string;
}

interface OrderStatusWidgetProps {
  status: string;
  options: OrderStatusOption[];
  onUpdate: (status: string) => Promise<void>;
  isComplete?: boolean;
  skipConfirm?: boolean;
  transitionDescriptionOverrides?: Record<string, string>;
  confirmConfigOverrides?: Partial<Record<string, { title: string; description: string; confirmLabel: string; variant: "destructive" | "primary" }>>;
}

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-150",
  shipped: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-150",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-150",
  cancelled: "bg-red-100 text-red-800 border-red-200 hover:bg-red-150",
  returned: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-150",
  draft: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-150",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-150",
  "in transit": "bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-150",
  received: "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-150",
};

const confirmConfig: Record<string, { title: string; description: string; confirmLabel: string; variant: "destructive" | "primary" }> = {
  cancelled: {
    title: "Cancel this order?",
    description: "This will release all inventory reservations for this order.",
    confirmLabel: "Cancel Order",
    variant: "destructive",
  },
  returned: {
    title: "Return this order?",
    description: "This will reverse fulfillment and return inventory to stock.",
    confirmLabel: "Return Order",
    variant: "destructive",
  },
  shipped: {
    title: "Mark as shipped?",
    description: "This will allocate and fulfill inventory for this order.",
    confirmLabel: "Mark Shipped",
    variant: "primary",
  },
  received: {
    title: "Mark as received?",
    description: "This will receive inventory into lots from this purchase order.",
    confirmLabel: "Mark Received",
    variant: "primary",
  },
};

export default function OrderStatusWidget({
  status,
  options,
  onUpdate,
  isComplete = false,
  skipConfirm = false,
  transitionDescriptionOverrides,
  confirmConfigOverrides,
}: OrderStatusWidgetProps) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function executeTransition(nextStatus: string) {
    setUpdating(true);
    setError(null);
    try {
      await onUpdate(nextStatus);
    } catch (caughtError) {
      const msg = caughtError instanceof Error ? caughtError.message : "Unable to update status.";
      setError(msg);
      console.error("Status transition failed:", msg);
    } finally {
      setUpdating(false);
    }
  }

  function handleSelect(nextStatus: string) {
    if (nextStatus === status || isComplete) return;
    setOpen(false);

    if (!skipConfirm && nextStatus in confirmConfig) {
      setPendingStatus(nextStatus);
    } else {
      executeTransition(nextStatus);
    }
  }

  function handleConfirm() {
    if (!pendingStatus) return;
    const next = pendingStatus;
    setPendingStatus(null);
    executeTransition(next);
  }

  function handleCancelConfirm() {
    setPendingStatus(null);
  }

  const currentLabel = options.find((o) => o.value === status)?.label ?? status;
  const btnColors = statusColors[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const dialogConfig = pendingStatus ? confirmConfigOverrides?.[pendingStatus] ?? confirmConfig[pendingStatus] : null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !isComplete && !updating && setOpen(!open)}
        disabled={isComplete || updating}
        className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-0.5 text-sm font-semibold capitalize shadow-sm transition-colors disabled:opacity-60 ${btnColors}`}
      >
        {currentLabel}
        {!isComplete && <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-border bg-card py-1 shadow-xl">
          {options
            .filter((o) => o.value !== status)
            .map((option) => {
              const description = transitionDescriptionOverrides?.[option.value] ?? transitionDescriptions[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="text-muted-foreground">Transition to</span>
                    <StatusBadge status={option.value} />
                  </span>
                  {description && (
                    <span className="mt-0.5 text-[11px] text-muted-foreground">{description}</span>
                  )}
                </button>
              );
            })}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {dialogConfig && pendingStatus && (
        <ConfirmDialog
          title={dialogConfig.title}
          description={dialogConfig.description}
          confirmLabel={dialogConfig.confirmLabel}
          variant={dialogConfig.variant}
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
          loading={updating}
        />
      )}
    </div>
  );
}
