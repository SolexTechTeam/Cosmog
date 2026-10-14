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
      <div className="space-y-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div>{overview}</div>
      </div>

      <div className="flex flex-col gap-3">
        {filters}
        {table}
      </div>

      {dialog}
    </>
  );
}
