"use client";

import { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import DirectoryPageHeader from "@/components/common/DirectoryPageHeader";
import CustomerAddressFields from "@/components/common/CustomerAddressFields";
import ErrorBlock from "@/components/ui/error-block";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { cleanCustomerAddress } from "@/lib/customer-address";
import { Building2, Star, UserRound, UsersRound } from "lucide-react";
import type { Customer, CustomerAddress } from "@/types";
import type { ColDef } from "ag-grid-community";

const emptyAddress: CustomerAddress = {
  line1: "",
  line2: "",
  city: "",
  state: "",
  postcode: "",
  country: "",
};

export default function CustomersTable() {
  const { data, loading, error, refetch } = useApi<Customer[]>([...queryKeys.customers], () => AetherClient.getCustomers());
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: "", handle: "", email: "", customer_type: "b2b", address: emptyAddress });

  const customers = useMemo(() => data ?? [], [data]);
  const b2bCount = customers.filter((c) => c.customer_type === "b2b").length;
  const b2cCount = customers.filter((c) => c.customer_type === "b2c").length;
  const specialCount = customers.filter((c) => c.customer_type === "special").length;

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

  const allColumns: ColDef<Customer>[] = useMemo(
    () => [
      {
        field: "name",
        headerName: "Name",
        minWidth: 200,
        cellRenderer: (params: { value: string; data?: Customer }) => params.data ? (
          <Link href={`/customers/${params.data.id}`} className="font-medium text-primary hover:underline">{params.value}</Link>
        ) : params.value,
      },
      { field: "handle", headerName: "Handle", minWidth: 180 },
      { field: "email", headerName: "Email", minWidth: 220 },
      {
        field: "customer_type",
        headerName: "Type",
        minWidth: 100,
        valueFormatter: (p) => (p.value ?? "").toUpperCase(),
      },
      {
        field: "created_at",
        headerName: "Created",
        minWidth: 110,
        valueFormatter: (p) => p.value ? new Date(p.value).toLocaleDateString() : "—",
      },
    ],
    []
  );

  const { columnKeys, visibleColumns, hiddenCols, toggle } = useColumnVisibility(allColumns);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newCustomer.name.trim()) {
      setCreateError("Customer name is required.");
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      await AetherClient.createCustomer({
        name: newCustomer.name.trim(),
        handle: newCustomer.handle.trim() || "",
        email: newCustomer.email.trim() || "",
        customer_type: newCustomer.customer_type,
        contact_info: {},
        address: cleanCustomerAddress(newCustomer.address),
      });
      setNewCustomer({ name: "", handle: "", email: "", customer_type: "b2b", address: emptyAddress });
      setShowCreate(false);
      toast("Customer created");
      refetch();
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : "Unable to create customer.");
    } finally {
      setCreating(false);
    }
  }

  if (error) {
    return <ErrorBlock message={`Failed to load customers: ${error}`} onRetry={refetch} />;
  }

  return (
    <>
      <DirectoryPageHeader
        title="Customers"
        description="Customer accounts, contact details, and sales history."
        loading={loading}
        summary={[
          { label: "Customers", value: customers.length, icon: <UsersRound size={18} /> },
          { label: "B2B", value: b2bCount, icon: <Building2 size={18} /> },
          { label: "B2C", value: b2cCount, icon: <UserRound size={18} /> },
          { label: "Special", value: specialCount, icon: <Star size={18} /> },
        ]}
        actions={
          <button
            type="button"
            onClick={() => { setCreateError(null); setShowCreate(true); }}
            className="h-9 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-auto"
          >
            Add customer
          </button>
        }
      />

      <section aria-label="Customer directory" className="flex min-w-0 flex-col gap-2">
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
          trailing={<ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} />}
        />
        <p className="px-1 text-xs text-muted-foreground" aria-live="polite">
          {loading ? "Loading customer records…" : `Showing ${filtered.length} of ${customers.length} customers`}
          {(search || typeFilter) && !loading && <button type="button" onClick={() => { setSearch(""); setTypeFilter(""); }} className="ml-2 font-medium text-primary hover:underline">Clear filters</button>}
        </p>
        <DataGrid<Customer>
          rows={filtered}
          columns={visibleColumns}
          loading={loading}
          pageSize={25}
          showDetailsMenu
          detailsPageHref={(customer) => `/customers/${customer.id}`}
        />
      </section>

      {showCreate && (
        <Dialog loading={creating} onClose={() => setShowCreate(false)} title="Add Customer" width={640}>
          <form onSubmit={createCustomer}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Name<Input required value={newCustomer.name} onChange={(event) => setNewCustomer((current) => ({ ...current, name: event.target.value }))} className="h-9 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">Handle<Input value={newCustomer.handle} onChange={(event) => setNewCustomer((current) => ({ ...current, handle: event.target.value }))} className="h-9 font-normal" /></label>
              <label className="grid gap-1 text-sm font-medium">Type<Select value={newCustomer.customer_type} onChange={(event) => setNewCustomer((current) => ({ ...current, customer_type: event.target.value }))} className="h-9 font-normal"><option value="b2b">B2B</option><option value="b2c">B2C</option><option value="special">Special</option></Select></label>
              <label className="grid gap-1 text-sm font-medium sm:col-span-2">Email<Input type="email" value={newCustomer.email} onChange={(event) => setNewCustomer((current) => ({ ...current, email: event.target.value }))} className="h-9 font-normal" /></label>
              <div className="border-t border-border pt-4 sm:col-span-2">
                <CustomerAddressFields
                  value={newCustomer.address}
                  onChange={(address) => setNewCustomer((current) => ({ ...current, address }))}
                />
              </div>
            </div>
            {createError && <p className="mt-3 text-sm text-destructive">{createError}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreate(false)} disabled={creating} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button>
              <button type="submit" disabled={creating} className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">{creating ? "Adding..." : "Add Customer"}</button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
