"use client";

import { useState, useMemo, type FormEvent } from "react";
import Link from "next/link";
import { useColumnVisibility } from "@/hooks/useColumnVisibility";
import ColumnPicker from "@/components/common/ColumnPicker";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import DataGrid from "@/components/common/DataGrid";
import SearchFilterBar from "@/components/common/SearchFilterBar";
import StatusBadge from "@/components/common/StatusBadge";
import ErrorBlock from "@/components/ui/error-block";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import type { Profile } from "@/types";
import type { ColDef } from "ag-grid-community";

export default function UsersTable() {
  const { data, loading, error, refetch } = useApi<Profile[]>([...queryKeys.profiles], () => AetherClient.getProfiles());
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "staff" });

  const users = useMemo(() => data ?? [], [data]);

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
      {
        field: "name",
        headerName: "Name",
        minWidth: 200,
        cellRenderer: (params: { value: string; data?: Profile }) => params.data ? (
          <Link href={`/users/${params.data.id}`} className="font-medium text-primary hover:underline">{params.value}</Link>
        ) : params.value,
      },
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

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim() || newUser.password.length < 8) {
      setCreateError("Name, email, and a password of at least 8 characters are required.");
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      await AetherClient.createUser({ name: newUser.name.trim(), email: newUser.email.trim(), password: newUser.password, role: newUser.role });
      setNewUser({ name: "", email: "", password: "", role: "staff" });
      setShowCreate(false);
      toast("User created");
      refetch();
    } catch (caughtError) {
      setCreateError(caughtError instanceof Error ? caughtError.message : "Unable to create user.");
    } finally {
      setCreating(false);
    }
  }

  if (error) {
    return <ErrorBlock message={`Failed to load users: ${error}`} onRetry={refetch} />;
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
          trailing={<div className="flex items-center gap-2"><button type="button" onClick={() => { setCreateError(null); setShowCreate(true); }} className="h-10 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90">Add User</button><ColumnPicker columns={columnKeys} hiddenColumns={hiddenCols} onToggle={toggle} /></div>}
        />
        <DataGrid<Profile>
          rows={filtered}
          columns={visibleColumns}
          loading={loading}
          pageSize={25}
          showDetailsMenu
          detailsPageHref={(profile) => `/users/${profile.id}`}
          editConfig={{
            fields: [
              { key: "name", label: "Name", type: "text" },
              {
                key: "role",
                label: "Role",
                type: "select",
                options: [
                  { label: "Staff", value: "staff" },
                  { label: "Admin", value: "admin" },
                ],
              },
              {
                key: "is_active",
                label: "Active",
                type: "checkbox",
              },
            ],
            onSave: async (profile, changes) => {
              await AetherClient.updateProfile(profile.id, changes);
              toast(`User "${profile.name}" updated`);
              refetch();
            },
          }}
        />
      </div>
      {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={() => !creating && setShowCreate(false)}><form onSubmit={createUser} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-lg border border-border bg-card p-5 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="add-user-title"><h2 id="add-user-title" className="text-lg font-semibold">Add User</h2><p className="mt-1 text-sm text-muted-foreground">Admin access is required to create an account.</p><div className="mt-4 grid gap-4"><label className="grid gap-1 text-sm font-medium">Name<input required value={newUser.name} onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Email<input required type="email" value={newUser.email} onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Temporary password<input required type="password" minLength={8} value={newUser.password} onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 font-normal" /></label><label className="grid gap-1 text-sm font-medium">Role<Select value={newUser.role} onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value }))} className="h-10 font-normal"><option value="staff">Staff</option><option value="admin">Admin</option></Select></label></div>{createError && <p className="mt-3 text-sm text-destructive">{createError}</p>}<div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setShowCreate(false)} disabled={creating} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Cancel</button><button type="submit" disabled={creating} className="rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground disabled:opacity-60">{creating ? "Adding…" : "Add User"}</button></div></form></div>}
    </div>
  );
}
