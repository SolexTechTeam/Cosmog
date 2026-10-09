"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import DataGrid from "@/components/common/DataGrid";
import StatusBadge from "@/components/common/StatusBadge";
import { allocationLabel, isActiveSaleOrderStatus, ownerName } from "@/lib/utils";
import type { Profile, SaleOrder } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function ActiveOrdersWidget() {
  const { data, loading, error } = useApi<SaleOrder[]>("/api/sale-orders");
  const { data: profiles } = useApi<Profile[]>("/api/profiles");
  const activeOrders = useMemo(
    () => (data ?? []).filter((order) => isActiveSaleOrderStatus(order.status)),
    [data]
  );

  const columns: ColDef<SaleOrder>[] = useMemo(
    () => [
      {
        field: "so_number",
        headerName: "SO #",
        width: 130,
        cellRenderer: (params: { value: string; data?: SaleOrder }) => params.data ? (
          <Link href={`/orders/sales/${params.data.id}`} className="font-medium text-primary hover:underline">
            {params.value}
          </Link>
        ) : params.value,
      },
      {
        headerName: "Owner",
        valueGetter: (p) => ownerName(p.data?.owner_id, profiles ?? []),
        width: 120,
      },
      {
        headerName: "Customer",
        valueGetter: (p) => p.data?.customer?.name ?? "—",
        flex: 1,
        minWidth: 150,
      },
      { field: "order_date", headerName: "Date", width: 110 },
      {
        field: "status",
        headerName: "Status",
        width: 120,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      {
        headerName: "Procurement",
        width: 140,
        valueGetter: (p) => p.data ? allocationLabel(p.data.allocation_status) : "—",
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      {
        field: "priority",
        headerName: "Priority",
        width: 110,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      {
        field: "payment_status",
        headerName: "Payment",
        width: 140,
        cellRenderer: (p: { value: string }) => StatusBadge({ status: p.value }),
      },
      {
        field: "source",
        headerName: "Source",
        width: 110,
      },
      {
        headerName: "Total",
        width: 110,
        valueGetter: (p) => {
          const items = p.data?.items ?? [];
          const itemTotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
          return `$${(itemTotal + (p.data?.shipping_cost ?? 0)).toFixed(2)}`;
        },
      },
    ],
    [profiles]
  );

  if (error) {
    return <p className="text-sm text-red-500">Failed to load active orders: {error}</p>;
  }

  return <DataGrid<SaleOrder> rows={activeOrders} columns={columns} loading={loading} pageSize={10} />;
}
