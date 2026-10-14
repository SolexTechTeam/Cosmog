import type { ReactNode } from "react";
import MetricCard from "@/components/common/MetricCard";
import MetricCardRow from "@/components/common/MetricCardRow";

interface DirectorySummaryItem {
  label: string;
  value: string | number;
  icon?: ReactNode;
}

interface DirectoryPageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
  summary?: DirectorySummaryItem[];
  loading?: boolean;
}

export default function DirectoryPageHeader({
  title,
  description,
  actions,
  summary = [],
  loading = false,
}: DirectoryPageHeaderProps) {
  const summaryColumns = summary.length >= 4
    ? "grid-cols-2 sm:grid-cols-4"
    : summary.length === 3
      ? "grid-cols-2 sm:grid-cols-3"
      : "grid-cols-2 sm:grid-cols-2";

  return (
    <header className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>

      {summary.length > 0 && (
        <MetricCardRow className={`grid ${summaryColumns} gap-3`}>
          {summary.map((item) => (
            <MetricCard density="dashboard" key={item.label} icon={item.icon} iconClassName="text-primary" label={item.label} loading={loading} value={item.value} />
          ))}
        </MetricCardRow>
      )}
    </header>
  );
}
