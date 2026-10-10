interface MetricCardProps {
  label: string;
  value: string | number;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  children?: React.ReactNode;
}

export default function MetricCard({ label, value, className = "", labelClassName = "", valueClassName = "", children }: MetricCardProps) {
  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-card px-4 py-3 ${className}`}>
      <p className={`text-subheader truncate ${labelClassName}`}>{label}</p>
      {children ? (
        <div className="mt-1">{children}</div>
      ) : (
        <p className={`mt-1 truncate text-xl font-extrabold tabular-nums text-foreground ${valueClassName}`}>{value}</p>
      )}
    </div>
  );
}
