"use client";

import { useMemo, useState } from "react";

import { Button, Checkbox, Input } from "@/components/ui";
import { Modal } from "@/components/settings/Modal";
import { formatQuantity } from "@/lib/format";
import { normalizeDecimalInput } from "@/lib/decimal";
import { siteQuotaOf } from "@/lib/boq-quota";
import type { BoqGroup, BoqItem } from "@/lib/api/hooks/useBoq";

import { checkOvershoot } from "./allocation-merge";
import "./boq-assignment.css";

/**
 * 🔴 MOCKUP'IN ANLATISI YANLIŞ, KOD DOĞRU — ölçülerek karar verildi.
 *
 * `Form - Poz Secici.dc.html` başındaki karar yorumu *"UÇ: POST
 * /sections/{id}/items (çoklu — seçilen pozlar tek istekte)"* diyor. Böyle bir
 * uç YOKTUR. Gerçek uç `PUT /boq/items/{item_id}/allocations`tır ve
 * **poz başınadır** + **tam küme değiştirmedir**. `TASARIM-DUZELTME-1.md §5`
 * ve `TASARIM-DUZELTME-2.md §4` bu sapmayı zaten kaydetmiştir; emir gereği
 * çelişkide KOD kazanır.
 *
 * ⇒ "N Pozu Ata" N AYRI istektir ve her birinde öbür bölümlerin payları
 * korunur. `TASARIM-DUZELTME-1.md`in açık bıraktığı karar ("kullanıcıya
 * söylensin mi?") burada **SÖYLENSİN** olarak kapatıldı: sessiz kalmak,
 * kullanıcının "yalnız benim bölümüm değişiyor" varsayımını doğrulayacak
 * hiçbir işaret bırakmazdı.
 */
export const OTHER_SECTIONS_PRESERVED_NOTE =
  "Bir poz birden çok bölüme pay edilebilir. Kaydederken diğer bölümlerin payları korunur.";

/**
 * Mockup'ın "Dağıtım" sütunu (yığılmış çubuk + "2 bölümde · 220 m³ boşta")
 * BASILAMAZ ve gerekçesi ÖLÇÜLDÜ: o sütun pozun bölüm bölüm dağılımını ister,
 * ama şantiye BOQ listesi tahsis listesi DÖNDÜRMEZ (BOQ-SEC K6 — N+1 açardı).
 * Listedeki her poz için ayrı `GET .../allocations` çağırmak tam da K6'nın
 * yasakladığı şeydir.
 *
 * Sütun SİLİNMEZ (kanon: karşılığı olmayan mockup öğesi devre dışı + GÖRÜNÜR
 * gerekçeyle basılır) — başlığı durur, hücrede gerekçe basılır.
 */
export const DISTRIBUTION_COLUMN_REASON = "Bölüm bölüm dağılım listede taşınmıyor";

export interface PickerRow {
  readonly item: BoqItem;
  readonly groupName: string;
  /** Bu bölümün SUNUCUDAKİ mevcut payı ("0" = pay yok). */
  readonly sectionQuantity: string;
}

/** Süzgeçsiz şantiye BOQ yanıtını düz satır listesine indirger. */
export function pickerRows(
  groups: readonly BoqGroup[],
  sectionQuantities: ReadonlyMap<string, string>,
): readonly PickerRow[] {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      item,
      groupName: group.name,
      sectionQuantity: sectionQuantities.get(item.id) ?? "0",
    })),
  );
}

/** Poz no VEYA tanımda arar (mockup KARAR 3). */
export function matchesSearch(row: PickerRow, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  if (!needle) return true;
  return (
    row.item.code.toLocaleLowerCase("tr-TR").includes(needle) ||
    row.item.description.toLocaleLowerCase("tr-TR").includes(needle)
  );
}

export interface BoqItemPickerModalProps {
  groups: readonly BoqGroup[];
  /** itemId → bu bölümün sunucudaki payı. */
  sectionQuantities: ReadonlyMap<string, string>;
  /** itemId → kullanıcının bu oturumda girdiği taslak miktar. */
  draft: ReadonlyMap<string, string>;
  onApply: (picked: ReadonlyMap<string, string>) => void;
  onClose: () => void;
}

export function BoqItemPickerModal({
  groups,
  sectionQuantities,
  draft,
  onApply,
  onClose,
}: BoqItemPickerModalProps) {
  const rows = useMemo(() => pickerRows(groups, sectionQuantities), [groups, sectionQuantities]);
  const [query, setQuery] = useState("");
  const [onlyWithQuota, setOnlyWithQuota] = useState(true);
  // itemId → girilen miktar metni. Taslakla tohumlanır: diyalog ikinci kez
  // açıldığında kullanıcının girdiği sayı KAYBOLMAZ.
  const [entered, setEntered] = useState<ReadonlyMap<string, string>>(() => new Map(draft));

  const visible = rows.filter((row) => {
    if (!matchesSearch(row, query)) return false;
    // "Yalnız kotası kalan pozlar": bu bölümün KENDİ payı olan poz, kotası
    // tükenmiş görünse bile listede KALIR — yoksa kullanıcı kendi girdiği
    // miktarı bir daha düzenleyemezdi.
    if (!onlyWithQuota) return true;
    const max = checkOvershoot({
      siteQuota: siteQuotaOf(row.item),
      allocatedTotal: row.item.allocated_quantity,
      sectionCurrentQuantity: row.sectionQuantity,
      nextQuantity: null,
    }).maxForSection;
    return !max.startsWith("-") && Number(max) > 0;
  });

  function setQuantity(itemId: string, raw: string) {
    setEntered((prev) => {
      const next = new Map(prev);
      if (raw.trim() === "") next.delete(itemId);
      else next.set(itemId, raw);
      return next;
    });
  }

  /** Aşımlı satırlar — kaydetme kapısı bunlara bakar (mockup kırmızı bandı). */
  const overshootRows = visible.filter((row) => {
    const raw = entered.get(row.item.id);
    if (raw === undefined) return false;
    const normalized = normalizeDecimalInput(raw);
    if (normalized === null) return false;
    return checkOvershoot({
      siteQuota: siteQuotaOf(row.item),
      allocatedTotal: row.item.allocated_quantity,
      sectionCurrentQuantity: row.sectionQuantity,
      nextQuantity: normalized,
    }).isOvershoot;
  });

  /** Geçersiz metin (harf, çift nokta…) — sessizce yok sayılmaz. */
  const invalidRows = [...entered.entries()].filter(
    ([, raw]) => raw.trim() !== "" && normalizeDecimalInput(raw) === null,
  );

  const selectedCount = [...entered.values()].filter((raw) => {
    const n = normalizeDecimalInput(raw);
    return n !== null && Number(n) > 0;
  }).length;

  const canApply = overshootRows.length === 0 && invalidRows.length === 0;

  function handleApply() {
    if (!canApply) return;
    const picked = new Map<string, string>();
    for (const [itemId, raw] of entered) {
      const normalized = normalizeDecimalInput(raw);
      if (normalized === null) continue;
      picked.set(itemId, normalized);
    }
    onApply(picked);
  }

  return (
    <Modal
      title="Poz Seç"
      onClose={onClose}
      className="sf-boq-picker"
      footer={
        <div className="sf-boq-picker__footer">
          {invalidRows.length > 0 && (
            <p className="sf-boq-picker__error" role="alert">
              {invalidRows.length} satırda geçersiz miktar var — sayı girin.
            </p>
          )}
          {overshootRows.length > 0 && (
            <p className="sf-boq-picker__error" role="alert">
              {overshootRows.length} pozda kota aşımı var — en fazla kalan kadar atayabilirsiniz.
            </p>
          )}
          <span className="sf-boq-picker__count">
            <strong>{selectedCount}</strong> poz seçili
          </span>
          <Button variant="secondary" type="button" onClick={onClose}>
            Vazgeç
          </Button>
          <Button variant="primary" type="button" disabled={!canApply} onClick={handleApply}>
            {selectedCount > 0 ? `${selectedCount} Pozu Ata` : "Ata"}
          </Button>
        </div>
      }
    >
      <div className="sf-boq-picker__toolbar">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Poz no veya tanımda ara..."
          aria-label="Poz no veya tanımda ara"
        />
        <Checkbox
          checked={onlyWithQuota}
          onChange={(e) => setOnlyWithQuota(e.target.checked)}
          label="Yalnız kotası kalan pozlar"
        />
      </div>

      <p className="sf-boq-picker__note">{OTHER_SECTIONS_PRESERVED_NOTE}</p>

      <table className="sf-boq-ptable">
        <caption className="sr-only">Şantiye kotasından seçilebilecek pozlar</caption>
        <thead>
          <tr>
            <th scope="col">Poz No</th>
            <th scope="col">Tanım</th>
            <th scope="col">Birim</th>
            <th scope="col">Şantiye Kotası</th>
            <th scope="col">Dağıtılmış</th>
            <th scope="col">Kalan</th>
            <th scope="col">Bu Bölüme</th>
            <th scope="col">Dağıtım</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={8} className="sf-boq-ptable__empty">
                {rows.length === 0
                  ? "Bu şantiyede henüz iş kalemi yok — önce İş Kalemleri ekranından poz ekleyin."
                  : "Süzgece uyan poz yok."}
              </td>
            </tr>
          ) : (
            visible.map((row) => {
              const raw = entered.get(row.item.id) ?? "";
              const normalized = normalizeDecimalInput(raw);
              const check = checkOvershoot({
                siteQuota: siteQuotaOf(row.item),
                allocatedTotal: row.item.allocated_quantity,
                sectionCurrentQuantity: row.sectionQuantity,
                nextQuantity: normalized,
              });
              const isInvalid = raw.trim() !== "" && normalized === null;
              return (
                <tr key={row.item.id} className={check.isOvershoot ? "sf-boq-ptable__row--over" : undefined}>
                  <td className="sf-boq-ptable__code">{row.item.code}</td>
                  <td>
                    <span className="sf-boq-ptable__desc">{row.item.description}</span>
                    <span className="sf-boq-ptable__group">{row.groupName}</span>
                    {check.isOvershoot && (
                      <span className="sf-boq-ptable__warn">
                        Kalan kotayı {formatQuantity(check.excess)} {row.item.unit} aşıyor
                      </span>
                    )}
                  </td>
                  <td className="sf-boq-ptable__center">{row.item.unit}</td>
                  <td className="sf-boq-ptable__num">{formatQuantity(siteQuotaOf(row.item))}</td>
                  <td className="sf-boq-ptable__num sf-boq-ptable__num--muted">
                    {formatQuantity(row.item.allocated_quantity)}
                  </td>
                  <td className="sf-boq-ptable__num sf-boq-ptable__num--rest">
                    {formatQuantity(check.maxForSection)}
                  </td>
                  <td className="sf-boq-ptable__num">
                    <Input
                      numeric
                      size="row"
                      inputMode="decimal"
                      value={raw}
                      status={check.isOvershoot || isInvalid ? "error" : "default"}
                      aria-invalid={check.isOvershoot || isInvalid}
                      aria-label={`${row.item.code} için bu bölüme atanacak miktar`}
                      onChange={(e) => setQuantity(row.item.id, e.target.value)}
                    />
                  </td>
                  {/* 🔴 Karşılığı olmayan sütun SİLİNMEZ — gerekçe ekranda durur. */}
                  <td className="sf-boq-ptable__pending" title={DISTRIBUTION_COLUMN_REASON}>
                    {DISTRIBUTION_COLUMN_REASON}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </Modal>
  );
}
