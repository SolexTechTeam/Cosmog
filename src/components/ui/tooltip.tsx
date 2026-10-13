"use client";

import { Tooltip as AntTooltip } from "antd";
import type { ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  return (
    <AntTooltip placement={side} title={content}>
      <span className="inline-flex">{children}</span>
    </AntTooltip>
  );
}
