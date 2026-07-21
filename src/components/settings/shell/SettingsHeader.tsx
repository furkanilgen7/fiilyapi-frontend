import { cx } from "@/lib/cx";
import "./settings-shell.css";

type Props = {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  variant?: "sub" | "root";
};

export function SettingsHeader({ title, subtitle, action, variant = "sub" }: Props) {
  return (
    <header className={cx("settings-header", variant === "root" && "settings-header--root")}>
      <div className="settings-header__row">
        <h1 className="settings-header__title">{title}</h1>
        {action}
      </div>
      <p className="settings-header__subtitle">{subtitle}</p>
    </header>
  );
}
