import { cx } from "@/lib/cx";
import "./card.css";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  actions?: React.ReactNode;
}

export function Card({ title, actions, className, children, ...rest }: CardProps) {
  return (
    <div className={cx("card", className)} {...rest}>
      {(title || actions) && (
        <div className="card-header">
          {title && <div className="card-title">{title}</div>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}
