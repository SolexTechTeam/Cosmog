interface MetricCardRowProps {
  children: React.ReactNode;
}

export default function MetricCardRow({ children }: MetricCardRowProps) {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{children}</div>;
}
