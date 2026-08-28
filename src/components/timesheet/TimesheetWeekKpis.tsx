import { cx } from "@/lib/cx";
import { divideDecimalStrings } from "@/lib/decimal";
import { formatDecimal } from "@/lib/format";

export interface TimesheetWeekKpisProps {
  normalHours: string;
  overtimeHours: string;
  totalHours: string;
  leaveDayCount: number;
  temporaryDutyDayCount: number;
  workerCount: number;
  /** Normal/FM backend türevidir; taslak varsa BAYATTIR ve öyle işaretlenir. */
  isStale: boolean;
}

/**
 * Haftalık KPI kartları (E5 172-197).
 *
 * 🔴 YÖNETİM KARARI (2026-08-28) — **İZİN VE GEÇİCİ GÖREV AYRI KARTTIR.**
 * Mockup'ın tek "İzin · 27 saat · 3 gün" kartı (E5 189-194) 2 izin + 1 geçici
 * görevi TOPLUYOR. Backend `leave_day_count` ve `temporary_duty_day_count`u
 * AYRI yayınlar. Geçici görev bir izin DEĞİLDİR; onu izne katan kart
 * kullanıcıya YANLIŞ BİR OLGU söyler (emsal: "Bitiş Tarihi hep kırmızı"
 * vakası — mockup'ın rengini kopyalayıp ona anlam yüklemek). ONAYLI SAPMA:
 * beş kart yerine ALTI kart basılır.
 *
 * 🔴 Mockup'ın "27 saat" izin saati BASILMAZ: izinli günün saati YOKTUR
 * (hücre saat XOR koddur, kodlu hücrenin saati `null`dur). Olmayan bir sayıyı
 * uydurmak yerine yalnız GÜN sayısı basılır.
 *
 * "Ortalama / Kişi" (E5 195-197) türevdir ve BURADA hesaplanır: yayımlanmış
 * iki sayının bölümüdür (toplam saat ÷ işçi), FM ayrımı gibi bir sözleşme
 * kuralı değildir. `divideDecimalStrings` ile — float bölme YASAK.
 */
export function TimesheetWeekKpis({
  normalHours,
  overtimeHours,
  totalHours,
  leaveDayCount,
  temporaryDutyDayCount,
  workerCount,
  isStale,
}: TimesheetWeekKpisProps) {
  const average =
    workerCount > 0 ? divideDecimalStrings(totalHours, String(workerCount), 1) : null;
  const staleTitle = "Kaydedilmemiş değişiklik var — Normal/FM ayrımı kaydettikten sonra güncellenir.";

  return (
    <div className="ts-kpis">
      {/* E5 173-177 */}
      <KpiCard
        label="Normal Mesai"
        value={formatDecimal(normalHours, 1)}
        note="saat · bu hafta"
        tone="normal"
        isStale={isStale}
        staleTitle={staleTitle}
      />
      {/* E5 178-182 */}
      <KpiCard
        label="Fazla Mesai"
        value={formatDecimal(overtimeHours, 1)}
        note="saat · %50 zamlı"
        tone="overtime"
        isStale={isStale}
        staleTitle={staleTitle}
      />
      {/* E5 183-187 */}
      <KpiCard
        label="Hafta Toplamı"
        value={formatDecimal(totalHours, 1)}
        note="Normal + FM"
        tone="total"
      />
      {/* E5 188-193 — YALNIZ izin */}
      <KpiCard label="İzin" value={String(leaveDayCount)} note="gün" tone="leave" />
      {/* 🔴 Mockup'ta YOK — izinden ayrıldı (yönetim kararı) */}
      <KpiCard
        label="Geçici Görev"
        value={String(temporaryDutyDayCount)}
        note="gün"
        tone="duty"
      />
      {/* E5 194-197 */}
      <KpiCard
        label="Ortalama / Kişi"
        value={average === null ? "—" : formatDecimal(average, 1)}
        note={`saat/hafta · ${workerCount} kişi`}
        tone="total"
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  note,
  tone,
  isStale = false,
  staleTitle,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
  isStale?: boolean;
  staleTitle?: string;
}) {
  return (
    <div className={cx("ts-kpi", `ts-kpi--${tone}`, isStale && "ts-kpi--stale")}>
      <span className="ts-kpi__label">{label}</span>
      <span className="ts-kpi__value" title={isStale ? staleTitle : undefined}>
        {value}
        {/* Bayatlık SESSİZ kalmaz: yıldız + başlık metni. */}
        {isStale && <abbr className="ts-kpi__stale" title={staleTitle}>*</abbr>}
      </span>
      <span className="ts-kpi__note">{note}</span>
    </div>
  );
}
