import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

interface SidebarCardProps {
  title: string;
  children: ReactNode;
}

export default function SidebarCard({ title, children }: SidebarCardProps) {
  return (
    <Card bodyClassName="!px-3.5 !py-3" className="!bg-card">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-widest text-foreground/70">{title}</h3>
      {children}
    </Card>
  );
}
