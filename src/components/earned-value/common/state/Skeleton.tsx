import { cx } from "@/lib/cx";
import "./skeleton.css";

/**
 * Planlama modülü yükleme iskeleti — küçük, birleştirilebilir parçalar.
 *
 * Kaynak mockup'lar (projedesign/):
 *   Planlama - Panel.dc.html:432-436         KPI blokları + grafik bloğu + çizgiler
 *   Planlama - Birim Oran Kataloğu.dc.html:382-389   4 satırlık tablo iskeleti
 *   Planlama - Adam-Saat Bütçesi.dc.html:498-505      içerlekli ağaç iskeleti
 *   Planlama - Haftalık QURR.dc.html:112-119          geniş tablo iskeleti
 *
 * Erişilebilirlik: yalnız `Skeleton` kabı `role="status"` + `aria-busy` taşır ve
 * görünmez etiketi okutur; çubuk/blok parçaları `aria-hidden`dır. Mockup'larda
 * iskelet DURAĞANDIR (animasyon yok) — bu yüzden burada da yok.
 */

export interface SkeletonProps {
  /** Ekran okuyucunun duyacağı metin. */
  label?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Skeleton({ label = "Yükleniyor", children, className }: SkeletonProps) {
  return (
    <div role="status" aria-busy="true" className={cx("ev-skeleton", className)}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export type SkeletonBlockVariant = "fill" | "outlined";

export interface SkeletonBlockProps {
  /** px — mockup ölçüsü: KPI 44 (Panel:433), grafik 64 (Panel:434). */
  height: number;
  /** fill = gri dolu (Panel:433) · outlined = açık zemin + ince kenar (Panel:434). */
  variant?: SkeletonBlockVariant;
  className?: string;
}

export function SkeletonBlock({ height, variant = "fill", className }: SkeletonBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={cx("ev-skeleton__block", `ev-skeleton__block--${variant}`, className)}
      style={{ height }}
    />
  );
}

export interface SkeletonBlocksProps {
  count: number;
  height: number;
  className?: string;
}

/** Yan yana eşit dolu bloklar — KPI kart şeridi (Panel:433). */
export function SkeletonBlocks({ count, height, className }: SkeletonBlocksProps) {
  return (
    <div aria-hidden="true" className={cx("ev-skeleton__blocks", className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="ev-skeleton__block ev-skeleton__block--fill" style={{ height }} />
      ))}
    </div>
  );
}

export interface SkeletonLinesProps {
  /** Her çizginin genişliği; ilk çizgi koyu tondadır (Panel:435 → 90% / 75% / 82%). */
  widths: ReadonlyArray<string>;
  className?: string;
}

export function SkeletonLines({ widths, className }: SkeletonLinesProps) {
  return (
    <div aria-hidden="true" className={cx("ev-skeleton__lines", className)}>
      {widths.map((width, i) => (
        <div
          key={i}
          className={cx("ev-skeleton__bar", "ev-skeleton__line", i === 0 && "ev-skeleton__bar--strong")}
          style={{ width }}
        />
      ))}
    </div>
  );
}

export type SkeletonRowsDensity = "sm" | "md" | "lg";

export interface SkeletonRowsProps {
  /** `grid-template-columns` — ör. Katalog:384 "1fr 60px 70px 50px". */
  columns: string;
  count: number;
  /**
   * "Ad" kolonunun sırası (0 tabanlı). Genişliği satırdan satıra değişen çubuk
   * budur; koyu ton da 0..primaryColumn hücrelerine uygulanır.
   * Katalog:384 → 0 · Bütçe:500 ve QURR:116 → 1 (önünde kod kolonu var).
   */
  primaryColumn?: number;
  /** Birincil çubuğun satır başına genişliği; döngüsel uygulanır. */
  primaryWidths?: ReadonlyArray<string>;
  /** Satır başına ağaç derinliği (her seviye 14px içerlek — Bütçe:501-503). */
  depths?: ReadonlyArray<number>;
  /** first-row: yalnız ilk satır koyu (Katalog, Bütçe) · all-rows: her satır (QURR:116). */
  strong?: "first-row" | "all-rows";
  /** Aralık kümesi: sm 8/8 (Bütçe:499) · md 10/10 (Katalog:383) · lg satır 10 / kolon 12 (QURR:115-116). */
  density?: SkeletonRowsDensity;
  className?: string;
}

// Katalog:384-388 genişlik dizisi — en yaygın tablo iskeleti varsayılan.
const DEFAULT_PRIMARY_WIDTHS: ReadonlyArray<string> = ["100%", "75%", "85%", "60%"];

function countColumns(template: string): number {
  // "repeat(8, 1fr)" gibi ifadeleri açarak iz sayısını bulur.
  const expanded = template.replace(/repeat\(\s*(\d+)\s*,\s*([^)]+)\)/g, (_, n: string, track: string) =>
    Array.from({ length: Number(n) }, () => track.trim()).join(" "),
  );
  return expanded.trim().split(/\s+/).filter(Boolean).length;
}

export function SkeletonRows({
  columns,
  count,
  primaryColumn = 0,
  primaryWidths = DEFAULT_PRIMARY_WIDTHS,
  depths,
  strong = "first-row",
  density = "md",
  className,
}: SkeletonRowsProps) {
  const columnCount = countColumns(columns);
  return (
    <div aria-hidden="true" className={cx("ev-skeleton__rows", `ev-skeleton__rows--${density}`, className)}>
      {Array.from({ length: count }, (_, row) => {
        const isStrongRow = strong === "all-rows" || row === 0;
        const rowStyle = {
          gridTemplateColumns: columns,
          "--ev-skeleton-depth": String(depths?.[row] ?? 0),
        } as React.CSSProperties;
        return (
          <div key={row} className="ev-skeleton__row" style={rowStyle}>
            {Array.from({ length: columnCount }, (_, col) => (
              <div
                key={col}
                className={cx("ev-skeleton__bar", isStrongRow && col <= primaryColumn && "ev-skeleton__bar--strong")}
                style={
                  col === primaryColumn && primaryWidths.length > 0
                    ? { width: primaryWidths[row % primaryWidths.length] }
                    : undefined
                }
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
