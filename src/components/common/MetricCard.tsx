import { Skeleton } from "@/components/ui/skeleton";

type MetricAccent = "default" | "primary" | "success" | "warning" | "danger";

interface MetricCardProps {
  label: string;
  value: string | number;
  loading?: boolean;
  accent?: MetricAccent;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  children?: React.ReactNode;
}

const accentBar: Record<MetricAccent, string> = {
  default: "from-border to-transparent",
  primary: "from-primary/60 to-transparent",
  success: "from-emerald-500/60 to-transparent",
  warning: "from-amber-500/60 to-transparent",
  danger: "from-red-500/60 to-transparent",
};

export default function MetricCard({ label, value, loading, accent = "default", className = "", labelClassName = "", valueClassName = "", children }: MetricCardProps) {
  return (
    <div className={`group relative overflow-hidden rounded-lg border border-border bg-card px-3 py-2.5 ${className}`}>
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${accentBar[accent]}`} />
      <p className={`text-xs font-medium uppercase tracking-wider text-muted-foreground truncate ${labelClassName}`}>{label}</p>
      {loading ? (
        <Skeleton className="mt-1 h-6 w-16" />
      ) : children ? (
        <div className="mt-1">{children}</div>
      ) : (
        <p className={`mt-0.5 truncate text-xl font-bold tabular-nums text-foreground ${valueClassName}`}>{value}</p>
      )}
    </div>
  );
}
