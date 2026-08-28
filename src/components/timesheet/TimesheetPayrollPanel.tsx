import { Input } from "@/components/ui/input/Input";
import { formatDecimal } from "@/lib/format";

export interface TimesheetPayrollPanelProps {
  normalHours: string;
  overtimeHours: string;
  monthTotalHours: string;
  monthManDays: string;
  monthWeekCount: number;
  /** Ayın kaç haftası hâlâ girilmemiş — aktarım kapısının gerekçesi. */
  missingWeekCount: number;
  workerCount: number;
  weeklyNormalHours: string;
  normalDayHours: string;
}

/**
 * "Haftadan Bordroya Aktarım" paneli (E5 333-360).
 *
 * 🔴 UÇ KARŞILIĞI OLMAYAN ÖĞELER SİLİNMEZ, DEVRE-DIŞI BASILIR ve gerekçesi
 * ekranda yazar (repo kanonu):
 *   • "Haftalık Brüt ₺29.070" (E5 352-354): brüt ücret hesabı bu uçta YOKTUR
 *     (saatlik ücret personel kartında, çarpan bordro ayarlarındadır). Sayı
 *     UYDURULMAZ — kart devre dışı basılır.
 *   • "Bordroya Aktar" düğmesi (E5 359): aktarım ucu yoktur; mockup'ta da
 *     `cursor:not-allowed` ile pasiftir.
 *   • "Haftalık normal 45" kutusu (E5 129-132): değer sözleşmeden
 *     (`weekly_normal_hours`) OKUNUR ama YAZILAMAZ — uçta ayar yazma yolu yok.
 *
 * Yayımlanmış üç sayı (haftanın Normal/FM saati, ayın kümülatifi) GERÇEKTİR ve
 * basılır.
 */
export function TimesheetPayrollPanel({
  normalHours,
  overtimeHours,
  monthTotalHours,
  monthManDays,
  monthWeekCount,
  missingWeekCount,
  workerCount,
  weeklyNormalHours,
  normalDayHours,
}: TimesheetPayrollPanelProps) {
  return (
    <section className="ts-payroll" aria-label="Haftadan Bordroya Aktarım">
      {/* E5 334 */}
      <h2 className="ts-payroll__title">Haftadan Bordroya Aktarım</h2>
      <div className="ts-payroll__cards">
        {/* E5 336-340 */}
        <div className="ts-payroll__card ts-payroll__card--normal">
          <span className="ts-payroll__label">Bu Hafta Normal</span>
          <span className="ts-payroll__value">{formatDecimal(normalHours, 1)} saat</span>
          <span className="ts-payroll__note">× saatlik ücret</span>
        </div>
        {/* E5 341-345 */}
        <div className="ts-payroll__card ts-payroll__card--overtime">
          <span className="ts-payroll__label">Bu Hafta FM</span>
          <span className="ts-payroll__value">{formatDecimal(overtimeHours, 1)} saat</span>
          <span className="ts-payroll__note">× saatlik ücret × 1,5</span>
        </div>
        {/* E5 346-350 */}
        <div className="ts-payroll__card">
          <span className="ts-payroll__label">
            Ay Kümülatif ({monthWeekCount} hafta)
          </span>
          <span className="ts-payroll__value">{formatDecimal(monthTotalHours, 1)} saat</span>
          <span className="ts-payroll__note">
            {formatDecimal(monthManDays, 1)} adam/gün · SGK
          </span>
        </div>
        {/* E5 351-355 — 🔴 UCU YOK, devre dışı */}
        <div className="ts-payroll__card ts-payroll__card--disabled">
          <span className="ts-payroll__label">Haftalık Brüt</span>
          <span className="ts-payroll__value">—</span>
          <span className="ts-payroll__note">
            {workerCount} kişi · brüt ücret hesabı bu uçta yayınlanmıyor
          </span>
        </div>
      </div>
      <div className="ts-payroll__foot">
        <p className="ts-payroll__hint">
          {/* E5 357-358 — sabitler SÖZLEŞMEDEN, mockup metninden DEĞİL */}
          Saatlik ücret = günlük ücret ÷ {formatDecimal(normalDayHours, 1)}. Haftalık{" "}
          {formatDecimal(weeklyNormalHours, 1)} saati aşan kısım <strong>%50 zamlı</strong>.
          Bordro aylık kapanır —{" "}
          {missingWeekCount > 0
            ? `ayın ${missingWeekCount} haftası henüz girilmedi.`
            : "ayın tüm haftaları girildi."}
        </p>
        {/* E5 359 — aktarım ucu YOK; mockup'ta da pasif çizilmiştir */}
        <span className="ts-payroll__action" aria-disabled="true">
          Bordroya Aktar
        </span>
      </div>
      {/* E5 129-132 — okunur ama yazılamaz */}
      <label className="ts-payroll__weekly">
        <span className="ts-payroll__weekly-label">Haftalık normal</span>
        <Input
          size="row"
          numeric
          readOnly
          disabled
          value={formatDecimal(weeklyNormalHours, 1)}
          aria-label="Haftalık normal mesai saati"
          className="ts-payroll__weekly-input"
        />
        <span className="ts-payroll__weekly-label">saat — ayarlardan değiştirilir</span>
      </label>
    </section>
  );
}
