import { cx } from "@/lib/cx";
import "./badge.css";

export type BadgeVariant = "neutral" | "primary" | "success" | "warning" | "danger";
export type BadgeShape = "pill" | "count";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  shape?: BadgeShape;
}

export function Badge({
  variant = "neutral",
  shape = "pill",
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cx("badge", `badge--${variant}`, `badge--${shape}`, className)}
      {...rest}
    />
  );
}
