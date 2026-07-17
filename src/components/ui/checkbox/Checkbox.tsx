import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./checkbox.css";

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

// forwardRef ile native input referansi disari acilir
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, ...rest }, ref) => {
    const input = (
      <input ref={ref} type="checkbox" className={cx("checkbox", className)} {...rest} />
    );
    if (!label) return input;
    return (
      <label className="checkbox-label">
        {input}
        <span>{label}</span>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
