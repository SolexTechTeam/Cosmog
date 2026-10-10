import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  label: string;
  value: string | number;
  loading?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  children?: React.ReactNode;
}

export default function MetricCard({ label, value, loading, className = "", labelClassName = "", valueClassName = "", children }: MetricCardProps) {
  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-card px-4 py-3 ${className}`}>
      <p className={`text-subheader truncate ${labelClassName}`}>{label}</p>
      {loading ? (
        <Skeleton className="mt-1.5 h-6 w-16" />
      ) : children ? (
        <div className="mt-1">{children}</div>
      ) : (
        <p className={`mt-1 truncate text-xl font-extrabold tabular-nums text-foreground ${valueClassName}`}>{value}</p>
      )}
    </div>
  );
}
