import type { SitePlanDaySummary } from "@/lib/api/hooks/useSitePlanDaySummary";

const TR_WEEKDAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
const TR_MONTHS_SHORT = [
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

/**
 * `YYYY-MM-DD` → { "Pzt", "20 Tem" } (GK327). `Intl.DateTimeFormat`
 * KULLANILMAZ — jsdom/CI'da ICU verisi eksik olabilir (`format.ts`'teki
 * `formatPeriod` ile aynı gerekçe). Gün adı için `Date` yalnız haftanın
 * gününü vermek üzere UTC olarak kurulur.
 */
export function planDayLabel(iso: string): { weekday: string; day: string } {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    weekday: TR_WEEKDAYS[date.getUTCDay()] ?? "",
    day: `${day} ${TR_MONTHS_SHORT[month - 1] ?? ""}`,
  };
}

export interface DiaryPlanPreviewCardProps {
  days: readonly SitePlanDaySummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
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
export function DiaryPlanPreviewCard({ days, isLoading, isError }: DiaryPlanPreviewCardProps) {
  return (
    <section className="diary-card" aria-labelledby="diary-plan-title">
      <div className="diary-card__head">
        <h2 className="diary-card__title" id="diary-plan-title">
          📅 Planlama — Önümüzdeki 5 Gün
        </h2>
        {/* Mockup'ta bu blok düzenlenebilir; burada salt-okunur olduğu için
            "Planlama'ya git" bağlantısı devre dışı (rota F-PL diliminde). */}
        <span
          className="diary-card__link diary-card__link--disabled"
          aria-disabled="true"
          title="Planlama ekranı ayrı dilimde (F-PL) geliyor"
        >
          Planlama&apos;ya git →
        </span>
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
