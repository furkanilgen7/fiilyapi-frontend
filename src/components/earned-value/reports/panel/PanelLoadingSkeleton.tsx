"use client";

import { Skeleton, SkeletonBlock, SkeletonBlocks, SkeletonLines } from "@/components/earned-value/common/state";

/**
 * PLN-F3.3 · (d) Yükleniyor — Panel:432-436. KPI şeridi (3 dolu blok, 44px),
 * grafik bloğu (64px, çerçeveli) + üç çizgi (90%/75%/82%) — `Skeleton.tsx`
 * başındaki dosya notunun BİREBİR kaynağı.
 */
export function PanelLoadingSkeleton() {
  return (
    <Skeleton label="Planlama Paneli yükleniyor" className="ev-panel-skeleton">
      <SkeletonBlocks count={3} height={44} />
      <SkeletonBlock height={64} variant="outlined" />
      <SkeletonLines widths={["90%", "75%", "82%"]} />
    </Skeleton>
  );
}
