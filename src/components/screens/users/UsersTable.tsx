"use client";

import { useState, useMemo } from "react";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { Profile } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function UsersTable() {
  const { data, loading, error } = useApi<Profile[]>("/api/profiles");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const users = data ?? [];
  const adminCount = users.filter((u) => u.role === "admin").length;
  const staffCount = users.filter((u) => u.role === "staff").length;
  const activeCount = users.filter((u) => u.is_active).length;

  const filtered = useMemo(() => {
    let rows = users;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter) rows = rows.filter((r) => r.role === roleFilter);
    return rows;
  }, [users, search, roleFilter]);

  const allColumns: ColDef<Profile>[] = useMemo(
    () => [
      { field: "name", headerName: "Name", minWidth: 200 },
      { field: "email", headerName: "Email", minWidth: 250 },
      {
        field: "role",
        headerName: "Role",
        minWidth: 110,
        valueFormatter: (p) => (p.value ?? "").charAt(0).toUpperCase() + (p.value ?? "").slice(1),
      },
      {
        field: "is_active",
        headerName: "Status",
        minWidth: 110,
        cellRenderer: (p: { value: boolean }) =>
          StatusBadge({ status: p.value ? "active" : "depleted" }),
      },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(allColumns);

  if (error) {
    return <p className="text-sm text-red-500">Failed to load users: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <SearchFilterBar
          searchPlaceholder="Search name, email..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              key: "role",
              label: "Role",
              options: [
                { label: "Admin", value: "admin" },
                { label: "Staff", value: "staff" },
              ],
              value: roleFilter,
              onChange: setRoleFilter,
            },
          ]}
          trailing={<ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />}
        />
        <DataGrid<Profile> rows={filtered} columns={visibleColumns} loading={loading} pageSize={25} />
      </div>
    </div>
  );
}
