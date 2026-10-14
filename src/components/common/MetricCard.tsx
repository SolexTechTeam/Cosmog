import { Statistic } from "antd";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricAccent = "default" | "primary" | "success" | "warning" | "danger";
type MetricDensity = "dashboard" | "page";

function valueSizeClass(value: string | number, density: MetricDensity) {
  const length = String(value).length;
  if (density === "dashboard") {
    if (length >= 13) return "!text-[12px]";
    if (length >= 10) return "!text-[14px]";
    if (length >= 8) return "!text-[16px]";
    return "!text-[18px]";
  }

  if (length >= 13) return "!text-base";
  if (length >= 10) return "!text-lg";
  if (length >= 8) return "!text-xl";
  return "!text-2xl";
}

interface MetricCardProps {
  label: string;
  value: string | number;
  loading?: boolean;
  accent?: MetricAccent;
  showAccent?: boolean;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
  valueSuffix?: React.ReactNode;
  autoSizeValue?: boolean;
  density?: MetricDensity;
  icon?: React.ReactNode;
  iconClassName?: string;
  children?: React.ReactNode;
}

export default function MetricCard({
  label,
  value,
  loading,
  className = "",
  labelClassName = "",
  valueClassName = "",
  valueSuffix,
  autoSizeValue = true,
  density = "page",
  icon,
  iconClassName = "",
  children,
}: MetricCardProps) {
  const flat = className.includes("border-0") && className.includes("bg-transparent");
  const minHeightClass = density === "dashboard" ? "min-h-[5.5rem]" : "min-h-24";
  const title = icon ? (
    <span className="flex min-w-0 items-start justify-between gap-3">
      <span className="truncate">{label}</span>
      <span aria-hidden="true" className={cn("shrink-0 text-muted-foreground", iconClassName)}>{icon}</span>
    </span>
  ) : label;

  return (
    <Card
      bodyClassName={cn(flat ? "!px-3 !py-2.5" : "!p-4")}
      className={cn("h-full", minHeightClass, flat && "!bg-transparent", className)}
      variant={flat ? "borderless" : "outlined"}
    >
      {children ? (
        <>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <p className={cn("truncate text-xs font-medium uppercase tracking-wider text-muted-foreground", labelClassName)}>{label}</p>
            {icon && <span aria-hidden="true" className={cn("shrink-0 text-muted-foreground", iconClassName)}>{icon}</span>}
          </div>
          <div className="mt-1">{children}</div>
        </>
      ) : (
        <Statistic
          classNames={{
            content: "!text-xl !font-bold !leading-6 !text-foreground",
            title: cn("!mb-1 !text-xs !font-medium !uppercase !tracking-wider !text-muted-foreground", labelClassName),
            value: cn("!font-metric !font-semibold !tabular-nums [font-stretch:semi-expanded]", autoSizeValue && valueSizeClass(value, density), valueClassName),
            suffix: "!font-sans !text-lg !font-normal !text-muted-foreground",
          }}
          loading={loading}
          suffix={valueSuffix}
          title={title}
          value={value}
        />
      )}
    </Card>
  );
}
