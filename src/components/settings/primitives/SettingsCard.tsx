import { cx } from "@/lib/cx";
import "./settings-primitives.css";

type Props = {
  title?: React.ReactNode;
  count?: React.ReactNode;
  actions?: React.ReactNode;
  bodyPad?: "default" | "flush" | "tight";
  className?: string;
  children: React.ReactNode;
};

export function SettingsCard({
  title,
  count,
  actions,
  bodyPad = "default",
  className,
  children,
}: Props) {
  const hasHeader = title != null || actions != null || count != null;
  const bodyClass =
    bodyPad === "flush"
      ? "s-card__body--flush"
      : bodyPad === "tight"
        ? "s-card__body--tight"
        : "";
  return (
    <section className={cx("s-card", className)}>
      {hasHeader && (
        <div className="s-card__header">
          {title && <span className="s-card__title">{title}</span>}
          {count != null && <span className="s-card__count">{count}</span>}
          {actions && <span className="s-card__actions">{actions}</span>}
        </div>
      )}
      <div className={cx("s-card__body", bodyClass)}>{children}</div>
    </section>
  );
}
