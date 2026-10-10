"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useApi, useInvalidate, queryKeys } from "@/hooks/useApi";
import { useToast } from "@/components/ui/toast";
import { AetherClient } from "@/lib/aether-client";
import { getSupabaseBrowser } from "@/lib/supabase";
import StatusBadge from "@/components/common/StatusBadge";
import ErrorBlock from "@/components/ui/error-block";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, KeyRound, Pencil } from "lucide-react";
import type { Profile } from "@/types";

const inputClass = "h-9 w-full rounded-md border border-border bg-background px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-primary/30";

export default function ProfileScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const invalidate = useInvalidate();
  const { data: profile, loading, error, refetch } = useApi<Profile>([...queryKeys.myProfile], () => AetherClient.getMyProfile());

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

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
      invalidate([...queryKeys.myProfile]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to update name", "error");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword() {
    setPasswordError(null);
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    setSavingPassword(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
      if (authError) throw authError;
      setChangingPassword(false);
      setNewPassword("");
      setConfirmPassword("");
      toast("Password changed");
    } catch (e) {
      setPasswordError(e instanceof Error ? e.message : "Failed to change password.");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="max-w-2xl">
        <Skeleton className="h-8 w-40 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorBlock message={`Failed to load profile: ${error}`} onRetry={refetch} />;
  }

  if (!profile) return null;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <span className="text-xl font-bold text-primary">{profile.name.charAt(0).toUpperCase()}</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>

      <div className="h-0.5 bg-sidebar mb-5" />

      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-muted px-5 py-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 mb-3">Account</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Name</dt>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input value={nameValue} onChange={(e) => setNameValue(e.target.value)} className="h-8 w-48 rounded-md border border-border bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-primary/50" autoFocus />
                  <button type="button" onClick={saveName} disabled={savingName} className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">{savingName ? "..." : "Save"}</button>
                  <button type="button" onClick={() => setEditingName(false)} className="text-xs text-muted-foreground/60 hover:text-foreground">Cancel</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <dd className="font-medium">{profile.name}</dd>
                  <button type="button" onClick={startEditingName} className="text-muted-foreground/40 hover:text-primary transition-colors"><Pencil size={13} /></button>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="font-medium">{profile.email}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd><StatusBadge status={profile.role} /></dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd><StatusBadge status={profile.is_active ? "active" : "released"} /></dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-muted px-5 py-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 mb-3">Security</h2>
          {changingPassword ? (
            <div className="space-y-3">
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                New password
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} placeholder="At least 6 characters" className={inputClass} autoFocus />
              </label>
              <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                Confirm password
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className={inputClass} />
              </label>
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={savePassword} disabled={savingPassword} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {savingPassword ? "Saving..." : "Update password"}
                </button>
                <button type="button" onClick={() => { setChangingPassword(false); setPasswordError(null); setNewPassword(""); setConfirmPassword(""); }} className="text-xs text-muted-foreground/60 hover:text-foreground">Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setChangingPassword(true)} className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors">
              <KeyRound size={15} /> Change password
            </button>
          )}
        </section>

        <section className="rounded-lg border border-border bg-muted px-5 py-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-foreground/70 mb-3">Session</h2>
          <button type="button" onClick={handleSignOut} className="flex items-center gap-2 text-sm font-medium text-destructive hover:text-destructive/80 transition-colors">
            <LogOut size={15} /> Sign out
          </button>
        </section>
      </div>
    </div>
  );
}
