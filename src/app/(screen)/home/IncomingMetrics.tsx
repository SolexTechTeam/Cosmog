"use client";

import { useLayoutEffect, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface IncomingMetricsProps {
  units: string;
  purchaseOrders: string;
  value: string;
  loading: boolean;
  poLoading: boolean;
}

export default function IncomingMetrics({ units, purchaseOrders, value, loading, poLoading }: IncomingMetricsProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row) return;

    function fit() {
      if (!row || !row.isConnected || row.clientWidth === 0) return;
      const groups = Array.from(row.children);
      const gap = parseFloat(getComputedStyle(row).columnGap);

      // Measure the complete groups, including suffixes, using the actual fonts.
      for (const size of [18, 16, 14, 12]) {
        row.dataset.size = String(size);
        const requiredWidth = groups.reduce((sum, group) => sum + group.getBoundingClientRect().width, 0)
          + gap * (groups.length - 1);
        if (requiredWidth <= row.clientWidth) break;
      }
    }

    fit();
    let previousWidth = row.clientWidth;
    const observer = new ResizeObserver(() => {
      if (row.clientWidth === previousWidth) return;
      previousWidth = row.clientWidth;
      fit();
    });
    observer.observe(row);
    document.fonts.addEventListener("loadingdone", fit);
    void document.fonts.ready.then(fit);

    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", fit);
    };
  }, [units, purchaseOrders, value, loading, poLoading]);

  return (
    <div ref={rowRef} className="mt-2 flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-left text-[18px] data-[size=16]:text-[16px] data-[size=14]:text-[14px] data-[size=12]:text-[12px]">
      {[
        { value: units, suffix: "Units", loading },
        { value: purchaseOrders, suffix: "PO's", loading: poLoading },
        { value, suffix: "Value", loading: poLoading },
      ].map((metric) => metric.loading ? (
        <Skeleton key={metric.suffix} className="h-6 w-20 shrink-0" />
      ) : (
        <span key={metric.suffix} className="inline-flex shrink-0 items-baseline gap-1 whitespace-nowrap">
          <span className="font-metric font-semibold tabular-nums [font-stretch:semi-expanded]">{metric.value}</span>
          <span className="font-sans font-normal text-muted-foreground">{metric.suffix}</span>
        </span>
      ))}
    </div>
  );
}
