import Link from "next/link";
import { cx } from "@/lib/cx";

export type DiaryMode = "entry" | "summary";

export interface DiaryModeSwitchProps {
  /** Aktif görünüm — "Kayıt Gir" ya da "Hakediş Özeti". */
  active: DiaryMode;
  /** `.../gunluk-kayit` */
  entryHref: string;
  /** `.../gunluk-kayit/ozet` */
  summaryHref: string;
}

/**
 * GK164-168 · üç görünümlü mod anahtarı.
 *
 * "Planlama" (GK166) DEVRE DIŞI basılır: Planlama EKRANI ayrı dilimdir
 * (F-PL — spec §6 S2, kullanıcı onayı). Üst kural gereği öğe SİLİNMEZ,
 * görünür gerekçeyle (title + yardımcı metin) devre dışı gösterilir.
 */
export function DiaryModeSwitch({ active, entryHref, summaryHref }: DiaryModeSwitchProps) {
  return (
    <div className="diary-mode" role="group" aria-label="Görünüm seçimi">
      {active === "entry" ? (
        <span className="diary-mode__item diary-mode__item--active" aria-current="page">
          Kayıt Gir
        </span>
      ) : (
        <Link href={entryHref} className="diary-mode__item">
          Kayıt Gir
        </Link>
      )}

      {/* GK166 — rota YOK (F-PL dilimi). Ölü link basmak yerine devre dışı. */}
      <span
        className="diary-mode__item diary-mode__item--disabled"
        aria-disabled="true"
        title="Planlama ekranı ayrı dilimde (F-PL) geliyor"
      >
        Planlama
      </span>

      {active === "summary" ? (
        <span className="diary-mode__item diary-mode__item--active" aria-current="page">
          Hakediş Özeti
        </span>
      ) : (
        <Link href={summaryHref} className="diary-mode__item">
          Hakediş Özeti
        </Link>
      )}
    </div>
  );
}

export interface DiaryModeNoticeProps {
  className?: string;
  /**
   * "Kayıt Gir" ekranında sayfanın altında salt-okunur planlama bloğu vardır ve
   * gerekçe onu da anlatır. "Hakediş Özeti" modunda böyle bir blok YOKTUR —
   * cümle oraya kopyalanmaz (`false`).
   */
  hasPlanPreview?: boolean;
}

/** Devre dışı mod öğesinin gerekçesi — ekranın altında da görünür basılır. */
export function DiaryModeNotice({ className, hasPlanPreview = true }: DiaryModeNoticeProps) {
  return (
    <p className={cx("diary__notice", className)}>
      “Planlama” görünümü henüz açılmadı — planlama ekranı ayrı bir dilimde
      (F-PL) geliyor.
      {hasPlanPreview ? " Aşağıdaki planlama bloğu salt-okunur özettir." : ""}
    </p>
  );
}
