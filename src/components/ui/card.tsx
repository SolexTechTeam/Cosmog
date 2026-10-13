import { Card as AntCard, type CardProps as AntCardProps } from "antd";
import { cn } from "@/lib/utils";

type CardProps = Omit<AntCardProps, "classNames" | "size"> & {
  bodyClassName?: string;
};

export function Card({ bodyClassName, className, ...props }: CardProps) {
  return (
    <AntCard
      {...props}
      className={cn("!shadow-none", className)}
      classNames={{ body: cn("!p-3", bodyClassName) }}
      size="small"
    />
  );
}
