import { formatQuantity } from "@/lib/format";
import type { SectionStockRow } from "@/lib/api/hooks/useSectionStock";

import { totalsByItem } from "./section-stock-derive";
import "./section-detail.css";

/**
 * STOK-BOLUM · D253-272 "Bölüm Malzeme Durumu" alt kartının GÖVDESİ.
 *
 * 🔴 ESKİ HÂLİ `CardEmptyState` + `pendingModule="section_stock"` İDİ ve
 * gerekçesi ÖLÇÜME dayanıyordu; ölçüm backend `186ffe9` ile BAYATLADI. Kart
 * artık gerçek satır basar — yer tutucu bırakmak canlıyı YALANLARDI
 * ("Bu Bölümdeki İşçiler" kartının aynı gerekçeyle silinmiş yer tutucusu
 * emsaldir).
 *
 * 🔴 POZ KIRILIMI BURADA TOPLANIR. Uç satırları (malzeme, poz) çifti başına
 * açar; bu kart dar bir alt karttır ve poz kırılımını GÖSTEREMEZ, o yüzden
 * `totalsByItem` ile malzemeye göre toplanır. Kırılımın kendisi "Malzeme"
 * SEKMESİNDEDİR — kart aynı veriyi ikinci kez ÇEKMEZ (tek `useSectionStock`
 * çağrısı iki yüzeyi de besler).
 *
 * 🔴 "ATANAN" VE "SARF" AYRI BASILIR. Tek toplam basılsaydı `+10 alım` ile
 * `−4 sarf` birbirini götürür ve kart 4 birimin harcandığını HİÇ söyleyemezdi.
 */
export interface SectionStockSummaryListProps {
  rows: readonly SectionStockRow[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

/** Alt kart dardır — ilk N malzeme basılır, gerisi sayıyla bildirilir. */
const MAX_VISIBLE_ITEMS = 5;

export function SectionStockSummaryList({
  rows,
  isLoading,
  isError,
}: SectionStockSummaryListProps) {
  if (isError) {
    return (
      <p className="section-detail__message" data-testid="section-stock-card-error">
        Malzeme durumu yüklenemedi
      </p>
    );
  }
  if (isLoading || rows === undefined) {
    return <p className="section-detail__message">Yükleniyor…</p>;
  }

  const totals = totalsByItem(rows);
  if (totals.length === 0) {
    return (
      <p className="section-detail__message" data-testid="section-stock-card-empty">
        Bu bölüme atfedilmiş malzeme yok.
      </p>
    );
  }

  const visible = totals.slice(0, MAX_VISIBLE_ITEMS);
  const hidden = totals.length - visible.length;

  return (
    <>
      <ul className="section-stock-card__list" data-testid="section-stock-card-list">
        {visible.map((total) => (
          <li
            key={total.itemId}
            className="section-stock-card__row"
            data-testid={`section-stock-card-row-${total.code}`}
          >
            <span className="section-stock-card__name">{total.name}</span>
            <span className="section-stock-card__nums">
              {/* Etiketler KISALTILMAZ: iki sayının hangisi olduğu kartın dar
                  olması yüzünden belirsiz kalamaz. */}
              <span className="section-stock-card__issued">
                Sarf {formatQuantity(total.issued)} {total.unit}
              </span>
              <span className="section-stock-card__assigned">
                Atanan {formatQuantity(total.assigned)} {total.unit}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        // Kırpılma SESSİZ OLAMAZ (`list-truncation` kanonunun kardeşi): kaç
        // satırın gizlendiği ve tamamının NEREDE olduğu yazılır.
        <p className="section-detail__message" data-testid="section-stock-card-more">
          +{hidden} malzeme daha — tamamı “Malzeme” sekmesinde.
        </p>
      )}
    </>
  );
}
