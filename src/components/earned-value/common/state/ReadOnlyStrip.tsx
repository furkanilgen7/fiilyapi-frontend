import { cx } from "@/lib/cx";
import { Button } from "@/components/ui/button";
import { LockIcon } from "@/components/ui/icons";
import "./read-only-strip.css";

/**
 * Salt okunur şeridi — kilit ikonu + metin (+ isteğe bağlı eylem).
 *
 * Mockup'larda İKİ ölçü var, ikisi de nötr gri (sarı/uyarı varyantı YOK):
 *   compact — Planlama - Panel.dc.html:440, Birim Oran Kataloğu.dc.html:393,
 *             Adam-Saat Bütçesi.dc.html:483 ("Görüntüleyici · yalnız okuma")
 *   banner  — Adam-Saat Bütçesi.dc.html:146-152 (kalın öncü + metin + eylem),
 *             Ayarlar - Planlama.dc.html:61-67 (aynı yapı; küçük farklar raporda)
 *
 * `role="note"`: sayfa açılışında duran, canlı olmayan bir bilgi notudur;
 * `status` gibi canlı bölge değildir.
 */
export type ReadOnlyStripVariant = "compact" | "banner";

export interface ReadOnlyStripAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface ReadOnlyStripProps {
  children: React.ReactNode;
  variant?: ReadOnlyStripVariant;
  /** Kalın öncü cümle — Bütçe:149 "Rev 1 dondurulmuş.", Ayarlar:64 "Salt okunur." */
  lead?: React.ReactNode;
  /** Sağa yaslı eylem — Bütçe:150 "Taslak Rev 2'ye dön". */
  action?: ReadOnlyStripAction;
  className?: string;
}

export function ReadOnlyStrip({
  children,
  variant = "compact",
  lead,
  action,
  className,
}: ReadOnlyStripProps) {
  return (
    <div role="note" className={cx("ev-readonly-strip", `ev-readonly-strip--${variant}`, className)}>
      <span className="ev-readonly-strip__icon">
        <LockIcon />
      </span>
      <span className="ev-readonly-strip__text">
        {lead != null && (
          <>
            <strong>{lead}</strong>{" "}
          </>
        )}
        {children}
      </span>
      {action && (
        <Button
          variant="secondary"
          size="sm"
          className="ev-readonly-strip__action"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
