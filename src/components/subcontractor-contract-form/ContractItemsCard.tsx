"use client";

import { useState } from "react";

import { Button, Input } from "@/components/ui";
import { cx } from "@/lib/cx";
import { formatAmount } from "@/lib/format";
import type { SubcontractorContractItemResponse } from "@/lib/api/hooks/useSubcontractorContractMutations";

import { ADD_ITEM_PENDING_REASON, FSO_TEXT } from "./constants";
import { decimalInputValue, groupContractItems } from "./item-rows";

/**
 * FSO 112-187 · "⭐ Poz Listesi & Taşeron Fiyatları" kartı.
 *
 * Kolonlar 123-129'dan BİREBİR: Poz No · Poz Adı · Birim · Miktar ·
 * ⭐ Taşeron B.F. · Toplam Bedel · (sil). Miktar (137) ve Taşeron B.F. (138)
 * satır-içi düzenlenebilir; B.F. hücresi mockup'ta SARI vurguludur (138).
 * tfoot (180-184) "TOPLAM SÖZLEŞME BEDELİ" — TEK KAYNAK `contract_total`
 * (türev toplam sunucudadır, istemci yeniden hesaplamaz).
 *
 * **`unit_price` boş = "girilmedi", `0` DEĞİL** (şema açıklaması: fiyatsız
 * satır toplama 0 katkı verir). Boşaltılan hücre uca `null` gider; `0`
 * gönderilmez. Kaç satırın fiyatsız olduğu sunucunun `items_missing_price`
 * sayacından GÖRÜNÜR biçimde basılır — sessiz yutma yasak.
 */
export interface ContractItemsCardProps {
  items: readonly SubcontractorContractItemResponse[];
  /** `SubcontractorContractDetail.contract_total`; sözleşme yoksa `null`. */
  contractTotal: string | null;
  /** `SubcontractorContractDetail.items_missing_price`. */
  itemsMissingPrice: number;
  /** 115 rozetindeki işveren sözleşme no'su; yoksa rozet basılmaz. */
  employerContractNo: string | null;
  /** `load-from-employer` yanıtı — created/skipped GÖRÜNÜR basılır. */
  loadNotice: { created: number; skipped: number } | null;
  loadError: string | null;
  isLoadPending: boolean;
  isBusy: boolean;
  /** Yükleme butonu kapalıysa gerekçesi (proje seçilmedi vb.); yoksa `null`. */
  loadDisabledReason: string | null;
  onLoadFromEmployer: () => void;
  onCommitItem: (itemId: string, patch: { quantity?: string; unitPrice?: string }) => void;
  onDeleteItem: (itemId: string) => void;
}

interface RowDraft {
  quantity?: string;
  unitPrice?: string;
}

const COLUMN_COUNT = 7;

export function ContractItemsCard({
  items,
  contractTotal,
  itemsMissingPrice,
  employerContractNo,
  loadNotice,
  loadError,
  isLoadPending,
  isBusy,
  loadDisabledReason,
  onLoadFromEmployer,
  onCommitItem,
  onDeleteItem,
}: ContractItemsCardProps) {
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const groups = groupContractItems(items);

  function setDraft(itemId: string, patch: RowDraft) {
    setDrafts((prev) => ({ ...prev, [itemId]: { ...prev[itemId], ...patch } }));
  }

  function clearDraft(itemId: string, field: keyof RowDraft) {
    setDrafts((prev) => {
      const current = prev[itemId];
      if (!current || current[field] === undefined) return prev;
      // Mutasyon YOK: alanı çıkarılmış YENİ bir nesne kurulur.
      const next = Object.fromEntries(
        Object.entries(current).filter(([key]) => key !== field),
      ) as RowDraft;
      return { ...prev, [itemId]: next };
    });
  }

  function commitQuantity(item: SubcontractorContractItemResponse) {
    const draft = drafts[item.id]?.quantity;
    clearDraft(item.id, "quantity");
    if (draft === undefined) return;
    // Boş miktar GÖNDERİLMEZ: şemada `quantity > 0` zorunludur, boşaltmak
    // silmek demek değildir — hücre sunucu değerine geri döner.
    if (!draft.trim()) return;
    if (draft.trim() === decimalInputValue(item.quantity)) return;
    onCommitItem(item.id, { quantity: draft.trim() });
  }

  function commitUnitPrice(item: SubcontractorContractItemResponse) {
    const draft = drafts[item.id]?.unitPrice;
    clearDraft(item.id, "unitPrice");
    if (draft === undefined) return;
    const next = draft.trim();
    if (next === decimalInputValue(item.unit_price)) return;
    // Boş → "girilmedi" (`null`); `0` ASLA türetilmez.
    onCommitItem(item.id, { unitPrice: next });
  }

  return (
    <section className="pf-card fso-items" aria-labelledby="fso-items-card">
      {/* 113-117 · başlık şeridi */}
      <div className="fso-items__head">
        <span className="fso-items__title" id="fso-items-card">
          {FSO_TEXT.itemsCard}
        </span>
        {employerContractNo && items.length > 0 && (
          <span className="fso-items__badge" data-testid="fso-items-source">
            {employerContractNo}&apos;den yüklendi
          </span>
        )}
        <div className="fso-items__actions">
          <Button
            variant="secondary"
            className="fso-items__load"
            disabled={isBusy || isLoadPending || Boolean(loadDisabledReason)}
            title={loadDisabledReason ?? undefined}
            onClick={onLoadFromEmployer}
          >
            {isLoadPending ? "Yükleniyor…" : FSO_TEXT.loadFromEmployer}
          </Button>
          {/* 116 · elle poz ekleme — backend ucu var, MOCKUP FORMU YOK. */}
          <Button
            variant="ghost"
            className="fso-items__add"
            disabled
            title={ADD_ITEM_PENDING_REASON}
          >
            {FSO_TEXT.addItem}
          </Button>
        </div>
      </div>

      {/* 118-120 · sarı bilgi bandı */}
      <p className="fso-items__banner">{FSO_TEXT.itemsBanner}</p>

      {loadNotice && (
        <p className="fso-items__notice" data-testid="fso-load-notice">
          İşveren sözleşmesinden {loadNotice.created} poz eklendi,{" "}
          {loadNotice.skipped} poz zaten listede olduğu için atlandı.
        </p>
      )}
      {loadError && (
        <p className="fso-items__notice fso-items__notice--error" data-testid="fso-load-error">
          {loadError}
        </p>
      )}
      {itemsMissingPrice > 0 && (
        <p className="fso-items__notice fso-items__notice--warning" data-testid="fso-missing-price">
          {itemsMissingPrice} pozun Taşeron B.F. değeri {FSO_TEXT.missingPriceLabel} — bu satırlar
          sözleşme bedeline katkı vermez.
        </p>
      )}

      <div className="fso-items__scroll">
        <table className="fso-items__table">
          <thead>
            <tr>
              <th className="fso-items__th fso-items__th--lead">Poz No</th>
              <th className="fso-items__th fso-items__th--lead">Poz Adı</th>
              <th className="fso-items__th fso-items__th--center">Birim</th>
              <th className="fso-items__th fso-items__th--right">Miktar</th>
              <th className="fso-items__th fso-items__th--right fso-items__th--star">
                ⭐ Taşeron B.F.
              </th>
              <th className="fso-items__th fso-items__th--right fso-items__th--total">
                Toplam Bedel
              </th>
              <th className="fso-items__th fso-items__th--action" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td className="fso-items__empty" colSpan={COLUMN_COUNT}>
                  Poz listesi henüz boş — işveren sözleşmesinden yükleyin.
                </td>
              </tr>
            ) : (
              groups.map((group, groupIndex) => (
                <ItemGroup
                  key={group.key}
                  group={group}
                  groupIndex={groupIndex}
                  drafts={drafts}
                  isBusy={isBusy}
                  onDraft={setDraft}
                  onCommitQuantity={commitQuantity}
                  onCommitUnitPrice={commitUnitPrice}
                  onDeleteItem={onDeleteItem}
                />
              ))
            )}
            {/* 170-177 · alt satır aksiyonu; mockup formu olmadığı için kapalı. */}
            <tr className="fso-items__add-row">
              <td colSpan={COLUMN_COUNT}>
                <Button
                  variant="secondary"
                  className="fso-items__add-row-btn"
                  disabled
                  title={ADD_ITEM_PENDING_REASON}
                >
                  {FSO_TEXT.addItemRow}
                </Button>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="fso-items__foot-row">
              <td className="fso-items__foot-cell" colSpan={COLUMN_COUNT - 2}>
                {FSO_TEXT.itemsTotal}
              </td>
              <td
                className="fso-items__foot-cell fso-items__foot-cell--value"
                data-testid="fso-items-total"
              >
                {contractTotal === null ? "—" : `₺${formatAmount(contractTotal)}`}
              </td>
              <td className="fso-items__foot-cell" />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

interface ItemGroupProps {
  group: ReturnType<typeof groupContractItems>[number];
  groupIndex: number;
  drafts: Record<string, RowDraft>;
  isBusy: boolean;
  onDraft: (itemId: string, patch: RowDraft) => void;
  onCommitQuantity: (item: SubcontractorContractItemResponse) => void;
  onCommitUnitPrice: (item: SubcontractorContractItemResponse) => void;
  onDeleteItem: (itemId: string) => void;
}

function ItemGroup({
  group,
  groupIndex,
  drafts,
  isBusy,
  onDraft,
  onCommitQuantity,
  onCommitUnitPrice,
  onDeleteItem,
}: ItemGroupProps) {
  return (
    <>
      {group.name && (
        // 132 mavi / 160 yeşil — mockup iki grubu İKİ AYRI tonda basar; ton
        // grup SIRASINA göre dönüşümlüdür (üçüncü grup yine maviye döner).
        <tr
          className={cx(
            "fso-items__group-row",
            groupIndex % 2 === 1 && "fso-items__group-row--alt",
          )}
        >
          <td className="fso-items__group-cell" colSpan={COLUMN_COUNT}>
            {group.name}
          </td>
        </tr>
      )}
      {group.items.map((item) => {
        const draft = drafts[item.id] ?? {};
        const hasPrice = item.unit_price !== null;
        return (
          <tr className="fso-items__row" key={item.id}>
            <td className="fso-items__td fso-items__td--code">{item.code}</td>
            <td className="fso-items__td fso-items__td--name">{item.description}</td>
            <td className="fso-items__td fso-items__td--center">{item.unit}</td>
            <td className="fso-items__td fso-items__td--input">
              <Input
                size="row"
                type="number"
                numeric
                min={0}
                aria-label={`${item.code} miktar`}
                disabled={isBusy}
                value={draft.quantity ?? decimalInputValue(item.quantity)}
                onChange={(event) => onDraft(item.id, { quantity: event.target.value })}
                onBlur={() => onCommitQuantity(item)}
              />
            </td>
            <td className="fso-items__td fso-items__td--input">
              <Input
                size="row"
                type="number"
                numeric
                min={0}
                className="fso-items__price-input"
                aria-label={`${item.code} taşeron birim fiyatı`}
                placeholder={FSO_TEXT.missingPriceLabel}
                disabled={isBusy}
                value={draft.unitPrice ?? decimalInputValue(item.unit_price)}
                onChange={(event) => onDraft(item.id, { unitPrice: event.target.value })}
                onBlur={() => onCommitUnitPrice(item)}
              />
            </td>
            <td
              className={cx(
                "fso-items__td fso-items__td--line-total",
                !hasPrice && "fso-items__td--missing",
              )}
              data-testid={`fso-line-total-${item.code}`}
            >
              {hasPrice ? formatAmount(item.line_total) : FSO_TEXT.missingPriceLabel}
            </td>
            <td className="fso-items__td fso-items__td--center">
              {/* 140 · satır silme */}
              <button
                type="button"
                className="fso-items__delete"
                aria-label={`${item.code} satırını sil`}
                disabled={isBusy}
                onClick={() => onDeleteItem(item.id)}
              >
                ×
              </button>
            </td>
          </tr>
        );
      })}
    </>
  );
}
