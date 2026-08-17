import { isIsoDate } from "@/components/site-planning/week";
import { sumDecimalStrings } from "@/lib/decimal";
import type { TimelineProject } from "@/lib/api/hooks/useProjectTimeline";

/**
 * Alt "Portföy Özeti" şeridinin SAF aritmetiği (mockup 297-306) — F-TKV T3/T4.
 *
 * 🔴 K6: dört sayının ÜÇÜ gövdeden hesaplanır, biri (`Toplam Hakediş`) PENDING
 * basılır — portföy düzeyinde hakediş toplayan bir uç YOKTUR ve tek dekoratif
 * sayı için proje başına ek istek + kısmi hata dalı açılmaz. Bu modül o alanı
 * hiç ÜRETMEZ; ekranda gerekçesiyle boş durur.
 *
 * Para toplamı `sumDecimalStrings` ile yürür — `Number` toplamı kuruş kaybeder
 * (F-FAT2 para portu dersi).
 */

export interface PortfolioSummary {
  /** Σ `items[].contract_amount`. Hiç tutar yoksa `null` (0 UYDURULMAZ). */
  totalContract: string | null;
  /** `status === "active"` sayımı. */
  activeCount: number;
  /** `end_date >= today` olanların EN ERKENİ; yoksa `null`. */
  nextDeliveryIso: string | null;
}

export function portfolioSummary(
  items: readonly TimelineProject[],
  today: string,
): PortfolioSummary {
  const amounts = items
    .map((project) => project.contract_amount)
    .filter((amount): amount is string => amount !== null && amount.trim() !== "");

  const activeCount = items.filter((project) => project.status === "active").length;

  // Yaklaşan teslimat: BUGÜN DAHİL ve sonrası. Geçmiş bitişler "yaklaşan"
  // değildir; hepsi geçmişteyse alan boş kalır (en eski geçmiş tarih
  // basılsaydı ekran yanlış bilgi verirdi).
  const upcoming = items
    .map((project) => project.end_date)
    .filter((end): end is string => end !== null && isIsoDate(end))
    .filter((end) => !isIsoDate(today) || end >= today)
    .sort();

  return {
    totalContract: amounts.length > 0 ? sumDecimalStrings(amounts) : null,
    activeCount,
    nextDeliveryIso: upcoming[0] ?? null,
  };
}
