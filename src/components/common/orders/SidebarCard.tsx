import type { ReactNode } from "react";

interface SidebarCardProps {
  title: string;
  children: ReactNode;
}

export default function SidebarCard({ title, children }: SidebarCardProps) {
  return (
    <section className="rounded-lg border border-zinc-300 bg-muted px-3.5 py-3">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-foreground/70">{title}</h3>
      {children}
    </section>
  );
}
