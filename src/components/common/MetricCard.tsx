interface MetricCardProps {
  label: string;
  value: string | number;
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm overflow-hidden">
      <p className="text-subheader truncate">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tabular-nums text-foreground truncate">{value}</p>
    </div>
  );
}
