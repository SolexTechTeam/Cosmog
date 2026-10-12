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
    <div className="flex items-center gap-2 overflow-x-auto">
      <input
        type="text"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-8 min-w-[180px] flex-1 rounded-md border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
          className="h-8 w-32 shrink-0 rounded-md border-border pl-2.5 text-xs focus:ring-primary/30"
        >
          <option value="">{filter.allLabel ?? filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      ))}
      {trailing && <div className="ml-auto flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
