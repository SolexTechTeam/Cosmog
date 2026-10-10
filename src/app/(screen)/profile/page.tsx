"use client";

import PageHeader from "@/components/common/PageHeader";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import type { Profile } from "@/types";

export default function ProfileScreen() {
  const { data: profile, loading, error } = useApi<Profile>([...queryKeys.myProfile], () => AetherClient.getMyProfile());

  return (
    <>
      <PageHeader title="My Profile" />

      {loading && (
        <div className="rounded-lg border border-border p-8 text-center text-muted-foreground">
          Loading profile…
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-8 text-center text-destructive">
          Failed to load profile: {error}
        </div>
      )}

      {profile && (
        <div className="rounded-lg border border-border p-6 space-y-4 max-w-lg">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</label>
            <p className="text-sm text-foreground">{profile.name}</p>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</label>
            <p className="text-sm text-foreground">{profile.email}</p>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Role</label>
            <p className="text-sm text-foreground capitalize">{profile.role}</p>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</label>
            <span
              className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                profile.is_active
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {profile.is_active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
