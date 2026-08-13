import { cx } from "@/lib/cx";
import type { UnitBlockGroup } from "@/lib/api/hooks/useProjectUnits";

import { UNIT_OCCUPANCY_LABELS, type UnitOccupancyTone } from "./sales-labels";
import {
  blockKindSummary,
  blockOccupancyCounts,
  blockOccupancySummary,
  unitOccupancyTone,
} from "./unit-occupancy";
import "./sales.css";

export interface BlockOccupancyMapProps {
  /** `undefined` ⇒ yükleniyor/hata; ızgara BASILMAZ. */
  blocks: UnitBlockGroup[] | undefined;
  /** Ünite ucu ayrı bir izin modülüne (`projects`) bağlıdır — 403'te gerekçe. */
  notice?: string;
}

/** 66-70 · gösterge — üç ton mockup sırasıyla. */
const LEGEND: UnitOccupancyTone[] = ["sold", "reserved", "available"];

/**
 * SY 62-140 · "Blok Doluluk Haritası".
 *
 * ⚠️ HÜCRELERİN RENGİ SUNUCUDAN GELİR: her kutu bir ünitedir ve tonu
 * ünitenin `sales_status` damgasıdır (`GET /projects/{id}/units` yanıtı zaten
 * BLOK BLOK gruplu döner). İstemci "satılmış mı" diye satış listesine
 * bakmaz — iki kaynağın ayrışması riski böylece doğmaz.
 *
 * ⚠️ Bu kart TIKLANABİLİR DEĞİLDİR. Mockup hücrelere `cursor:pointer` verir
 * (76 vd.) ama hedef ekran çizilmemiştir; satış DETAY ekranı da YOKTUR
 * (spec §2/K3) — ekran İCAT EDİLMEZ.
 */
export function BlockOccupancyMap({ blocks, notice }: BlockOccupancyMapProps) {
  return (
    <section className="satis-map" aria-labelledby="satis-harita-basligi">
      {/* 64-71 */}
      <div className="satis-map__head">
        <h2 className="satis-map__title" id="satis-harita-basligi">
          Blok Doluluk Haritası
        </h2>
        <div className="satis-map__legend">
          {LEGEND.map((tone) => (
            <span key={tone} className="satis-map__legend-item">
              <span className={cx("satis-map__swatch", `satis-map__swatch--${tone}`)} />
              {UNIT_OCCUPANCY_LABELS[tone]}
            </span>
          ))}
        </div>
      </div>

      {notice !== undefined && (
        <p className="satis-map__notice" data-testid="satis-harita-notu">
          {notice}
        </p>
      )}

      {blocks !== undefined && blocks.length === 0 && notice === undefined && (
        <p className="satis-map__notice" data-testid="satis-harita-bos">
          Bu projede tanımlı blok/ünite yok.
        </p>
      )}

      {/* 72-139 · iki sütunlu blok ızgarası */}
      <div className="satis-map__blocks">
        {(blocks ?? []).map((group) => {
          const counts = blockOccupancyCounts(group.units);
          const kinds = blockKindSummary(group.units);
          return (
            <div
              key={group.block.id}
              className="satis-map__block"
              data-testid={`satis-blok-${group.block.id}`}
            >
              {/* 74, 104 */}
              <div className="satis-map__block-title">
                {group.block.name}
                {kinds.length > 0 ? ` — ${kinds}` : ""}
              </div>
              {/* 75-100 */}
              <div className="satis-map__grid">
                {group.units.map((unit) => {
                  const tone = unitOccupancyTone(unit.sales_status);
                  return (
                    <span
                      key={unit.id}
                      className={cx("satis-map__cell", `satis-map__cell--${tone}`)}
                      title={`${unit.label} · ${UNIT_OCCUPANCY_LABELS[tone]}`}
                      data-testid={`satis-unite-${unit.id}`}
                    >
                      {unit.unit_no}
                    </span>
                  );
                })}
              </div>
              {/* 101, 137 */}
              <div className="satis-map__block-summary">{blockOccupancySummary(counts)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
