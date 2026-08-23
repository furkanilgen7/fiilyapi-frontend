import { DateInput, Field, Input, Select } from "@/components/ui";
import { userOptionLabel, type UserOption } from "@/lib/api/hooks/useUserOptions";
import type { WarehouseResponse } from "@/lib/api/hooks/useWarehouses";

import {
  MAX_LENGTH,
  STOCK_ENTRY_ORDER_HINT,
  STOCK_ENTRY_ORDER_PENDING_REASON,
  STOCK_ENTRY_SUPPLIER_HINT,
} from "./constants";
import type { StockEntryFormValues } from "./form-state";
import type { StockEntryFormErrors } from "./validate";
import { groupWarehouses } from "./warehouse-options";

const PLACEHOLDER = "Seçiniz...";

export interface UserPickerStatus {
  options: UserOption[];
  isLoading: boolean;
  isError: boolean;
  isForbidden: boolean;
  note: string;
}

interface StockEntryInfoCardProps {
  values: StockEntryFormValues;
  errors: StockEntryFormErrors;
  onChange: <K extends keyof StockEntryFormValues>(
    field: K,
    value: StockEntryFormValues[K],
  ) => void;
  warehouses: readonly WarehouseResponse[];
  /** Rotadan gelen şantiye — depo gruplaması ve ön doldurma bunu kullanır. */
  siteId: string;
  warehousesDisabled: boolean;
  users: UserPickerStatus;
}

/** Depo `<optgroup>`'ları — merkez depo SG 84'te açıkça çizilidir. */
function WarehouseOptions({
  warehouses,
  siteId,
  excludeId,
}: {
  warehouses: readonly WarehouseResponse[];
  siteId: string;
  excludeId?: string;
}) {
  const groups = groupWarehouses(
    excludeId ? warehouses.filter((warehouse) => warehouse.id !== excludeId) : warehouses,
    siteId,
  );
  const sections: Array<[string, WarehouseResponse[]]> = [
    ["Bu Şantiye", groups.site],
    ["Merkez Depo", groups.central],
    ["Diğer Şantiyeler", groups.other],
  ];
  return (
    <>
      <option value="">{PLACEHOLDER}</option>
      {sections
        .filter(([, rows]) => rows.length > 0)
        .map(([label, rows]) => (
          <optgroup key={label} label={label}>
            {rows.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.name}
              </option>
            ))}
          </optgroup>
        ))}
    </>
  );
}

/**
 * Giriş Bilgileri kartı (SG 80-90) + spec §5 **S4**'ün ZORUNLU TÜRETİMİ olan
 * koşullu "Kaynak Depo" alanı.
 *
 * ⚠️ "İlgili Sipariş" (85) SATINALMA dilimine pending'dir: kutu SİLİNMEZ,
 * devre dışı + görünür gerekçeyle durur ve **form durumunda karşılığı
 * yoktur** — gövdeye sızması yapısal olarak imkânsızdır (`form-state.ts`).
 *
 * ⚠️ "Tedarikçi" (86) mockup'ta SELECT'tir; backend'de tedarikçi KATALOĞU
 * YOKTUR (`supplier_name` serbest metin, spec §7 S3) — uydurma seçenek
 * listesi basmak yerine metin kutusu + gerekçe ipucu gösterilir.
 *
 * ⚠️ ONAYLI SAPMA — zorunluluk yıldızları: mockup Tedarikçi (86), İrsaliye No
 * (87) ve Teslim Alan (88) alanlarını `*` ile ZORUNLU çizer; şemada üçü de
 * `nullable`dır (backend spec §2). Zorunlu tutulsalardı "Manuel Düzeltme"
 * (sayım farkı) girişi yapılamazdı — tedarikçisi ve irsaliyesi olmayan meşru
 * bir harekettir. Yıldız BASILMAZ; kural sunucununki kalır.
 */
export function StockEntryInfoCard({
  values,
  errors,
  onChange,
  warehouses,
  siteId,
  warehousesDisabled,
  users,
}: StockEntryInfoCardProps) {
  const isTransfer = values.entryType === "transfer";

  return (
    <section className="pf-card">
      <h2 className="pf-card__title">📋 Giriş Bilgileri</h2>
      <div className="pf-grid pf-grid--3">
        {/* 83 */}
        <Field label="Giriş Tarihi" required error={errors.entryDate}>
          {(control) => (
            <DateInput
              {...control}
              data-testid="stok-giris-tarih"
              value={values.entryDate}
              onValueChange={(iso) => onChange("entryDate", iso)}
            />
          )}
        </Field>

        {/* 84 — merkez depo DAHİL */}
        <Field label="Şantiye / Depo" required error={errors.warehouseId}>
          {(control) => (
            <Select
              {...control}
              data-testid="stok-giris-depo"
              disabled={warehousesDisabled}
              value={values.warehouseId}
              onChange={(event) => onChange("warehouseId", event.target.value)}
            >
              <WarehouseOptions warehouses={warehouses} siteId={siteId} />
            </Select>
          )}
        </Field>

        {/* Spec §5 S4 — mockup ÇİZMEMİŞTİR, backend sözleşmesi ZORUNLU kılar.
            YALNIZ `transfer` tipinde görünür; diğer tiplerde alan da gövde
            anahtarı da YOKTUR. */}
        {isTransfer && (
          <Field
            label="Kaynak Depo"
            required
            hint="Transferde bu depodan aynı miktar DÜŞÜLÜR (çift bacak)"
            error={errors.sourceWarehouseId}
          >
            {(control) => (
              <Select
                {...control}
                data-testid="stok-giris-kaynak-depo"
                disabled={warehousesDisabled}
                value={values.sourceWarehouseId}
                onChange={(event) => onChange("sourceWarehouseId", event.target.value)}
              >
                {/* Kendine transfer 422'dir — hedef depo listeden ÇIKARILIR. */}
                <WarehouseOptions
                  warehouses={warehouses}
                  siteId={siteId}
                  excludeId={values.warehouseId}
                />
              </Select>
            )}
          </Field>
        )}

        {/* 85 — SA'ya pending: devre dışı + görünür gerekçe */}
        <Field label="İlgili Sipariş" hint={`${STOCK_ENTRY_ORDER_HINT} · ${STOCK_ENTRY_ORDER_PENDING_REASON}`}>
          {(control) => (
            <Select
              {...control}
              disabled
              data-testid="stok-giris-siparis"
              title={STOCK_ENTRY_ORDER_PENDING_REASON}
              value=""
              onChange={() => undefined}
            >
              <option value="">Sipariş seçin...</option>
            </Select>
          )}
        </Field>

        {/* 86 */}
        <Field label="Tedarikçi" hint={STOCK_ENTRY_SUPPLIER_HINT} error={errors.supplierName}>
          {(control) => (
            <Input
              {...control}
              data-testid="stok-giris-tedarikci"
              maxLength={MAX_LENGTH.supplierName}
              value={values.supplierName}
              onChange={(event) => onChange("supplierName", event.target.value)}
            />
          )}
        </Field>

        {/* 87 */}
        <Field label="İrsaliye No" error={errors.deliveryNoteNo}>
          {(control) => (
            <Input
              {...control}
              className="sgf-mono"
              data-testid="stok-giris-irsaliye"
              maxLength={MAX_LENGTH.deliveryNoteNo}
              placeholder="IRS-2026-8842"
              value={values.deliveryNoteNo}
              onChange={(event) => onChange("deliveryNoteNo", event.target.value)}
            />
          )}
        </Field>

        {/* 88 */}
        <Field label="Teslim Alan" hint={users.note}>
          {(control) => (
            <Select
              {...control}
              data-testid="stok-giris-teslim-alan"
              disabled={users.isLoading || users.isError}
              value={values.receivedByUserId}
              onChange={(event) => onChange("receivedByUserId", event.target.value)}
            >
              <option value="">{PLACEHOLDER}</option>
              {users.options.map((user) => (
                <option key={user.id} value={user.id}>
                  {userOptionLabel(user)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
    </section>
  );
}
