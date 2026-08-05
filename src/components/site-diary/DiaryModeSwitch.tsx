import Link from "next/link";

export type DiaryMode = "entry" | "planning" | "summary";

export interface DiaryModeSwitchProps {
  /** Aktif görünüm — "Kayıt Gir", "Planlama" ya da "Hakediş Özeti". */
  active: DiaryMode;
  /** `.../gunluk-kayit` */
  entryHref: string;
  /** `.../gunluk-kayit/planlama` */
  planningHref: string;
  /** `.../gunluk-kayit/ozet` */
  summaryHref: string;
}

interface ModeItem {
  mode: DiaryMode;
  label: string;
  href: string;
}

/**
 * GK164-168 · P80-84 — üç görünümlü mod anahtarı.
 *
 * F-PL T2: "Planlama" (GK166 / P82) artık DEVRE DIŞI DEĞİLDİR — rotası
 * (`.../gunluk-kayit/planlama`) bu dilimde açıldı; devre dışı gerekçesi ve
 * onu anlatan `DiaryModeNotice` cümlesi kaldırıldı.
 *
 * Üç ekran da AYNI şeridi kullanır — şerit KOPYALANMAZ.
 */
export function DiaryModeSwitch({
  active,
  entryHref,
  planningHref,
  summaryHref,
}: DiaryModeSwitchProps) {
  const items: readonly ModeItem[] = [
    { mode: "entry", label: "Kayıt Gir", href: entryHref },
    { mode: "planning", label: "Planlama", href: planningHref },
    { mode: "summary", label: "Hakediş Özeti", href: summaryHref },
  ];

  return (
    <div className="diary-mode" role="group" aria-label="Görünüm seçimi">
      {items.map((item) =>
        item.mode === active ? (
          // GK165 / P82 — aktif öğe bağlantı DEĞİLDİR (kendine link basılmaz).
          <span
            key={item.mode}
            className="diary-mode__item diary-mode__item--active"
            aria-current="page"
          >
            {item.label}
          </span>
        ) : (
          <Link key={item.mode} href={item.href} className="diary-mode__item">
            {item.label}
          </Link>
        ),
      )}
    </div>
  );
}
