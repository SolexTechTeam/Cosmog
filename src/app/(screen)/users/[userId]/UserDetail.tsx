"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import StatusBadge from "@/components/common/StatusBadge";
import type { Profile } from "@/types";

interface UserDetailProps {
  userId: string;
}

const inputClass = "h-9 w-full rounded-md border border-input bg-background px-2 font-normal outline-none focus:ring-2 focus:ring-ring";

export default function UserDetail({ userId }: UserDetailProps) {
  const { data: profiles, loading, error, refetch } = useApi<Profile[]>(() => AetherClient.getProfiles());
  const profile = profiles?.find((p) => p.id === userId);

  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (loading) return <p className="text-sm text-muted-foreground">Loading user...</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load user: {error}</p>;
  if (!profile) return <p className="text-sm text-muted-foreground">User not found.</p>;

  const u = profile;

  function startEditing() {
    setEditValues({
      name: u.name,
      role: u.role,
      is_active: u.is_active,
    });
    setEditError(null);
    setEditing(true);
  }

  async function saveEdits() {
    setSaving(true);
    setEditError(null);
    try {
      const changes: Record<string, unknown> = {};
      if (editValues.name !== u.name) changes.name = editValues.name;
      if (editValues.role !== u.role) changes.role = editValues.role;
      if (editValues.is_active !== u.is_active) changes.is_active = editValues.is_active;
      if (Object.keys(changes).length) {
        await AetherClient.updateProfile(u.id, changes);
      }
      setEditing(false);
      refetch();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/users" className="text-sm font-medium text-primary hover:underline">← Users</Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="border-l-4 border-primary pl-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-title">{profile.name}</h1>
            <StatusBadge status={profile.role} />
            <StatusBadge status={profile.is_active ? "active" : "depleted"} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{profile.email}</p>
          {!editing && (
            <button type="button" onClick={startEditing} className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">Edit user</button>
          )}
        </div>
      </div>

      {editing && (
        <section className="rounded-xl border border-primary/30 bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-header">Edit User</h2>
            <button type="button" onClick={() => setEditing(false)} disabled={saving} className="text-sm font-medium text-muted-foreground hover:text-foreground">Cancel</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Name
              <input value={String(editValues.name ?? "")} onChange={(e) => setEditValues((v) => ({ ...v, name: e.target.value }))} className={inputClass} />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Role
              <select value={String(editValues.role ?? "")} onChange={(e) => setEditValues((v) => ({ ...v, role: e.target.value }))} className={inputClass}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={Boolean(editValues.is_active)} onChange={(e) => setEditValues((v) => ({ ...v, is_active: e.target.checked }))} className="size-4 accent-primary" />
              Active
            </label>
          </div>
          {editError && <p className="mt-3 text-sm text-destructive">{editError}</p>}
          <div className="mt-4">
            <button type="button" onClick={saveEdits} disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </section>
      )}

      <div className="max-w-lg">
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-header mb-3 border-b border-primary/20 pb-2">Details</h2>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-muted-foreground">Name</dt><dd className="mt-0.5 font-medium">{profile.name}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd className="mt-0.5 font-medium">{profile.email}</dd></div>
            <div><dt className="text-muted-foreground">Role</dt><dd className="mt-0.5 capitalize">{profile.role}</dd></div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="mt-1"><StatusBadge status={profile.is_active ? "active" : "depleted"} /></dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
