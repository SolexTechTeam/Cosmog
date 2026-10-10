"use client";

import { useState, useRef, useEffect } from "react";

interface ColumnPickerProps {
  columns: { key: string; label: string }[];
  hiddenColumns: Set<string>;
  onToggle: (key: string) => void;
}

export default function ColumnPicker({ columns, hiddenColumns, onToggle }: ColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const visibleCount = columns.length - hiddenColumns.size;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 bg-background transition-colors whitespace-nowrap"
      >
        Columns ({visibleCount}/{columns.length})
      </button>
      {open && (
        <div className="absolute top-11 right-0 z-50 bg-card border border-border rounded-lg shadow-lg p-3 min-w-[180px] max-h-[300px] overflow-y-auto">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 py-1 px-1 text-sm text-foreground hover:bg-muted rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={!hiddenColumns.has(col.key)}
                onChange={() => onToggle(col.key)}
                className="accent-primary"
              />
              {col.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
