import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./checkbox.css";

/** Kutucuk ölçüsü. `"lg"` = 15×15 (şantiye mockup alt eylem şeridi, satır 221). */
export type CheckboxSize = "md" | "lg";

// DOM'un kendi `size` ozniteligi gizlenir; burada `size` olcu varyantidir.
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  size?: CheckboxSize;
}

// forwardRef ile native input referansi disari acilir
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, size = "md", className, ...rest }, ref) => {
    const input = (
      <input
        ref={ref}
        type="checkbox"
        className={cx("checkbox", size !== "md" && `checkbox--${size}`, className)}
        {...rest}
      />
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
