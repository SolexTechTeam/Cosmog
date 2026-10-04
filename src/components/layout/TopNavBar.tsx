"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function TopNavBar() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

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
        {userEmail && (
          <span className="text-body-muted">{userEmail}</span>
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
