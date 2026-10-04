interface MetricCardProps {
  label: string;
  value: string | number;
}

export default function MetricCard({ label, value }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="text-subheader">{label}</p>
      <p className="mt-2 text-large-number">{value}</p>
    </div>
  );
}
