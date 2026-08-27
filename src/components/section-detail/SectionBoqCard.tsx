import { Fragment } from "react";

import { Button } from "@/components/ui/button/Button";
import { BoqPctCell } from "@/components/boq/BoqPctCell";
import { formatAmount, formatQuantity } from "@/lib/format";
import type { BoqGroup, BoqTotals } from "@/lib/api/hooks/useBoq";

// Tablo görsel dili şantiye BOQ ekranıyla AYNIDIR (aynı mockup ailesi) —
// sınıflar kopyalanmaz, ORADAN tüketilir. Sıra önemli: önce paylaşılan tablo,
// sonra bu ekrana özgü ekler.
import "@/components/boq/boq.css";
import "./section-detail.css";

/**
 * Mockup D124 sekizinci sütunu — backend'de karşılığı YOK, gerekçe ekrana basılır.
 *
 * 🔴 F-UNIT1 T5 · İKİNCİ YARISI DÜZELTİLDİ. "hakediş modülüyle birlikte gelir"
 * BAYATTI (`/hakedisler` CANLI); ilk yarısı ("backend'de tutulmuyor") zaten
 * gerçek gerekçeydi ve tek başına yeter.
 */
export const STATUS_COLUMN_REASON = "Kalem durumu backend'de tutulmuyor";

/** Mockup D112 "+ Kalem Ekle" — poz seçici diyaloğunun mockup'ı ÇİZİLMEMİŞ (K1). */
export const ADD_ITEM_DISABLED_REASON =
  "Poz seçme ekranı henüz tasarlanmadı — iş kalemi şantiye İş Kalemleri ekranından eklenir";

const COLUMN_COUNT = 8;

/** "A", "B", … — mockup D129/D162/D188 grup başlıkları HARF önekiyle sayar. */
function groupLetter(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}

export interface SectionBoqCardProps {
  /** `GET /sites/{id}/boq?section_id=` yanıtı — gruplar geldiği sırada basılır. */
  groups: BoqGroup[];
  totals: BoqTotals;
  /** Başlıktaki "İş Kalemleri — {bölüm}" (mockup D110). */
  sectionName: string;
}

/**
 * Bölüm detayı · İş Kalemleri sekmesi (mockup `Bölüm Detay.dc.html:107-205`).
 *
 * 🔴 BU EKRAN SÜZGEÇLİ YANITI BASAR: `quantity` alanı BU BÖLÜME tahsis edilen
 * miktardır (poz kotası DEĞİL — BOQ-SEC K5). Mockup'ın "Miktar" sütunu tam da
 * bunu ister, dolayısıyla burada `siteQuotaOf()` KULLANILMAZ; kota sütunu bu
 * tabloda hiç yoktur. `amount` / `group_total` / `grand_total` de aynı
 * maskelenmiş miktardan türer — yani "BÖLÜM TOPLAM" gerçekten bölümün payıdır.
 *
 * ⚠️ Süzgeçli yanıtta BOŞALAN GRUPLAR listeden düşer (backend `service.py:202`),
 * bu yüzden boş grup başlığı dalı YAZILMAZ — ölü kod olurdu.
 *
 * İki sütun mockup'ta çizilidir ve sahte veriyle DOLDURULMAZ:
 *   - `Gerç. %` → SATIR bazında hâlâ `progress_pct` yer tutucusudur (hakediş/P7).
 *     ⚠️ Eski not "her zaman `—`" diyordu ve TOPLAM SATIRI için BAYATLADI:
 *     `totals.grand_progress_pct` ILR-1'de bağlandı (`boq/service.py:215`),
 *     dolayısıyla BÖLÜM TOPLAM yüzdesi artık gerçek değer basabilir.
 *   - `Durum`   → hiçbir alan yok, `—` + görünür gerekçe
 * İkisi de SİLİNMEZ (F-TH kanonu).
 */
export function SectionBoqCard({ groups, totals, sectionName }: SectionBoqCardProps) {
  const itemCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  return (
    <section className="section-boq">
      {/* D109-114 başlık şeridi */}
      <div className="section-boq__head">
        <span className="section-boq__title">İş Kalemleri — {sectionName}</span>
        <span className="section-boq__meta">
          {itemCount} kalem · {formatAmount(totals.grand_total)} toplam
        </span>
        {/* 🔴 K1: mockup'ın "+ Kalem Ekle" düğmesi SİLİNMEZ, görünür gerekçeyle
            devre dışı basılır — poz seçici diyaloğunun mockup'ı çizilmemiştir,
            kendi başımıza seçici TASARLAMAYIZ. Gerekçe düğmenin yanında
            EKRANDA durur (`title`da saklanmaz — F-PRJTAB kanonu). */}
        <span className="section-boq__add">
          <Button type="button" variant="primary" size="sm" disabled>
            + Kalem Ekle
          </Button>
          <span className="section-boq__add-reason">{ADD_ITEM_DISABLED_REASON}</span>
        </span>
      </div>

      <table className="boq-table section-boq__table">
        <caption className="sr-only">{sectionName} bölümüne atanmış iş kalemleri</caption>
        <thead>
          <tr className="boq-table__head-row">
            <th scope="col" className="boq-table__th boq-table__col--code">
              Poz No
            </th>
            <th scope="col" className="boq-table__th boq-table__col--desc">
              İş Kalemi
            </th>
            <th scope="col" className="boq-table__th boq-table__col--unit">
              Birim
            </th>
            <th scope="col" className="boq-table__th boq-table__col--quantity">
              Miktar
            </th>
            <th scope="col" className="boq-table__th boq-table__col--price">
              B. Fiyat
            </th>
            <th scope="col" className="boq-table__th boq-table__col--amount">
              Tutar
            </th>
            <th scope="col" className="boq-table__th boq-table__col--pct">
              Gerç. %
            </th>
            <th scope="col" className="boq-table__th section-boq__col--status">
              Durum
            </th>
          </tr>
        </thead>
        <tbody>
          {groups.length === 0 ? (
            <tr>
              <td className="boq-table__empty" colSpan={COLUMN_COUNT} data-testid="section-boq-empty">
                <p className="boq-table__empty-text">
                  Bu bölüme henüz iş kalemi atanmadı.
                </p>
              </td>
            </tr>
          ) : (
            groups.map((group, index) => (
              <Fragment key={group.id}>
                <tr className="boq-table__group-row">
                  <th
                    scope="colgroup"
                    colSpan={COLUMN_COUNT}
                    className="boq-table__group"
                    data-testid="section-boq-group"
                  >
                    {`${groupLetter(index)}. ${group.name}`}
                  </th>
                </tr>
                {group.items.map((item) => {
                  return (
                    <tr key={item.id} className="boq-table__row" data-testid="section-boq-row">
                      <td className="boq-table__cell boq-table__cell--code boq-table__col--code">
                        {item.code}
                      </td>
                      <td className="boq-table__cell boq-table__col--desc">{item.description}</td>
                      <td className="boq-table__cell boq-table__cell--unit boq-table__col--unit">
                        {item.unit}
                      </td>
                      {/* 🔴 Süzgeçli yanıt: BU BÖLÜME tahsis edilen miktar. */}
                      <td
                        className="boq-table__cell boq-table__cell--num boq-table__col--quantity"
                        data-testid="section-boq-quantity"
                      >
                        {formatQuantity(item.quantity)}
                      </td>
                      <td className="boq-table__cell boq-table__cell--num boq-table__col--price">
                        {formatAmount(item.unit_price)}
                      </td>
                      {/* `amount` backend türevidir; miktar × fiyat frontend'de
                          YENİDEN HESAPLANMAZ. */}
                      <td className="boq-table__cell boq-table__cell--num boq-table__cell--amount boq-table__col--amount">
                        {formatAmount(item.amount)}
                      </td>
                      {/* ⚠️ `BoqTable` ile BIREBIR ayni hucre; kusur da iki
                          kopyada birden yasiyordu. Tek kaynak: `BoqPctCell`. */}
                      <BoqPctCell
                        progress={item.progress_pct}
                        className="boq-table__pct"
                        data-testid="section-boq-pct"
                      />
                      {/* D124 `Durum`: mockup renkli bir nokta basıyor; veri YOK
                          → nötr `—`, sahte durum uydurulmaz. */}
                      <td
                        className="boq-table__pct boq-table__pct--pending section-boq__col--status"
                        data-testid="section-boq-status"
                        title={STATUS_COLUMN_REASON}
                      >
                        —<span className="sr-only">{STATUS_COLUMN_REASON}</span>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))
          )}
        </tbody>
        {/* D200-205: "BÖLÜM TOPLAM (N kalem)". Toplam frontend'de HESAPLANMAZ —
            backend'in `grand_total`ı biçimlenir; süzgeçli çağrıda o değer zaten
            yalnız bu bölümün payını kapsar. */}
        <tfoot>
          <tr className="boq-table__total-row" data-testid="section-boq-total-row">
            <th scope="row" colSpan={5} className="boq-table__total-label">
              BÖLÜM TOPLAM ({itemCount} kalem)
            </th>
            <td
              className="boq-table__total-amount boq-table__col--amount"
              data-testid="section-boq-total-amount"
            >
              {formatAmount(totals.grand_total)}
            </td>
            <BoqPctCell
              progress={totals.grand_progress_pct}
              className="boq-table__total-pct boq-table__col--pct"
              data-testid="section-boq-total-pct"
            />
            <td className="section-boq__col--status" />
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
