"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { cx } from "@/lib/cx";
import "./checkbox.css";

/** Kutucuk ölçüsü. `"lg"` = 15×15 (şantiye mockup alt eylem şeridi, satır 221). */
export type CheckboxSize = "md" | "lg";

// DOM'un kendi `size` ozniteligi gizlenir; burada `size` olcu varyantidir.
export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: React.ReactNode;
  size?: CheckboxSize;
  /**
   * Kısmi seçim (3 durumlu ağaç seçimi — Adam-Saat Bütçesi.dc.html:601).
   * HTML özniteliği DEĞİL, DOM özelliğidir: yalnız ref üzerinden atanabilir.
   * Görünümü native `accent-color` çizer, ek CSS gerekmez.
   */
  indeterminate?: boolean;
}

// forwardRef ile native input referansi disari acilir
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, size = "md", indeterminate = false, className, ...rest }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
    useLayoutEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    const input = (
      <input
        ref={inputRef}
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
