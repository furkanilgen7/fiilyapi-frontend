import type { TimesheetPeriod } from "@/lib/api/hooks/useTimesheet";

/**
 * Ay gezinmesinin (E5 74-76 · ŞP 95-97) takvim yardımcıları.
 *
 * TARİH ARTEFAKTI İSTİSNASI: mockup'ların "Temmuz 2026" sabiti KOPYALANMAZ —
 * varsayılan İÇİNDE BULUNULAN gerçek aydır, kullanıcı oklarla gezinir
 * (F-PL `week.ts` / F-SD `DiaryMonthNav` ile aynı gerekçe).
 */

const MIN_MONTH = 1;
const MAX_MONTH = 12;

export function currentPeriod(now: Date = new Date()): TimesheetPeriod {
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** `‹`/`›` — ay taşması yılı da kaydırır. */
export function shiftPeriod(period: TimesheetPeriod, delta: number): TimesheetPeriod {
  const zeroBased = period.month - 1 + delta;
  const year = period.year + Math.floor(zeroBased / MAX_MONTH);
  const month = ((zeroBased % MAX_MONTH) + MAX_MONTH) % MAX_MONTH;
  return { year, month: month + 1 };
}

/**
 * URL'den dönem okur (`?year=2026&month=8`). Geçersiz/eksik değer içinde
 * bulunulan aya düşer — kırık bir bağlantı boş ekran ÜRETMEZ.
 */
export function parsePeriod(
  yearParam: string | null,
  monthParam: string | null,
  now: Date = new Date(),
): TimesheetPeriod {
  const fallback = currentPeriod(now);
  const year = Number(yearParam);
  const month = Number(monthParam);
  if (!Number.isInteger(year) || year < 1000 || year > 9999) return fallback;
  if (!Number.isInteger(month) || month < MIN_MONTH || month > MAX_MONTH) return fallback;
  return { year, month };
}

/**
 * Ayın TÜM günleri (`YYYY-MM-DD`). Gün iskeleti buradan gelir — matristen
 * DEĞİL: hücreler seyrektir, hiç kaydı olmayan ay bile 31 sütun basmalıdır.
 *
 * `Date.UTC` kullanılır; yerel saat DST sınırında ayın son gününü kaydırabilir
 * (`derive.ts/isoDate` ile aynı gerekçe).
 */
export function monthDayIsoList(year: number, month: number): string[] {
  const dayCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthText = String(month).padStart(2, "0");
  return Array.from(
    { length: dayCount },
    (_, index) => `${year}-${monthText}-${String(index + 1).padStart(2, "0")}`,
  );
}
