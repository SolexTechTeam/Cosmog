import { Button as AntButton, type ButtonProps as AntButtonProps } from "antd";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

function Button({ className, variant = "default", size = "default", ...props }: Omit<AntButtonProps, "size" | "type" | "variant"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const type = variant === "default" ? "primary" : variant === "link" ? "link" : variant === "ghost" ? "text" : "default";
  const antSize = size === "xs" || size === "sm" || size === "icon-xs" || size === "icon-sm" ? "small" : size === "lg" || size === "icon-lg" ? "large" : "middle";

  return (
    <AntButton
      className={className}
      danger={variant === "destructive"}
      size={antSize}
      type={type}
      {...props}
    />
  )
}

export { Button }
