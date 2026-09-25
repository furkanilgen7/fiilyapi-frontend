"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * PLN-F3.3 · Grafik SVG'lerinin ORTAK viewBox↔CSS-piksel ölçek kancası —
 * emsal `budget/PreviewCharts.tsx useViewScale`/`toViewX` (KOPYALANMADI,
 * panel kapsamına TAŞINDI, dört grafik ortak kullanır).
 *
 * Durağan varsayılan ipucu (fare grafikte değilken) pencere boyu
 * değiştiğinde de doğru konumlanmalı — bu yüzden ölçek `resize`te de
 * yeniden hesaplanır, yalnız fare olayında DEĞİL.
 */
function scaleOf(svg: SVGSVGElement | null, viewWidth: number): number {
  const width = svg?.getBoundingClientRect().width ?? 0;
  return width > 0 ? width / viewWidth : 1;
}

export function useChartViewScale(viewWidth: number) {
  const ref = useRef<SVGSVGElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const measure = () => setScale(scaleOf(ref.current, viewWidth));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [viewWidth]);
  return { ref, scale };
}

/** Fare olayının `clientX`ini viewBox birimine çevirir. */
export function toChartViewX(event: React.MouseEvent<SVGSVGElement>, viewWidth: number): number {
  const rect = event.currentTarget.getBoundingClientRect();
  const scale = scaleOf(event.currentTarget, viewWidth);
  return (event.clientX - rect.left) / scale;
}
