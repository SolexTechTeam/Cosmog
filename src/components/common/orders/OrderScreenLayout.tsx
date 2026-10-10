import type { ReactNode } from "react";

interface OrderScreenLayoutProps {
  title: string;
  subtitle?: string;
  overview: ReactNode;
  filters: ReactNode;
  table: ReactNode;
  dialog?: ReactNode;
}

export default function OrderScreenLayout({ title, subtitle, overview, filters, table, dialog }: OrderScreenLayoutProps) {
  return (
    <>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="min-w-0 flex-1 lg:max-w-3xl">{overview}</div>
      </div>

      <div className="flex flex-col gap-3">
        {filters}
        {table}
      </div>

      {dialog}
    </>
  );
}
