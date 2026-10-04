interface MetricCardProps {
  label: string;
  value: string | number;
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 overflow-hidden">
      <p className="text-subheader truncate">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums text-foreground truncate">{value}</p>
    </div>
  );
}
