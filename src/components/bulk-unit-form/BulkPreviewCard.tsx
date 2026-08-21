import { Badge } from "@/components/ui";
import { EyeIcon, inlineSymbolProps } from "@/components/ui/icons";
import type { UnitBulkPreview, UnitBulkPreviewRow } from "@/lib/api/hooks/useUnitBulk";
import { formatAmount, formatCurrencyTight } from "@/lib/format";

import {
  BULK_CONFLICT_PREVIEW_NOTICE,
  BULK_CONFLICT_ROW_LABEL,
  BULK_EMPTY_TOTAL,
  BULK_PREVIEW_CARD_TITLE,
  BULK_PREVIEW_COLUMNS,
  BULK_PREVIEW_EMPTY_NOTICE,
  BULK_PREVIEW_UNIT_SUFFIX,
  BULK_PREVIEW_VALUE_PREFIX,
  BULK_TOTAL_VALUE_LABEL,
  FACING_OPTIONS,
} from "./constants";

interface BulkPreviewCardProps {
  /** Sunucudan gelen önizleme; henüz sorulmadıysa `null`. */
  preview: UnitBulkPreview | null;
  isLoading: boolean;
  /** Sunucu hatası — OLDUĞU GİBİ basılır. */
  errorMessage: string | null;
  /**
   * Kart boşken basılacak gerekçe. Çağıran, önizlemenin HİÇ alınmadığı hâl ile
   * kurallar değiştiği için ATILDIĞI hâli ayırt edebilsin diye override eder;
   * verilmezse ilk açılışın metni geçerlidir.
   */
  emptyNotice?: string;
}

/** `UnitFacing` → TU 155'te GÖRÜNEN Türkçe etiket (liste F-UNIT1'den gelir). */
const FACING_LABELS = new Map(FACING_OPTIONS.map((option) => [option.value, option.label]));

/** TU 154 "148 / 128" — iki ölçü tek hücrede; biri yoksa "—" basılır. */
function areaText(row: UnitBulkPreviewRow): string {
  const gross = row.gross_area_m2 === null ? BULK_EMPTY_TOTAL : formatAmount(row.gross_area_m2);
  const net = row.net_area_m2 === null ? BULK_EMPTY_TOTAL : formatAmount(row.net_area_m2);
  return `${gross} / ${net}`;
}

/**
 * "Üretim Önizlemesi" kartı (TU 142-174).
 *
 * 🔴 BU KARTTAKİ HİÇBİR SAYI İSTEMCİDE HESAPLANMAZ. `total_units` ve
 * `total_list_value` `UnitBulkPreview`ten OLDUĞU GİBİ gelir. Gerekçe ölçüldü:
 * mockup'ın TU 146/171-172'deki "₺27.264.000" toplamı KENDİ satırlarıyla
 * çelişir (artışsız 27.680.000, %1,5 bileşik artışla ≈29.177.727) ve `bulk.py`
 * bunu kayda geçirmiştir: *"Mockup'in ₺27.264.000 sayisi KANON DEGILDIR ve
 * hedeflenmez"*. İstemci kendi toplamını basarsa sunucununkiyle ayrışır ve
 * kullanıcı hangisinin doğru olduğunu ASLA öğrenemez (MK-1 K15'in buradaki
 * karşılığı: satır da tfoot da TEK kaynaktan).
 *
 * 🔴 ÇAKIŞMA BURADA HATA DEĞİLDİR. Uç 200 döner ve satırlar `conflict=true`
 * ile gelir (*"Cakisma HATA DEGILDIR (TU 177)"*); blokaj yalnız
 * `POST …/units/bulk`tadır (409, hep-ya-hiç). Bu yüzden çakışan satır AMBER
 * işaretlenir, kırmızı hata olarak değil — ama kaydetmenin ne yapacağı da
 * AÇIKÇA yazılır, yoksa kullanıcı 409'u sürpriz olarak görür.
 *
 * ⚠️ TU 145 başlığı mockup'ta `👁` ile başlar; bu kod noktası glif bekçisinin
 * izin listesinde YOKTUR → `EyeIcon` ile basılır (aynı gerekçe TU 68'de de
 * geçerli). Başka bir emoji ile İKAME ETMEK yasaktır.
 *
 * ⚠️ TU 166 "… 17 ünite daha (C-8 → C-24)" satırı BASILMAZ ve bu bir eksiklik
 * DEĞİLDİR: o satır statik mockup'ın çizim kısaltmasıdır. Sunucu `rows`
 * dizisini TAM gönderir (`rows.length === total_units`) ve TU 148 kartı zaten
 * kendi içinde kaydırılan 280px'lik bir kutu yapar. 24 satır DOM'dayken
 * "17 ünite daha" yazmak kullanıcıya YANLIŞ bilgi verirdi.
 *
 * ⚠️ Önizleme İSTEĞE BAĞLIDIR: kart boşken bile kaydetme çalışır (sunucu aynı
 * girdiden yeniden üretir). Ama boş kart "üretilecek ünite yok" demez — açık
 * bir gerekçe basar.
 */
export function BulkPreviewCard({
  preview,
  isLoading,
  errorMessage,
  emptyNotice = BULK_PREVIEW_EMPTY_NOTICE,
}: BulkPreviewCardProps) {
  const conflictCount = preview?.conflicting_unit_nos.length ?? 0;

  // TU 162-164 — dönüşümlü zemin KAT gruplarını ayırır, satır sırasını değil.
  // Sunucu satırları kat kat üretir; grup numarası kat DEĞİŞİMİYLE artar.
  let groupIndex = 0;
  let previousFloor: number | null = null;

  return (
    <section className="pf-card tu-flush-card tu-preview" data-testid="toplu-form-onizleme">
      {/* 144-146 */}
      <div className="tu-preview__head">
        <h2 className="tu-preview__title">
          <EyeIcon {...inlineSymbolProps} />
          {BULK_PREVIEW_CARD_TITLE}
        </h2>
        {preview && (
          <span className="tu-preview__meta" data-testid="toplu-form-onizleme-ozet">
            {preview.total_units} {BULK_PREVIEW_UNIT_SUFFIX} · {BULK_PREVIEW_VALUE_PREFIX}{" "}
            {formatCurrencyTight(preview.total_list_value)}
          </span>
        )}
      </div>

      {errorMessage && (
        <p className="tu-preview__error" data-testid="toplu-form-onizleme-hata">
          {errorMessage}
        </p>
      )}

      {conflictCount > 0 && (
        <p className="tu-preview__conflict" data-testid="toplu-form-onizleme-cakisma">
          {conflictCount} ünite numarası çakışıyor ({preview?.conflicting_unit_nos.join(", ")}).{" "}
          {BULK_CONFLICT_PREVIEW_NOTICE}
        </p>
      )}

      {preview === null ? (
        <p className="tu-preview__notice" data-testid="toplu-form-onizleme-bos">
          {isLoading ? "Önizleme hesaplanıyor…" : emptyNotice}
        </p>
      ) : (
        <>
          {/* 148-169 */}
          <div className="tu-preview__scroll">
            <table className="tu-preview-table" data-testid="toplu-form-onizleme-tablo">
              <thead>
                <tr>
                  <th>{BULK_PREVIEW_COLUMNS.unitNo}</th>
                  <th className="tu-preview-table__center">{BULK_PREVIEW_COLUMNS.floor}</th>
                  <th className="tu-preview-table__center">{BULK_PREVIEW_COLUMNS.layout}</th>
                  <th className="tu-preview-table__right">{BULK_PREVIEW_COLUMNS.area}</th>
                  <th>{BULK_PREVIEW_COLUMNS.facing}</th>
                  <th className="tu-preview-table__right">
                    {BULK_PREVIEW_COLUMNS.listPrice}
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => {
                  if (previousFloor !== null && row.floor !== previousFloor) groupIndex += 1;
                  previousFloor = row.floor;
                  const className = row.conflict
                    ? "tu-preview-row--conflict"
                    : groupIndex % 2 === 1
                      ? "tu-preview-row--stripe"
                      : undefined;

                  return (
                    <tr
                      key={row.unit_no}
                      className={className}
                      data-testid="toplu-form-onizleme-satir"
                    >
                      <td className="tu-preview-table__no">
                        {row.unit_no}
                        {/* Çakışma GÖRÜNÜR bir işarettir; yalnız zemin rengi
                            renk körü kullanıcıya hiçbir şey söylemezdi. */}
                        {row.conflict && (
                          <Badge variant="warning" className="tu-preview-row__flag">
                            {BULK_CONFLICT_ROW_LABEL}
                          </Badge>
                        )}
                      </td>
                      {/* 152 — `floor` üretim turunun SAYISIDIR; üniteye YAZILAN
                          metin `floor_label`dır ve ikisi AYRI alanlardır (karar 4).
                          Kullanıcının gördüğü etiket saklanacak olandır. */}
                      <td className="tu-preview-table__center">{row.floor_label}</td>
                      <td className="tu-preview-table__center">
                        {row.layout ?? BULK_EMPTY_TOTAL}
                      </td>
                      <td className="tu-preview-table__right tu-preview-table__area">
                        {areaText(row)}
                      </td>
                      <td>
                        {row.facing === null
                          ? BULK_EMPTY_TOTAL
                          : (FACING_LABELS.get(row.facing) ?? row.facing)}
                      </td>
                      <td className="tu-preview-table__right tu-preview-table__price">
                        {row.list_price === null
                          ? BULK_EMPTY_TOTAL
                          : formatAmount(row.list_price)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 170-172 — İKİ sayı da SUNUCUDAN */}
          <div className="tu-preview__foot">
            <span className="tu-preview__foot-label">
              {preview.total_units} Ünite · {BULK_TOTAL_VALUE_LABEL}
            </span>
            <span className="tu-preview__foot-value" data-testid="toplu-form-onizleme-toplam">
              {formatCurrencyTight(preview.total_list_value)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
