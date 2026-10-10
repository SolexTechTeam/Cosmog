"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { useApi, queryKeys } from "@/hooks/useApi";
import { AetherClient } from "@/lib/aether-client";
import type { Profile } from "@/types";

export default function TopNavBar() {
  const router = useRouter();
  const { data: profile } = useApi<Profile>([...queryKeys.myProfile], () => AetherClient.getMyProfile());

  async function handleSignOut() {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <span className="text-xl font-bold tracking-tight text-primary">Solext</span>
      <div className="flex items-center gap-4">
        {profile && (
          <span className="text-body-muted">{profile.name}</span>
        )}
        <button
          onClick={handleSignOut}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Sign Out
        </button>
      </div>
    </header>
  );
}
