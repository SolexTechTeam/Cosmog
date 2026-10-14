"use client";

import { Select } from "@/components/ui/select";

interface FilterConfig {
  allLabel?: string;
  key: string;
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

interface SearchFilterBarProps {
  searchPlaceholder?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filters?: FilterConfig[];
  trailing?: React.ReactNode;
}

export default function SearchFilterBar({
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  filters = [],
  trailing,
}: SearchFilterBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <input
        type="text"
        aria-label={searchPlaceholder}
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-9 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 sm:min-w-[220px] sm:flex-1"
      />
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filter.value}
          aria-label={filter.label}
          onChange={(e) => filter.onChange(e.target.value)}
          className="h-9 w-full shrink-0 rounded-md border-border pl-3 text-sm focus:ring-primary/30 sm:w-36"
        >
          <option value="">{filter.allLabel ?? filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      ))}
      {trailing && <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:ml-auto sm:w-auto">{trailing}</div>}
    </div>
  );
}
