export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-border/60 ${className}`} />;
}

export function MetricCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card px-4 py-3">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}
