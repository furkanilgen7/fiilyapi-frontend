"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cx } from "@/lib/cx";
import { EMPTY_CELL } from "@/lib/format";

import { placeTooltip, type TooltipPlacement, type TooltipPosition } from "./tooltip-position";
import "./chart-tooltip.css";

/**
 * PLN-F1.2 · Grafik ipucu kutusu (koyu kutu).
 *
 * Kaynaklar: Planlama - Panel.dc.html:215-221 (S-eğrisi), :281-285 (çubuk),
 * :312-316 (PF trendi), :338-343 (histogram); Adam-Saat Bütçesi.dc.html:351-356,
 * :376-381. Hepsi aynı kalıp: `rx 6` koyu zemin, 11px başlık (600), satırlarda
 * sola etiket + sağa hizalı mono değer, değer tonu isteğe bağlı.
 *
 * 🔴 Histogram ipucu (Panel 338-343) mockup'ta DEĞERSİZ çizilmiş (şablon
 * değişkeni basılmamış). Bu bileşende değer ZORUNLU prop'tur, boş dize bile
 * "–" olarak görünür basılır.
 *
 * KARAR — SVG `<g>` DEĞİL, grafik kabının üstünde MUTLAK KONUMLU HTML katmanı:
 *   • Kutu genişliği içerikten gelir. SVG'de metin ölçülemediği için mockup
 *     her grafikte genişliği elle sabitler (118/124/128/140/150); uzun bir
 *     değer ("−2,6 · Geride") kutudan taşar. HTML kutu kendini boyutlar.
 *   • Taşma düzeltmesi ölçülen kutu boyuyla SAF fonksiyonda yapılır
 *     (`tooltip-position.ts`), koordinatlar `Math.round`lanır (görsel kapı).
 *   • Grafikler `viewBox` ile ölçeklenir; SVG içindeki ipucu yazısı grafikle
 *     birlikte küçülür/büyür. HTML katmanında yazı 11px'te sabit kalır.
 *   Bedeli: çağıran, viewBox koordinatını kabın CSS pikseline çevirip
 *   `x`/`y` olarak vermelidir ve kap `position: relative` olmalıdır.
 *
 * ERİŞİLEBİLİRLİK — `aria-hidden`: ipucu fare konumuna bağlı, odaklanamayan
 * bir görsel yinelemedir. `role="tooltip"` bir odak tetikleyicisine
 * (`aria-describedby`) bağlanmayı gerektirir — grafik noktalarında böyle bir
 * tetikleyici yok; canlı bölge ise her fare hareketinde okuyucuyu boğar.
 * Grafik verisinin erişilebilir karşılığı grafiğin kendi özeti/tablosudur.
 */

export type ChartTooltipTone = "default" | "positive" | "negative";

export interface ChartTooltipRow {
  label: string;
  value: string;
  /** `negative` = Panel 220 / AS 380 `#fca5a5` · `positive` = Panel 315 `#86efac`. */
  tone?: ChartTooltipTone;
  /** Panel 220 "Sapma" değeri `font-weight:600`. */
  strong?: boolean;
}

export interface ChartTooltipProps {
  /** Çapa — kabın sol-üst köşesine göre CSS pikseli. */
  x: number;
  y: number;
  title: string;
  rows: readonly ChartTooltipRow[];
  /** Varsayılan `"right"` (Panel 570 `tx + 12`); taşarsa karşı yana çevrilir. */
  placement?: TooltipPlacement;
  /** Kap boyu; verilmezse konumlandırma bağlamı (`offsetParent`) ölçülür. */
  bounds?: { width: number; height: number };
  className?: string;
}

export function ChartTooltip({
  x,
  y,
  title,
  rows,
  placement = "right",
  bounds,
  className,
}: ChartTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const boundsWidth = bounds?.width;
  const boundsHeight = bounds?.height;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const parent = el.offsetParent as HTMLElement | null;
    setPosition(
      placeTooltip({
        x,
        y,
        width: el.offsetWidth,
        height: el.offsetHeight,
        boundsWidth: boundsWidth ?? parent?.clientWidth ?? 0,
        boundsHeight: boundsHeight ?? parent?.clientHeight ?? 0,
        placement,
      }),
    );
  }, [x, y, placement, boundsWidth, boundsHeight, title, rows]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cx("chart-tooltip", className)}
      data-placement={position?.placement}
      // Ölçülmeden önce görünmez: yanlış konumda bir kare çizilmesin.
      style={
        position
          ? { left: `${position.left}px`, top: `${position.top}px` }
          : { left: 0, top: 0, visibility: "hidden" }
      }
    >
      <div className="chart-tooltip__title">{title}</div>
      <dl className="chart-tooltip__rows">
        {rows.map((row, index) => (
          <div key={`${index}:${row.label}`} className="chart-tooltip__row">
            <dt className="chart-tooltip__label">{row.label}</dt>
            <dd
              className={cx(
                "chart-tooltip__value",
                row.tone && row.tone !== "default" && `chart-tooltip__value--${row.tone}`,
                row.strong && "chart-tooltip__value--strong",
              )}
            >
              {row.value === "" ? EMPTY_CELL : row.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
