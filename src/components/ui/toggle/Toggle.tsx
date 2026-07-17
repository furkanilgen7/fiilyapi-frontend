import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./toggle.css";

export interface ToggleProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

// Gorsel olarak gizli native checkbox + role="switch" ile erisilebilir toggle
export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ label, className, ...rest }, ref) => (
    <label className="toggle-label">
      <input
        ref={ref}
        type="checkbox"
        role="switch"
        className={cx("toggle", className)}
        {...rest}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
      {label && <span>{label}</span>}
    </label>
  ),
);

Toggle.displayName = "Toggle";
