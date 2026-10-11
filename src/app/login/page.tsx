"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = getSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/home");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_50%_50%,#2d0e04_0%,#6e1e08_10%,#a43210_25%,#c44a18_40%,#e06020_60%,#ee7428_80%,#f48030_100%)]">
      <div className="w-full max-w-md">
        
        <div className="flex justify-center mb-8">
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#18181B]/90 p-8 shadow-2xl backdrop-blur-sm">
          

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex justify-center">
              <Image
                src="/solext_transparent.png"
                alt="Solext"
                width={192
                  
                }
                height={100}
                priority
                className="drop-shadow-[0_0_40px_rgba(249,115,22,0.3)]"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@solext.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-400">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 w-full rounded-lg border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-lg bg-primary text-sm font-semibold text-white shadow-[0_0_20px_rgba(249,115,22,0.25)] hover:bg-orange-600 hover:shadow-[0_0_24px_rgba(249,115,22,0.35)] transition-all disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
