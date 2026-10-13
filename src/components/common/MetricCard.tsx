import { Statistic } from "antd";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricAccent = "default" | "primary" | "success" | "warning" | "danger";

interface MetricCardProps {
  label: string;
  value: string | number;
  loading?: boolean;
  accent?: MetricAccent;
  showAccent?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  children?: React.ReactNode;
}

export default function MetricCard({ label, value, loading, className = "", labelClassName = "", valueClassName = "", children }: MetricCardProps) {
  const flat = className.includes("border-0") && className.includes("bg-transparent");

  return (
    <Card
      bodyClassName={cn(flat ? "!px-3 !py-2.5" : "!p-4")}
      className={cn("h-full", flat && "!bg-transparent", className)}
      variant={flat ? "borderless" : "outlined"}
    >
      {children ? (
        <>
          <p className={cn("truncate text-xs font-medium uppercase tracking-wider text-muted-foreground", labelClassName)}>{label}</p>
          <div className="mt-1">{children}</div>
        </>
      ) : (
        <Statistic
          classNames={{
            content: "!text-xl !font-bold !leading-6 !text-foreground",
            title: cn("!mb-1 !truncate !text-xs !font-medium !uppercase !tracking-wider !text-muted-foreground", labelClassName),
            value: cn("!tabular-nums", valueClassName),
          }}
          loading={loading}
          title={label}
          value={value}
        />
      )}
    </Card>
  );
}
