import { Separator as BaseSeparator } from "@base-ui/react/separator";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type DividerProps = ComponentProps<typeof BaseSeparator>;

export function Divider({ className, orientation = "horizontal", ...props }: DividerProps) {
  return (
    <BaseSeparator
      orientation={orientation}
      className={cn(
        "shrink-0 bg-sidebar",
        orientation === "vertical" ? "my-px w-px self-stretch" : "h-0.5 w-full",
        className
      )}
      {...props}
    />
  );
}
