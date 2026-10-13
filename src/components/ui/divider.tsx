import { Divider as AntDivider, type DividerProps as AntDividerProps } from "antd";
import { cn } from "@/lib/utils";

type DividerProps = Omit<AntDividerProps, "orientation"> & {
  orientation?: "horizontal" | "vertical";
};

export function Divider({ className, orientation = "horizontal", ...props }: DividerProps) {
  return (
    <AntDivider
      orientation={orientation}
      className={cn(
        "shrink-0",
        orientation === "vertical" ? "!mx-0 my-px self-stretch" : "!my-0",
        className
      )}
      {...props}
    />
  );
}
