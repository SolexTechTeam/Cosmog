interface MetricCardRowProps {
  children: React.ReactNode;
  className?: string;
}

export default function MetricCardRow({ children, className }: MetricCardRowProps) {
  return <div className={className ?? "grid grid-cols-2 gap-4 md:grid-cols-4"}>{children}</div>;
}
