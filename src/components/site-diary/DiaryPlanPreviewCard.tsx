import Link from "next/link";

import type { SitePlanDaySummary } from "@/lib/api/hooks/useSitePlanDaySummary";
import { formatDayMonthShort, formatWeekdayShort } from "@/lib/format";

/**
 * `YYYY-MM-DD` → { "Pzt", "20 Tem" } (GK327).
 *
 * F-PL T2: gün adı / kısa ay dizileri BURADA DEĞİL `lib/format.ts`tedir —
 * Planlama ızgarası (P111-117) aynı biçimi kullanır ve iki kopya zamanla
 * ayrışırdı.
 */
export function planDayLabel(iso: string): { weekday: string; day: string } {
  return { weekday: formatWeekdayShort(iso), day: formatDayMonthShort(iso) };
}

export interface DiaryPlanPreviewCardProps {
  days: readonly SitePlanDaySummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
  /** `.../gunluk-kayit/planlama` — F-PL T2'de açılan gerçek rota. */
  planningHref: string;
}

/**
 * GK321-348 · "📅 Planlama — Önümüzdeki 5 Gün" bloğu.
 *
 * ONAYLI SAPMA (spec §2 / PL spec S2): mockup'ta her satırda düzenlenebilir
 * textarea + "İşçi" input'u + "Bölüm" select'i vardır (GK328-330). Planlama
 * YAZMA yüzeyi ayrı dilimdir (F-PL); burada blok SALT-OKUNUR türev olarak
 * basılır — giriş kontrolleri BASILMAZ, veriler
 * `GET /sites/{id}/plan/day-summary` yanıtından gelir.
 *
 * SIZINTI YOK: bu bileşen yalnız okur; form durumuna alan eklemez.
 */
export function DiaryPlanPreviewCard({
  days,
  isLoading,
  isError,
  planningHref,
}: DiaryPlanPreviewCardProps) {
  return (
    <section className="diary-card" aria-labelledby="diary-plan-title">
      <div className="diary-card__head">
        <h2 className="diary-card__title" id="diary-plan-title">
          📅 Planlama — Önümüzdeki 5 Gün
        </h2>
        {/* Mockup'ta bu blok düzenlenebilir; burası salt-okunur olduğu için
            plan girişi Planlama ekranından yapılır. F-PL T2 ile rota AÇILDI —
            bağlantı artık devre dışı değil, gerçek. */}
        <Link href={planningHref} className="diary-card__link">
          Planlama&apos;ya git →
        </Link>
      </div>

      <p className="diary__notice">
        Bu blok salt-okunurdur; plan girişi Planlama ekranından yapılacak.
      </p>

      {isError && <p className="diary__message">Planlama özeti yüklenemedi</p>}
      {!isError && isLoading && <p className="diary__message">Yükleniyor…</p>}
      {!isError && !isLoading && days && days.length === 0 && (
        <p className="diary__message">Önümüzdeki 5 gün için plan girilmemiş.</p>
      )}

      {!isError && !isLoading && days && days.length > 0 && (
        <ul className="diary-plan">
          {days.map((day) => {
            const label = planDayLabel(day.plan_date);
            return (
              <li
                key={day.plan_date}
                className={`diary-plan__row${day.has_plan ? "" : " diary-plan__row--empty"}`}
              >
                {/* GK327 */}
                <div className="diary-plan__date">
                  <span className="diary-plan__weekday">{label.weekday}</span>
                  {label.day}
                </div>
                {/* GK328 — textarea yerine salt-okunur metin */}
                <p className="diary-plan__text">
                  {day.has_plan ? day.text : "Henüz planlanmadı"}
                </p>
                {/* GK329 */}
                <div className="diary-plan__metric">
                  <span className="diary-plan__metric-label">İşçi</span>
                  <span className="diary-plan__metric-value">
                    {day.has_plan ? day.planned_worker_total : "—"}
                  </span>
                </div>
                {/* GK330 */}
                <div className="diary-plan__metric">
                  <span className="diary-plan__metric-label">Bölüm</span>
                  <span className="diary-plan__metric-value diary-plan__metric-value--text">
                    {day.section_names.length > 0 ? day.section_names.join(", ") : "—"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
