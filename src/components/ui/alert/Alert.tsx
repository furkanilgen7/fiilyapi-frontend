import { cx } from "@/lib/cx";
import { AlertIcon } from "@/components/ui/icons";
import "./alert.css";

export type AlertType = "info" | "success" | "warning" | "danger";

export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  type?: AlertType;
  title?: React.ReactNode;
}

export function Alert({ type = "info", title, className, children, ...rest }: AlertProps) {
  return (
    <div role="alert" className={cx("alert", `alert--${type}`, className)} {...rest}>
      <span className="alert-icon">
        <AlertIcon />
      </span>
      <div className="alert-body">
        {title && <div className="alert-title">{title}</div>}
        <div className="alert-content">{children}</div>
      </div>
    </div>
  );
}
