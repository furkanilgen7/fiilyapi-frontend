import { formatDecimal } from "@/lib/format";

export interface TimesheetLegendProps {
  /** Renk eşiği — "Tam gün" örneği bu sayıdan basılır (E5 203). */
  normalDayHours: string;
}

/**
 * Hücre renkleri şeridi (E5 200-209).
 *
 * 🔴 LEGEND ARTIK KOD DEĞİL SAAT ANLATIYOR. Eski beşli kod açıklaması
 * (Ç · İ · T · FM · G) KALKTI: çalışılan gün artık saattir. Mockup altı öğe
 * çizer — Tam gün · Eksik gün · Fazla mesai · İzin · Geçici görev ·
 * Çalışılmadı.
 *
 * Örnek sayılar (9 · 5 · 12) mockup'ın sabitleri DEĞİL, sözleşmeden gelen
 * `normal_day_hours` üzerinden TÜRETİLİR — 7,5 saatlik bir şirkette mockup'ın
 * "9"unu basmak yanlış bilgi olurdu (tarih artefaktı istisnasının aynısı).
 */
export function TimesheetLegend({ normalDayHours }: TimesheetLegendProps) {
  const normal = Number(normalDayHours);
  const short = Number.isFinite(normal) ? Math.max(1, Math.round(normal * 0.55)) : 5;
  const overtime = Number.isFinite(normal) ? Math.round(normal + 3) : 12;

  return (
    <div className="ts-legend">
      {/* E5 202 */}
      <span className="ts-legend__title">Hücre renkleri:</span>
      {/* E5 203-205 — saat tonları */}
      <LegendItem className="ts-hours ts-hours--full" sample={formatDecimal(normalDayHours, 1)}>
        Tam gün
      </LegendItem>
      <LegendItem className="ts-hours ts-hours--short" sample={String(short)}>
        Eksik gün
      </LegendItem>
      <LegendItem className="ts-hours ts-hours--overtime" sample={String(overtime)}>
        Fazla mesai
      </LegendItem>
      {/* E5 206-207 — kod rozetleri */}
      <LegendItem className="ts-tag ts-tag--leave" sample="İzin">
        İzin
      </LegendItem>
      <LegendItem className="ts-tag ts-tag--temporary-duty" sample="Görev">
        Geçici görev
      </LegendItem>
      {/* E5 208 */}
      <LegendItem className="ts-hours ts-hours--off" sample="—">
        Çalışılmadı
      </LegendItem>
    </div>
  );
}

function LegendItem({
  className,
  sample,
  children,
}: {
  className: string;
  sample: string;
  children: React.ReactNode;
}) {
  return (
    <span className="ts-legend__item">
      <span className={`ts-legend__swatch ${className}`} aria-hidden="true">
        {sample}
      </span>
      <span className="ts-legend__label">{children}</span>
    </span>
  );
}
