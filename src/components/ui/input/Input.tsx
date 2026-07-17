import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./input.css";

export type InputStatus = "default" | "error" | "success";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  status?: InputStatus;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  numeric?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ status = "default", leftIcon, rightIcon, numeric, className, ...rest }, ref) => (
    <span className={cx("input-wrap", Boolean(leftIcon) && "input-wrap--left", Boolean(rightIcon) && "input-wrap--right")}>
      {leftIcon && <span className="input-icon input-icon--left">{leftIcon}</span>}
      <input
        ref={ref}
        className={cx(
          "input",
          status !== "default" && `input--${status}`,
          numeric && "input--numeric",
          className,
        )}
        {...rest}
      />
      {rightIcon && <span className="input-icon input-icon--right">{rightIcon}</span>}
    </span>
  ),
);

Input.displayName = "Input";
