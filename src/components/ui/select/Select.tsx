import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import { ChevronDownIcon } from "@/components/ui/icons";
import "./select.css";

export type SelectStatus = "default" | "error" | "success";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  status?: SelectStatus;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ status = "default", className, children, ...rest }, ref) => (
    <span className="select-wrap">
      <select
        ref={ref}
        className={cx("select", status !== "default" && `select--${status}`, className)}
        {...rest}
      >
        {children}
      </select>
      <span className="select-chevron">
        <ChevronDownIcon />
      </span>
    </span>
  ),
);

Select.displayName = "Select";
