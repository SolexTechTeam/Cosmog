import { Statistic } from "antd";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricAccent = "default" | "primary" | "success" | "warning" | "danger";
type MetricDensity = "dashboard" | "page" | "OH value";

function valueFontSize(value: string | number, density: MetricDensity) {
  const length = String(value).length;
  if (density === "dashboard") {
    if (length >= 13) return 12;
    if (length >= 10) return 14;
    if (length >= 8) return 16;
    return 18;
  } else if (density == "OH value") {
    if (length >= 16) return 9;
    if (length >= 13) return 11;
    if (length >= 9) return 14;
    if (length >= 6) return 16;
    return 18;
  }

  if (length >= 13) return 16;
  if (length >= 10) return 18;
  if (length >= 8) return 20;
  return 24;
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
  valueFontSizeOverride?: number;
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
  valueFontSizeOverride,
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
      bodyClassName={cn("min-w-0", flat ? "!px-3 !py-2.5" : "!p-4")}
      className={cn("h-full min-w-0", minHeightClass, flat && "!bg-transparent", className)}
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
            content: "!min-w-0 !max-w-full !text-xl !font-bold !leading-6 !text-foreground",
            title: cn("!mb-1 !text-xs !font-medium !uppercase !tracking-wider !text-muted-foreground", labelClassName),
            value: cn("!max-w-full !font-metric !font-semibold !tabular-nums [font-stretch:semi-expanded]", valueClassName),
            suffix: "!font-sans !text-lg !font-normal !text-muted-foreground",
          }}
          styles={{
            content: { minWidth: 0, maxWidth: "100%" },
            value: autoSizeValue
              ? { fontSize: valueFontSizeOverride ?? valueFontSize(value, density), lineHeight: 1.25, whiteSpace: "nowrap" }
              : undefined,
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
