"use client";

import { useState } from "react";
import Link from "next/link";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import { useToast } from "@/components/ui/toast";
import StatusBadge from "@/components/common/StatusBadge";
import ErrorBlock from "@/components/ui/error-block";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@/components/ui/select";
import { Pencil } from "lucide-react";
import type { Profile } from "@/types";

interface UserDetailProps {
  userId: string;
}

const inputClass =
  "h-8 w-48 max-w-[50vw] rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50";

export default function UserDetail({ userId }: UserDetailProps) {
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const {
    data: profiles,
    loading,
    error,
    refetch,
  } = useApi<Profile[]>([...queryKeys.profiles], () =>
    AetherClient.getProfiles()
  );
  const profile = profiles?.find((p) => p.id === userId);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [editingRole, setEditingRole] = useState(false);
  const [roleValue, setRoleValue] = useState("");
  const [savingRole, setSavingRole] = useState(false);

  const [togglingActive, setTogglingActive] = useState(false);

  /* ---- inline edit handlers ---- */

  function startEditingName() {
    setNameValue(profile?.name ?? "");
    setEditingName(true);
  }

  async function saveName() {
    if (!profile || !nameValue.trim()) return;
    setSavingName(true);
    try {
      await AetherClient.updateProfile(profile.id, { name: nameValue.trim() });
      setEditingName(false);
      toast("Name updated");
      invalidate([...queryKeys.profiles]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update name", "error");
    } finally {
      setSavingName(false);
    }
  }

  function startEditingRole() {
    setRoleValue(profile?.role ?? "staff");
    setEditingRole(true);
  }

  async function saveRole(value: string) {
    if (!profile) return;
    setSavingRole(true);
    try {
      await AetherClient.updateProfile(profile.id, { role: value });
      setEditingRole(false);
      toast("Role updated");
      invalidate([...queryKeys.profiles]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update role", "error");
    } finally {
      setSavingRole(false);
    }
  }

  async function toggleActive() {
    if (!profile) return;
    setTogglingActive(true);
    try {
      await AetherClient.updateProfile(profile.id, {
        is_active: !profile.is_active,
      });
      toast(
        `${profile.name} ${profile.is_active ? "deactivated" : "activated"}`
      );
      invalidate([...queryKeys.profiles]);
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Failed to update status",
        "error"
      );
    } finally {
      setTogglingActive(false);
    }
  }

  /* ---- loading / error / not-found ---- */

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-20" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
        </div>
        <Skeleton className="h-0.5 w-full" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorBlock
        message={`Failed to load user: ${error}`}
        onRetry={refetch}
      />
    );
  }

  if (!profile) {
    return (
      <ErrorBlock message="User not found." onRetry={refetch} />
    );
  }

  /* ---- render ---- */

  return (
    <div className="space-y-5">
      {/* Back link */}
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>&larr;</span> Users
      </Link>

      {/* Header: avatar + name + email */}
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <span className="text-xl font-bold text-primary">
            {profile.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight uppercase text-foreground">
              {profile.name}
            </h1>
            <StatusBadge status={profile.role} />
            <StatusBadge
              status={profile.is_active ? "active" : "inactive"}
            />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <section className="max-w-3xl rounded-lg border border-border bg-card">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-foreground">Account access</h2>
          <p className="mt-1 text-sm text-muted-foreground">Profile identity, role, and sign-in status.</p>
        </header>
        <div className="px-5 py-4">
            <dl className="space-y-3 text-sm">
              {/* Name - inline editable */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted-foreground">Name</dt>
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={nameValue}
                      onChange={(e) => setNameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveName();
                        if (e.key === "Escape") setEditingName(false);
                      }}
                      className={inputClass}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={saveName}
                      disabled={savingName}
                      className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                    >
                      {savingName ? "..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingName(false)}
                      className="text-xs text-muted-foreground/60 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd className="font-medium">{profile.name}</dd>
                    <button
                      type="button"
                      onClick={startEditingName}
                      className="text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Email - read only */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="font-medium">{profile.email}</dd>
              </div>

              {/* Role - inline editable dropdown */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted-foreground">Role</dt>
                {editingRole ? (
                  <div className="flex items-center gap-2">
                    <Select
                      value={roleValue}
                      onChange={(e) => {
                        setRoleValue(e.target.value);
                        saveRole(e.target.value);
                      }}
                      disabled={savingRole}
                      className={inputClass}
                      autoFocus
                    >
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </Select>
                    <button
                      type="button"
                      onClick={() => setEditingRole(false)}
                      className="text-xs text-muted-foreground/60 hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <dd>
                      <StatusBadge status={profile.role} />
                    </dd>
                    <button
                      type="button"
                      onClick={startEditingRole}
                      className="text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                )}
              </div>

              {/* Status - toggle */}
              <div className="flex items-center justify-between">
                <dt className="text-xs text-muted-foreground">Status</dt>
                <div className="flex items-center gap-2">
                  <dd>
                    <StatusBadge
                      status={profile.is_active ? "active" : "inactive"}
                    />
                  </dd>
                  <button
                    type="button"
                    onClick={toggleActive}
                    disabled={togglingActive}
                    className="rounded-md border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-background hover:text-foreground transition-colors disabled:opacity-60"
                  >
                    {togglingActive
                      ? "..."
                      : profile.is_active
                        ? "Deactivate"
                        : "Activate"}
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-3">
                <dt className="text-xs text-muted-foreground">User ID</dt>
                <dd className="mt-1 break-all font-mono text-xs text-muted-foreground">{profile.id}</dd>
              </div>
            </dl>
        </div>
      </section>
    </div>
  );
}
