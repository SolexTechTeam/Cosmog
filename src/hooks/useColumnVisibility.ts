"use client";

import { useState, useMemo } from "react";
import type { ColDef } from "ag-grid-community";

export function useColumnVisibility<T>(columns: ColDef<T>[], initialHidden: Set<string> = new Set()) {
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(initialHidden);

  const columnKeys = useMemo(
    () =>
      columns.map((c) => ({
        key: c.field ?? c.headerName ?? "",
        label: (c.headerName ?? c.field ?? "") as string,
      })),
    [columns]
  );

  const visibleColumns = useMemo(
    () => columns.filter((c) => !hiddenCols.has(c.field ?? c.headerName ?? "")),
    [columns, hiddenCols]
  );

  function toggle(key: string) {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return { columnKeys, visibleColumns, hiddenCols, toggle };
}
