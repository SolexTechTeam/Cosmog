import type { ReactNode } from "react";
import Link from "next/link";

interface OrderDetailLayoutProps {
  backHref: string;
  backLabel: string;
  orderNumber: string;
  subtitle: ReactNode;
  statusWidget: ReactNode;
  mainContent: ReactNode;
  sidebar: ReactNode;
  dialog?: ReactNode;
}

export default function OrderDetailLayout({
  backHref,
  backLabel,
  orderNumber,
  subtitle,
  statusWidget,
  mainContent,
  sidebar,
  dialog,
}: OrderDetailLayoutProps) {
  return (
    <>
      <div className="-mx-6 bg-background px-6 pt-1">
        <div className="flex items-center justify-between">
          <Link href={backHref} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
            <span>&larr;</span> {backLabel}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] pt-1">
        <div className="min-w-0">
          <div className="flex gap-10">
            <div className="items-col">
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{orderNumber}</h1>
            </div>
            <div className="pt-3">
              {statusWidget}
            </div>
          </div>
          <div className="mt-1 flex flex-col gap-4">{mainContent}</div>
        </div>
        <div className="pt-2">
          <div className="flex flex-col gap-3">{sidebar}</div>
        </div>
      </div>

      {dialog}
    </>
  );
}
