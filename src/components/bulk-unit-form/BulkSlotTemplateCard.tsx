import { Checkbox, Input, Select } from "@/components/ui";

import {
  BULK_EMPTY_TOTAL,
  BULK_PRICE_INCREASE_LABEL,
  BULK_PRICE_INCREASE_PREFIX,
  BULK_PRICE_INCREASE_SUFFIX,
  BULK_SLOT_CARD_HINT,
  BULK_SLOT_CARD_TITLE,
  BULK_SLOT_EMPTY_NOTICE,
  BULK_SLOT_FACING_LABEL,
  BULK_SLOT_GROSS_LABEL,
  BULK_SLOT_LAYOUT_LABEL,
  BULK_SLOT_LIST_PRICE_LABEL,
  BULK_SLOT_NET_LABEL,
  BULK_SLOT_SEQUENCE_LABEL,
  BULK_UNIT_COST_LABEL,
  BULK_UNIT_COST_PENDING_REASON,
  FACING_OPTIONS,
  UNIT_LAYOUT_OPTIONS,
  type UnitFacing,
} from "./constants";
import type { BulkUnitFormValues } from "./form-state";
import type { BulkSlotField, BulkSlotValues } from "./slots";

interface BulkSlotTemplateCardProps {
  values: BulkUnitFormValues;
  onChangeSlot: <K extends BulkSlotField>(
    index: number,
    field: K,
    value: BulkSlotValues[K],
  ) => void;
  onChangeField: <K extends keyof BulkUnitFormValues>(
    field: K,
    value: BulkUnitFormValues[K],
  ) => void;
}

/**
 * "🏠 Kat Şablonu" kartı (TU 90-140).
 *
 * 🔴 SATIR SAYISI TU 72 "Kat Başına Daire" İLE KİLİTLİDİR ve bu kilit BU
 * BİLEŞENDE DEĞİL, `form-state.ts::setUnitsPerFloor` içindedir — tablo kendi
 * satırını EKLEYİP SİLMEZ. Sunucu kuralı `len(slots) == units_per_floor`;
 * tablo bağımsız hareket ederse kullanıcı 3 daire yazıp 4 satır doldurur ve
 * kayıt sebebi görünmeyen bir 422 döner.
 *
 * 🔴 TU 104 "Maliyet (₺)" SÜTUNU SİLİNMEZ ama GÖVDEYE ULAŞAMAZ.
 * `units/models.py` gerekçeyi kendi yazar: *"Maliyet sutunu ACILMAZ (karar 3,
 * spec §4.5): maliyet ileride Is Kalemleri/satinalmadan otomatik
 * hesaplanacaktir"* — ve `UnitBulkSlot` şemasında da karşılığı yoktur. F-UNIT1
 * UE 91'de aynı sınıfı çözdü: kutu `disabled` basılır, gerekçe GÖRÜNÜR bir
 * paragraftadır (`title`da SAKLANMAZ — F-TH kanonu) ve `slots.ts`teki
 * `BulkSlotValues`ta KARŞILIĞI OLMADIĞI için gövdeye sızması YAPISAL OLARAK
 * İMKÂNSIZDIR.
 *
 * ⚠️ EI'nin (Excel içe aktarma) "Maliyet" kolonuyla AYNI ŞEY DEĞİLDİR: orada
 * kolon OKUNUR ama SAKLANMAZ (yalnız bir uyarı üretir). Ekran metni ikisini
 * karıştırmamalıdır.
 *
 * 🔴 `disabled` ile `readOnly` AYRIMI: Maliyet `disabled`dır (hiç
 * hesaplanmayacak bir yüzey), TU 73 "Toplam Üretilecek" ise `readOnly`dır
 * (canlı türev). İkisini aynı yapmak kullanıcıya iki farklı gerçeği tek
 * görünümle anlatırdı.
 *
 * ⚠️ 🏠 (U+1F3E0, TU 93) glif bekçisinin izin listesindedir — aynen basılır.
 *
 * ⚠️ Seçicilerin BOŞ SEÇENEĞİ YOKTUR (TU 109/112) ama `layout`/`facing`
 * sunucuda NULLABLE'dır; dokunma kapısı `slots.ts`tedir (`touched`), bu yüzden
 * ekranda görünen "3+1" / "Güney" kullanıcı dokunmadıkça gövdeye GİTMEZ.
 */
export function BulkSlotTemplateCard({
  values,
  onChangeSlot,
  onChangeField,
}: BulkSlotTemplateCardProps) {
  const { slots } = values;

  return (
    <section className="pf-card tu-flush-card">
      {/* 92-94 */}
      <div className="tu-slot-head">
        <h2 className="tu-slot-head__title">🏠 {BULK_SLOT_CARD_TITLE}</h2>
        <span className="tu-slot-head__hint">{BULK_SLOT_CARD_HINT}</span>
      </div>

      {slots.length === 0 ? (
        <p className="tu-slot-note" data-testid="toplu-form-sablon-bos">
          {BULK_SLOT_EMPTY_NOTICE}
        </p>
      ) : (
        <table className="tu-slot-table" data-testid="toplu-form-sablon-tablo">
          <thead>
            <tr>
              <th>{BULK_SLOT_SEQUENCE_LABEL}</th>
              <th>{BULK_SLOT_LAYOUT_LABEL}</th>
              <th className="tu-slot-table__right">{BULK_SLOT_GROSS_LABEL}</th>
              <th className="tu-slot-table__right">{BULK_SLOT_NET_LABEL}</th>
              <th>{BULK_SLOT_FACING_LABEL}</th>
              <th className="tu-slot-table__right">{BULK_SLOT_LIST_PRICE_LABEL}</th>
              {/* 104 — sunucuda karşılığı YOK (karar 3) */}
              <th className="tu-slot-table__right">{BULK_UNIT_COST_LABEL}</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, index) => (
              <tr key={slot.sequence} data-testid="toplu-form-sablon-satir">
                {/* 108 — `resizeSlots` üretir; kullanıcı YAZMAZ */}
                <td className="tu-slot-table__seq">{slot.sequence}</td>

                {/* 109 — `layout` (dokunma kapısı) */}
                <td>
                  <Select
                    size="row"
                    aria-label={`${slot.sequence}. sıra oda tipi`}
                    data-testid={`toplu-form-oda-tipi-${slot.sequence}`}
                    value={slot.layout}
                    onChange={(event) => onChangeSlot(index, "layout", event.target.value)}
                  >
                    {UNIT_LAYOUT_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </td>

                {/* 110 — `gross_area_m2` */}
                <td className="tu-slot-table__right">
                  <Input
                    size="row"
                    className="uf-num"
                    inputMode="decimal"
                    aria-label={`${slot.sequence}. sıra brüt m²`}
                    data-testid={`toplu-form-brut-${slot.sequence}`}
                    value={slot.grossAreaM2}
                    onChange={(event) => onChangeSlot(index, "grossAreaM2", event.target.value)}
                  />
                </td>

                {/* 111 — `net_area_m2` */}
                <td className="tu-slot-table__right">
                  <Input
                    size="row"
                    className="uf-num"
                    inputMode="decimal"
                    aria-label={`${slot.sequence}. sıra net m²`}
                    data-testid={`toplu-form-net-${slot.sequence}`}
                    value={slot.netAreaM2}
                    onChange={(event) => onChangeSlot(index, "netAreaM2", event.target.value)}
                  />
                </td>

                {/* 112 — `facing` (dokunma kapısı); enum'un BEŞ üyesi de listede */}
                <td>
                  <Select
                    size="row"
                    aria-label={`${slot.sequence}. sıra cephe`}
                    data-testid={`toplu-form-cephe-${slot.sequence}`}
                    value={slot.facing}
                    onChange={(event) =>
                      onChangeSlot(index, "facing", event.target.value as UnitFacing)
                    }
                  >
                    {FACING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </td>

                {/* 113 — `list_price` */}
                <td className="tu-slot-table__right">
                  <Input
                    size="row"
                    className="uf-num"
                    inputMode="decimal"
                    aria-label={`${slot.sequence}. sıra liste fiyatı`}
                    data-testid={`toplu-form-liste-fiyat-${slot.sequence}`}
                    value={slot.listPrice}
                    onChange={(event) => onChangeSlot(index, "listPrice", event.target.value)}
                  />
                </td>

                {/* 114 — 🔴 PENDING: durumda karşılığı YOK, gövdeye SIZAMAZ */}
                <td className="tu-slot-table__right">
                  <Input
                    size="row"
                    className="uf-num ue-derived"
                    aria-label={`${slot.sequence}. sıra maliyet`}
                    data-testid={`toplu-form-maliyet-${slot.sequence}`}
                    disabled
                    readOnly
                    title={BULK_UNIT_COST_PENDING_REASON}
                    value={BULK_EMPTY_TOTAL}
                    onChange={() => undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* 104'ün GÖRÜNÜR gerekçesi — sütun başına bir kez, satır başına değil */}
      <p className="tu-slot-note" data-testid="toplu-form-maliyet-gerekce">
        {BULK_UNIT_COST_PENDING_REASON}
      </p>

      {/* 136-139 — üst katlarda fiyat artışı */}
      <div className="tu-slot-foot">
        {/* 137 — gövdede karşılığı YOK; yalnız yüzdenin KAPISI */}
        <Checkbox
          label={BULK_PRICE_INCREASE_LABEL}
          data-testid="toplu-form-fiyat-artisi"
          checked={values.floorPriceIncreaseEnabled}
          onChange={(event) =>
            onChangeField("floorPriceIncreaseEnabled", event.target.checked)
          }
        />
        {/* 138 — gövdede `floor_price_increase_pct` (ge=0 le=100) */}
        <span className="tu-slot-foot__pct">
          <span>{BULK_PRICE_INCREASE_PREFIX}</span>
          <Input
            size="row"
            className="tu-slot-foot__pct-input"
            inputMode="decimal"
            aria-label={`${BULK_PRICE_INCREASE_PREFIX} ${BULK_PRICE_INCREASE_SUFFIX}`}
            data-testid="toplu-form-artis-yuzde"
            disabled={!values.floorPriceIncreaseEnabled}
            value={values.floorPriceIncreasePct}
            onChange={(event) => onChangeField("floorPriceIncreasePct", event.target.value)}
          />
          <span>{BULK_PRICE_INCREASE_SUFFIX}</span>
        </span>
      </div>
    </section>
  );
}
