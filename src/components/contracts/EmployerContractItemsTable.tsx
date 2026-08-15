import Link from "next/link";

import { Button } from "@/components/ui";
import { CheckIcon, inlineSymbolProps } from "@/components/ui/icons";
import {
  EMPLOYER_ADD_NEEDS_GROUPS_REASON,
  EMPLOYER_ITEM_TEXT,
} from "@/components/contract-item-form/constants";
import { cx } from "@/lib/cx";
import { formatAmount, formatQuantity } from "@/lib/format";
import type {
  EmployerContractDetail,
  EmployerContractItemsResponse,
} from "@/lib/api/hooks/useContract";

import { employerContractDistributionHref } from "./employer-contract-tabs";
import "./employer-contract-detail.css";

/**
 * E14 92 · "İş Kalemleri" sekmesi.
 *
 * ⚠️ Bu sekmenin İÇERİĞİ E14 mockup'ında ÇİZİLİ DEĞİLDİR (mockup yalnız
 * "Genel" sekmesini gösterir, 97-149). Tasarım İCAT EDİLMEDİ: kanon
 * `İşveren Sözleşme - Poz Dağılımı.dc.html`tir (POZ) — aynı verinin çizilmiş
 * tek tablosu. Kolonlar POZ 77-84'ten BİREBİR alınır:
 *   POZ 77 "Poz No" · 78 "Poz Adı" · 79 "Birim" · 80 "Sözl. Birim F." ·
 *   81 "Toplam Miktar" · 82-83 şantiye kota kolonları · 84 "Kalan"
 * E14'ün ucu (`GET /projects/{id}/contract/items`) ŞANTİYE KIRILIMI VERMEZ —
 * kalem başına toplam `distributed_quantity` verir. Bu yüzden POZ'un dinamik
 * şantiye kolonları (82-83) TEK bir "Dağıtılan" kolonuna toplulaştırılır;
 * kolon eklenmez/çıkarılmaz, yalnız kırılım toplanır. Şantiye kırılımı POZ
 * ekranının işidir — sekmenin sağ üstündeki giriş oraya götürür.
 * Grup başlık satırı POZ 89-90; "Kalan" rozeti POZ 100.
 *
 * `items_total`/`items_total_diff` şemada VARDIR ama ne E14 ne POZ onları
 * çizer; veri kaybını önlemek için BOQ'un "GENEL TOPLAM" satırı emsaliyle
 * (`Ekran 13 - İş Kalemleri.dc.html` 174-176) tablonun tfoot'unda gösterilir.
 */
export interface EmployerContractItemsTableProps {
  projectId: string;
  detail: EmployerContractDetail;
  isError: boolean;
  isLoading: boolean;
  data?: EmployerContractItemsResponse;
  /**
   * F-BLG T2a · "+ Poz Ekle" (kanon `Form - Poz Ekle Isveren.dc.html`). E14
   * mockup'ında bu sekme çizili olmadığı için buton POZ ekranının ekleme
   * girişinden türetilmedi; forma giden TEK görünür giriş budur. Grup listesi
   * yüklenmeden basılamaz (`group_id` ZORUNLU) — gerekçe görünür basılır.
   */
  onAddItem: () => void;
}

const COLUMN_COUNT = 7;

export function EmployerContractItemsTable({
  projectId,
  detail,
  isError,
  isLoading,
  data,
  onAddItem,
}: EmployerContractItemsTableProps) {
  const groups = data?.groups;
  // `group_id` zorunlu olduğu için grup listesi olmadan form açılamaz.
  const hasGroups = (groups?.length ?? 0) > 0;

  return (
    <section className="ecd-items" aria-labelledby="ecd-items-title">
      {/* POZ 70-72 başlık şeridi + POZ ekranına GÖRÜNÜR giriş (E14'te karşılığı
          YOK; her rotanın görünür bir girişi olmalı — rapor edildi). */}
      <div className="ecd-items__head">
        <span className="ecd-items__head-title" id="ecd-items-title">
          Poz Listesi
        </span>
        <Link
          href={employerContractDistributionHref(projectId)}
          className="ecd-items__head-link"
          data-testid="ecd-distribution-link"
        >
          Poz Dağılımı →
        </Link>
        <Button
          variant="ghost"
          className="ecd-items__add"
          onClick={onAddItem}
          disabled={!hasGroups}
          data-testid="ecd-add-item"
        >
          {EMPLOYER_ITEM_TEXT.addItem}
        </Button>
      </div>

      {!hasGroups && !isLoading && !isError && (
        <p className="ecd-items__notice" data-testid="ecd-add-item-reason">
          {EMPLOYER_ADD_NEEDS_GROUPS_REASON}
        </p>
      )}

      {isError ? (
        <p className="ecd-empty">İş kalemleri yüklenemedi</p>
      ) : isLoading || !groups ? (
        <p className="ecd-empty">Yükleniyor…</p>
      ) : groups.length === 0 ? (
        <p className="ecd-empty">Bu sözleşmede henüz iş kalemi yok</p>
      ) : (
        <div className="ecd-items__scroll">
          <table className="ecd-items__table">
            <thead>
              <tr>
                <th className="ecd-items__th ecd-items__th--lead">Poz No</th>
                <th className="ecd-items__th ecd-items__th--lead">Poz Adı</th>
                <th className="ecd-items__th ecd-items__th--center">Birim</th>
                <th className="ecd-items__th ecd-items__th--right">Sözl. Birim F.</th>
                <th className="ecd-items__th ecd-items__th--right">Toplam Miktar</th>
                <th className="ecd-items__th ecd-items__th--right">Dağıtılan</th>
                <th className="ecd-items__th ecd-items__th--center">Kalan</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <GroupRows key={group.id} group={group} />
              ))}
            </tbody>
            <tfoot>
              <tr className="ecd-items__foot-row">
                <td className="ecd-items__foot-cell" colSpan={COLUMN_COUNT - 1}>
                  Kalem Toplamı
                  {/* Sözleşme bedeliyle farkı — şemada `items_total_diff`. */}
                  <span className="ecd-items__foot-diff" data-testid="ecd-items-diff">
                    {" "}
                    · Sözleşme bedeliyle fark: {formatAmount(detail.items_total_diff)}
                  </span>
                </td>
                <td
                  className="ecd-items__foot-cell ecd-items__foot-cell--value"
                  data-testid="ecd-items-total"
                >
                  {formatAmount(detail.items_total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

function GroupRows({
  group,
}: {
  group: EmployerContractItemsResponse["groups"][number];
}) {
  return (
    <>
      {/* POZ 89-90 */}
      <tr className="ecd-items__group-row">
        <td className="ecd-items__group-cell" colSpan={COLUMN_COUNT}>
          {group.name}
        </td>
      </tr>
      {group.items.map((item) => {
        const remaining = Number(item.remaining_quantity);
        const isSettled = Number.isFinite(remaining) && remaining === 0;
        return (
          <tr className="ecd-items__row" key={item.id}>
            <td className="ecd-items__td ecd-items__td--code">{item.code}</td>
            <td className="ecd-items__td ecd-items__td--name">{item.description}</td>
            <td className="ecd-items__td ecd-items__td--center">{item.unit}</td>
            <td className="ecd-items__td ecd-items__td--price">
              {formatAmount(item.unit_price)}
            </td>
            <td className="ecd-items__td ecd-items__td--qty">
              {formatQuantity(item.quantity)}
            </td>
            <td
              className="ecd-items__td ecd-items__td--distributed"
              data-testid="ecd-item-distributed"
            >
              {formatQuantity(item.distributed_quantity)}
            </td>
            <td className="ecd-items__td ecd-items__td--center">
              {/* POZ 100: tamamı dağıtılmışsa yeşil "✓ 0", değilse kalan miktar. */}
              <span
                className={cx(
                  "ecd-items__remaining",
                  isSettled ? "ecd-items__remaining--zero" : "ecd-items__remaining--open",
                )}
                data-testid="ecd-item-remaining"
                // `✓` artık inline SVG (F-SEM) ⇒ metinden ayırt edilemez;
                // kapanmış rozet YAPISAL olarak da damgalanır.
                data-settled={isSettled ? "true" : "false"}
              >
                {isSettled ? (
                  <>
                    <CheckIcon {...inlineSymbolProps} /> 0
                  </>
                ) : (
                  formatQuantity(item.remaining_quantity)
                )}
              </span>
            </td>
          </tr>
        );
      })}
    </>
  );
}
