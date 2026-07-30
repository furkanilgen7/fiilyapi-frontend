import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import { ChevronDownIcon } from "@/components/ui/icons";
import "./select.css";

export type SelectStatus = "default" | "error" | "success";

/** Ölçü varyantı — `Input` ile aynı sözleşme (mockup `.f-in` / `.row-in`). */
export type SelectSize = "form" | "row";

// DOM'un kendi `size` ozniteligi (gorunur satir sayisi) gizlenir; bu
// primitive'de `size` olcu varyantidir.
export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  status?: SelectStatus;
  size?: SelectSize;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ status = "default", size = "form", className, children, ...rest }, ref) => (
    <span className="select-wrap">
      <select
        ref={ref}
        className={cx(
          "select",
          status !== "default" && `select--${status}`,
          size !== "form" && `select--${size}`,
          className,
        )}
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
