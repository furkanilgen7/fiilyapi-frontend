import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./checkbox.css";

export interface RadioProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
}

// forwardRef ile native input referansi disari acilir
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, ...rest }, ref) => {
    const input = (
      <input ref={ref} type="radio" className={cx("radio", className)} {...rest} />
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

Radio.displayName = "Radio";
