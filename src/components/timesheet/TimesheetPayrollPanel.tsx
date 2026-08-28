import Link from "next/link";

import { Input } from "@/components/ui/input/Input";
import { cx } from "@/lib/cx";
import { formatDecimal } from "@/lib/format";

/**
 * Bordro ekranının GERÇEK rotası (`nav-config.ts` · `src/app/(app)/bordro`).
 * Mockup'ın `Bordro Yönetimi.dc.html` dosya adı KOPYALANMAZ — mockup dosya
 * adları ürün rotası değildir.
 */
export const PAYROLL_ROUTE = "/bordro";

export interface TimesheetPayrollPanelProps {
  normalHours: string;
  overtimeHours: string;
  monthTotalHours: string;
  monthManDays: string;
  monthWeekCount: number;
  /**
   * Ayın HENÜZ GİRİLMEMİŞ haftalarının ISO numaraları (E5 357'nin "30. ve 31.
   * hafta eksik" cümlesi). Kaynak ay şeridinin `has_entries`idir — ikinci bir
   * hesap YAZILMAZ.
   */
  missingWeeks: readonly number[];
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
 * 🔴 "Bordroya Aktar" (E5 359) BUNLARDAN FARKLIDIR — kalıcı yer tutucu DEĞİL,
 * VERİYE BAĞLI BİR HÂLDİR. Mockup düğmeyi `cursor:not-allowed` çizer ve
 * sebebini hemen üstünde yazar (E5 356-357): *"Bordro aylık kapanır — ayın tüm
 * haftaları girilmeden hesaplama yapılamaz (30. ve 31. hafta eksik)."* Yani
 * düğme ayın BÜTÜN haftaları girilince AÇILIR. Eksik haftalar ay şeridinin
 * `has_entries` alanından türetilir (ikinci bir hesap yazılmaz) ve hedef
 * ürünün GERÇEK rotasıdır (`/bordro`), mockup dosya adı değil.
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
  missingWeeks,
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
          {/* E5 356-358 — sabitler SÖZLEŞMEDEN, mockup metninden DEĞİL */}
          Saatlik ücret = günlük ücret ÷ {formatDecimal(normalDayHours, 1)}. Haftalık{" "}
          {formatDecimal(weeklyNormalHours, 1)} saati aşan kısım <strong>%50 zamlı</strong>.
          Bordro aylık kapanır — {payrollGateReason(monthWeekCount, missingWeeks)}
        </p>
        {/* E5 359 — HÂL MAKİNESİ: ayın tüm haftaları girilince AÇILIR. */}
        {canTransfer(monthWeekCount, missingWeeks) ? (
          <Link href={PAYROLL_ROUTE} className={cx("ts-payroll__action", "ts-payroll__action--ready")}>
            Bordroya Aktar
          </Link>
        ) : (
          <span className="ts-payroll__action" aria-disabled="true">
            Bordroya Aktar
          </span>
        )}
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

/**
 * Aktarım kapısı. 🔴 BOŞ ŞERİT "hepsi girildi" DEĞİLDİR: ay şeridi
 * okunamadıysa (`monthWeekCount === 0`) kapı KAPALI kalır — bilinmezliği
 * "tamam" saymak, eksik bir ayı bordroya aktarmaya davet ederdi.
 */
export function canTransfer(monthWeekCount: number, missingWeeks: readonly number[]): boolean {
  return monthWeekCount > 0 && missingWeeks.length === 0;
}

/** E5 357'nin gerekçe cümlesi — eksik haftalar ADIYLA yazılır. */
export function payrollGateReason(
  monthWeekCount: number,
  missingWeeks: readonly number[],
): string {
  if (monthWeekCount === 0) return "ayın hafta özeti okunamadı, aktarım kapalı.";
  if (missingWeeks.length === 0) return "ayın tüm haftaları girildi, aktarıma hazır.";
  const list = missingWeeks.map((week) => `${week}.`).join(" ve ");
  return `${list} hafta girilmeden hesaplama yapılamaz.`;
}
