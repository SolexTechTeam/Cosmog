"use client";

import { useState, useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";
import type { Customer } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function CustomersTable() {
  const { data, loading, error } = useApi<Customer[]>("/api/customers");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const customers = data ?? [];
  const b2bCount = customers.filter((c) => c.customer_type === "b2b").length;
  const b2cCount = customers.filter((c) => c.customer_type === "b2c").length;

  const filtered = useMemo(() => {
    let rows = customers;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.handle ?? "").toLowerCase().includes(q) ||
          (r.email ?? "").toLowerCase().includes(q)
      );
    }
    if (typeFilter) rows = rows.filter((r) => r.customer_type === typeFilter);
    return rows;
  }, [customers, search, typeFilter]);

  const columns: ColDef<Customer>[] = useMemo(
    () => [
      { field: "name", headerName: "Name", minWidth: 200 },
      { field: "handle", headerName: "Handle", minWidth: 180 },
      { field: "email", headerName: "Email", minWidth: 220 },
      {
        field: "customer_type",
        headerName: "Type",
        minWidth: 100,
        valueFormatter: (p) => (p.value ?? "").toUpperCase(),
      },
      { field: "payment_terms", headerName: "Payment Terms", minWidth: 130 },
      {
        field: "created_at",
        headerName: "Created",
        minWidth: 110,
        valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : "—",
      },
    ],
    []
  );

  if (error) {
    return <p className="text-sm text-red-500">Failed to load customers: {error}</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-border bg-muted p-5 shadow-sm">
        <h2 className="text-header mb-4">Overview</h2>
        <MetricCardRow>
          <MetricCard label="Total Customers" value={loading ? "—" : customers.length} />
          <MetricCard label="B2B" value={loading ? "—" : b2bCount} />
          <MetricCard label="B2C" value={loading ? "—" : b2cCount} />
        </MetricCardRow>
      </div>
      <div className="flex flex-col gap-4">
        <SearchFilterBar
          searchPlaceholder="Search name, handle, email..."
          searchValue={search}
          onSearchChange={setSearch}
          filters={[
            {
              key: "type",
              label: "Type",
              options: [
                { label: "B2B", value: "b2b" },
                { label: "B2C", value: "b2c" },
                { label: "Special", value: "special" },
              ],
              value: typeFilter,
              onChange: setTypeFilter,
            },
          ]}
        />
        <DataGrid<Customer> rows={filtered} columns={columns} loading={loading} pageSize={25} />
      </div>
    </div>
  );
}
