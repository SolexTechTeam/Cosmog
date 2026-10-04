"use client";

import { AgGridReact } from "ag-grid-react";
import { AllCommunityModule, ModuleRegistry, type ColDef } from "ag-grid-community";

ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps<T> {
  rows: T[];
  columns: ColDef<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  pageSize?: number;
}

export default function DataGrid<T>({
  rows,
  columns,
  loading = false,
  onRowClick,
  pageSize = 30,
}: DataGridProps<T>) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <AgGridReact<T>
        rowData={rows}
        columnDefs={columns}
        loading={loading}
        domLayout="autoHeight"
        pagination
        paginationPageSize={pageSize}
        rowSelection="single"
        onRowClicked={onRowClick ? (e) => e.data && onRowClick(e.data) : undefined}
        suppressCellFocus
        defaultColDef={{
          sortable: true,
          unSortIcon: true,
          resizable: true,
          filter: true,
          flex: 1,
          minWidth: 100,
        }}
      />
    </div>
  );
}
