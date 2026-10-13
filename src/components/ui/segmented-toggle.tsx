"use client";

import { Segmented } from "antd";
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
    <Segmented
      aria-label={ariaLabel}
      className={cn("h-8 text-xs font-medium", className)}
      options={options}
      onChange={(nextValue) => onValueChange(nextValue as T)}
      value={value ?? undefined}
    />
  );
}
