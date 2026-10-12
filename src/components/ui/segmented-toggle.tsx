"use client";

import { cn } from "@/lib/utils";

interface SegmentedToggleOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedToggleProps<T extends string> {
  ariaLabel: string;
  className?: string;
  onValueChange: (value: T) => void;
  options: SegmentedToggleOption<T>[];
  value: T | null;
}

export function SegmentedToggle<T extends string>({
  ariaLabel,
  className,
  onValueChange,
  options,
  value,
}: SegmentedToggleProps<T>) {
  return (
    <div aria-label={ariaLabel} className={cn("flex h-8 items-center rounded-md border border-border p-0.5 text-xs font-medium", className)} role="group">
      {options.map((option) => {
        const selected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "h-full rounded px-2 outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected
                ? "bg-orange-100 text-orange-950 hover:bg-orange-200"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
