import { forwardRef } from "react";
import { cx } from "@/lib/cx";
import "./textarea.css";

export type TextareaStatus = "default" | "error" | "success";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  status?: TextareaStatus;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ status = "default", rows = 2, className, ...rest }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cx(
        "textarea",
        status !== "default" && `textarea--${status}`,
        className,
      )}
      {...rest}
    />
  ),
);

Textarea.displayName = "Textarea";
