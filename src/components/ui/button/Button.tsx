import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./button.css";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "light-blue"
  | "success"
  | "danger"
  | "warning"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, type = "button", ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx("btn", `btn--${variant}`, `btn--${size}`, className)}
      {...rest}
    />
  ),
);

Button.displayName = "Button";
