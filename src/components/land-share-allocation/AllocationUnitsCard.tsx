import { Button, Checkbox, Select } from "@/components/ui";
import { CheckIcon, inlineSymbolProps } from "@/components/ui/icons";
import type {
  LandShareShareholderRow,
  UnitOwnerSideFilter,
} from "@/lib/api/hooks/useLandShare";
import { formatDecimal } from "@/lib/format";

import {
  effectiveAllocation,
  type AllocationState,
  type LandShareUnitRow,
  type UnitOwnerSide,
} from "./allocation-state";
import {
  ALLOCATION_CONTRACTOR_LABEL,
  ALLOCATION_CONTRACTOR_ROW_NOTE,
  ALLOCATION_FILTER_ALL_LABEL,
  ALLOCATION_FILTER_CONTRACTOR_LABEL,
  ALLOCATION_FILTER_LANDOWNER_LABEL,
  ALLOCATION_FILTER_UNASSIGNED_LABEL,
  ALLOCATION_LANDOWNER_LABEL,
  ALLOCATION_NEXT_PAGE_LABEL,
  ALLOCATION_OWNERSHIP_COLUMN_LABEL,
  ALLOCATION_PREV_PAGE_LABEL,
  ALLOCATION_ROW_COLUMN_LABELS,
  ALLOCATION_ROW_SHAREHOLDER_PLACEHOLDER,
  ALLOCATION_SELECT_ALL_LABEL,
  ALLOCATION_UNASSIGNED_LABEL,
  ALLOCATION_UNCOMPUTABLE,
  ALLOCATION_UNITS_CARD_LABEL,
  ALLOCATION_UNITS_LOADING,
  allocationPageLabel,
  shareholderOptionLabel,
} from "./constants";

/**
 * PG 112-115 — DÖRT düğme, ama enum ÜÇ üyelidir. Dördüncü hâl
 * (`undefined` = "Tümü") bir enum üyesi DEĞİL, süzgecin HİÇ gönderilmemesidir;
 * `UnitOwnerSideFilter` bunu bilerek taşımaz (*"atanmamis uniteleri (NULL)
 * secmek `UnitOwnerSide` ile mumkun degildir"*).
 */
export type AllocationRowFilter = UnitOwnerSideFilter | "all";

interface FilterDef {
  readonly key: AllocationRowFilter;
  readonly label: string;
  readonly count: number | null;
}

interface AllocationUnitsCardProps {
  rows: readonly LandShareUnitRow[];
  state: AllocationState;
  filter: AllocationRowFilter;
  /** Süzgeç rozetlerinin sayıları ÖZETTEN gelir (sayfa listesinden DEĞİL). */
  counts: {
    all: number | null;
    unassigned: number | null;
    contractor: number | null;
    landowner: number | null;
  };
  shareholders: readonly LandShareShareholderRow[];
  isLoading: boolean;
  errorMessage: string | null;
  emptyNotice: string;
  disabled: boolean;
  /** Sayfalama — `total` SÜZGEÇLENMİŞ kümenin boyutudur. */
  page: number;
  pageCount: number;
  onChangeFilter: (filter: AllocationRowFilter) => void;
  onToggleAll: () => void;
  onToggleRow: (row: LandShareUnitRow) => void;
  onAssignRow: (row: LandShareUnitRow, side: UnitOwnerSide | null) => void;
  onChangeRowShareholder: (row: LandShareUnitRow, shareholderId: string | null) => void;
  onChangePage: (page: number) => void;
}

/** PG 135/136 — boş hücre; `0` YAZILMAZ ("girilmemiş" ile "sıfır" ayrı şeydir). */
function numberCell(raw: string | null, fractionDigits: number): string {
  return raw === null ? ALLOCATION_UNCOMPUTABLE : formatDecimal(raw, fractionDigits);
}

/**
 * Ünite listesi (PG 105-241) — bu ekranın ASIL yüzeyi.
 *
 * 🔴 PG 186/201 "Biz ✓" ve PG 218/233 "Arsa ✓" — `✓` (U+2713) glif bekçisinin
 * YASAK sınıfındadır ve VS16 onu KURTARMAZ → `CheckIcon`. İşaret düğmenin
 * `aria-pressed`ine EK bir gösterge olarak durur; durum yalnız renkten
 * okunmaz.
 *
 * 🔴 SEGMENTLİ DÜĞMENİN PRIMITIVE'İ YOKTUR. `ui/`de karşılığı olmadığı için
 * `aria-pressed` taşıyan düz `<button type="button">` kullanılır (T2b'nin
 * süzgeç şeridiyle aynı emsal); ham `<select>`/`<input>` YASAĞI seçiciler ve
 * kutucuklar için geçerlidir ve onlar primitive'dir.
 *
 * 🔴 HİSSEDAR SÜTUNU SATIRIN TARAFINA GÖRE DEĞİŞİR (PG 190 ↔ PG 221):
 * ARSA satırında `<select>`, BİZ satırında "Yüklenici payı" metni, atanmamışta
 * "Atanmadı". Sunucu bunu 422 ile zorlar; seçiciyi her satırda basmak
 * kullanıcıya ATOMİK isteği düşürecek bir yol açardı.
 *
 * 🔴 SAYFA ÇUBUĞU MOCKUP'TA YOKTUR ama uç SAYFALIDIR. Mockup 42 satırı statik
 * çizip "… 35 ünite daha" yazar; gerçek uç `limit`/`offset`/`total` ile
 * çalışır, yani sayfasız bir tablo 400 ünitelik projede sessizce kırpardı.
 */
export function AllocationUnitsCard({
  rows,
  state,
  filter,
  counts,
  shareholders,
  isLoading,
  errorMessage,
  emptyNotice,
  disabled,
  page,
  pageCount,
  onChangeFilter,
  onToggleAll,
  onToggleRow,
  onAssignRow,
  onChangeRowShareholder,
  onChangePage,
}: AllocationUnitsCardProps) {
  const filters: readonly FilterDef[] = [
    { key: "unassigned", label: ALLOCATION_FILTER_UNASSIGNED_LABEL, count: counts.unassigned }, // 112
    { key: "all", label: ALLOCATION_FILTER_ALL_LABEL, count: counts.all }, // 113
    { key: "contractor", label: ALLOCATION_FILTER_CONTRACTOR_LABEL, count: counts.contractor }, // 114
    { key: "landowner", label: ALLOCATION_FILTER_LANDOWNER_LABEL, count: counts.landowner }, // 115
  ];

  const allSelected = rows.length > 0 && rows.every((row) => state.selected.has(row.unit_id));

  return (
    <section className="pf-card pg-flush-card" data-testid="paylasim-form-liste-kart">
      {/* 107-116 */}
      <div className="pg-units__head">
        <Checkbox
          size="lg"
          data-testid="paylasim-form-tumunu-sec"
          label={ALLOCATION_SELECT_ALL_LABEL}
          checked={allSelected}
          disabled={disabled || rows.length === 0}
          onChange={onToggleAll}
        />
        <div className="pg-units__filters" role="group" aria-label="Ünite süzgeci">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`pg-filter${filter === item.key ? " pg-filter--on" : ""}`}
              aria-pressed={filter === item.key}
              data-testid={`paylasim-form-suzgec-${item.key}`}
              onClick={() => onChangeFilter(item.key)}
            >
              {/* Sayı henüz gelmediyse parantez BASILMAZ — "(0)" bir iddiadır */}
              {item.count === null ? item.label : `${item.label} (${item.count})`}
            </button>
          ))}
        </div>
      </div>

      {errorMessage && (
        <p className="pg-units__notice pg-units__notice--error" data-testid="paylasim-form-liste-hata">
          {errorMessage}
        </p>
      )}

      {!errorMessage && (isLoading || rows.length === 0) && (
        <p className="pg-units__notice" data-testid="paylasim-form-liste-notu">
          {isLoading ? ALLOCATION_UNITS_LOADING : emptyNotice}
        </p>
      )}

      {rows.length > 0 && (
        <table className="pg-units-table" aria-label={ALLOCATION_UNITS_CARD_LABEL}>
          <thead>
            <tr>
              <th scope="col" aria-label={ALLOCATION_SELECT_ALL_LABEL} />
              {ALLOCATION_ROW_COLUMN_LABELS.map((label) => (
                <th
                  key={label}
                  scope="col"
                  className={label === ALLOCATION_OWNERSHIP_COLUMN_LABEL ? "pg-units-table__own" : undefined}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <AllocationUnitRow
                key={row.unit_id}
                row={row}
                state={state}
                shareholders={shareholders}
                disabled={disabled}
                onToggleRow={onToggleRow}
                onAssignRow={onAssignRow}
                onChangeRowShareholder={onChangeRowShareholder}
              />
            ))}
          </tbody>
        </table>
      )}

      {pageCount > 1 && (
        <div className="pg-pager" data-testid="paylasim-form-sayfa">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            data-testid="paylasim-form-onceki"
            onClick={() => onChangePage(page - 1)}
          >
            {ALLOCATION_PREV_PAGE_LABEL}
          </Button>
          <span className="pg-pager__label">{allocationPageLabel(page, pageCount)}</span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pageCount}
            data-testid="paylasim-form-sonraki"
            onClick={() => onChangePage(page + 1)}
          >
            {ALLOCATION_NEXT_PAGE_LABEL}
          </Button>
        </div>
      )}
    </section>
  );
}

interface AllocationUnitRowProps {
  row: LandShareUnitRow;
  state: AllocationState;
  shareholders: readonly LandShareShareholderRow[];
  disabled: boolean;
  onToggleRow: (row: LandShareUnitRow) => void;
  onAssignRow: (row: LandShareUnitRow, side: UnitOwnerSide | null) => void;
  onChangeRowShareholder: (row: LandShareUnitRow, shareholderId: string | null) => void;
}

/** PG 129-237 — tek satır. Sunucu satırı + bekleyen katman `effectiveAllocation`la birleşir. */
function AllocationUnitRow({
  row,
  state,
  shareholders,
  disabled,
  onToggleRow,
  onAssignRow,
  onChangeRowShareholder,
}: AllocationUnitRowProps) {
  const current = effectiveAllocation(row, state);
  const isOurs = current.ownerSide === "contractor";
  const isOwner = current.ownerSide === "landowner";
  // Bu satırda KAYDEDİLMEMİŞ bir değişiklik var mı? (Sunucudakiyle farklı mı?)
  const isPending =
    state.pending.has(row.unit_id) &&
    (current.ownerSide !== row.owner_side || current.shareholderId !== row.shareholder_id);

  const rowClass = [
    current.ownerSide === null ? "pg-row--unassigned" : "",
    isOurs ? "pg-row--ours" : "",
    isPending ? "pg-row--pending" : "",
  ]
    .filter((token) => token !== "")
    .join(" ");

  return (
    <tr className={rowClass} data-testid={`paylasim-form-satir-${row.unit_no}`}>
      <td>
        <Checkbox
          size="lg"
          aria-label={`${row.unit_no} seç`}
          checked={state.selected.has(row.unit_id)}
          disabled={disabled}
          onChange={() => onToggleRow(row)}
        />
      </td>
      {/* 132 */}
      <td className="pg-units-table__no">{row.unit_no}</td>
      {/* 133 */}
      <td className="pg-units-table__center pg-units-table__cell">
        {row.floor ?? ALLOCATION_UNCOMPUTABLE}
      </td>
      {/* 134 */}
      <td className="pg-units-table__center pg-units-table__cell">
        {row.layout ?? ALLOCATION_UNCOMPUTABLE}
      </td>
      {/* 135 */}
      <td className="pg-units-table__right pg-units-table__area">
        {numberCell(row.gross_area_m2, 2)}
      </td>
      {/* 136 — Rayiç Değer (`appraisal_value`); `null` "girilmemiş"tir, 0 DEĞİL */}
      <td className="pg-units-table__right pg-units-table__value">
        {numberCell(row.appraisal_value, 0)}
      </td>
      {/* 137-143 — ikili düğme */}
      <td>
        <div className="pg-side">
          <button
            type="button"
            className={`pg-side__btn${isOurs ? " pg-side__btn--on-ours" : ""}`}
            aria-pressed={isOurs}
            disabled={disabled}
            data-testid={`paylasim-form-biz-${row.unit_no}`}
            // Aynı düğmeye tekrar basmak atamayı KALDIRIR (PG 144 "Atanmadı"):
            // `owner_side: null` meşru bir değerdir ve UI'dan ulaşılabilir
            // OLMALIDIR, yoksa kullanıcı bir atamayı asla geri alamaz.
            onClick={() => onAssignRow(row, isOurs ? null : "contractor")}
          >
            {ALLOCATION_CONTRACTOR_LABEL}
            {isOurs && <CheckIcon {...inlineSymbolProps} />}
          </button>
          <button
            type="button"
            className={`pg-side__btn${isOwner ? " pg-side__btn--on-owner" : ""}`}
            aria-pressed={isOwner}
            disabled={disabled}
            data-testid={`paylasim-form-arsa-${row.unit_no}`}
            onClick={() => onAssignRow(row, isOwner ? null : "landowner")}
          >
            {ALLOCATION_LANDOWNER_LABEL}
            {isOwner && <CheckIcon {...inlineSymbolProps} />}
          </button>
        </div>
      </td>
      {/* 144 · 190 · 221 — sütun satırın TARAFINA göre değişir */}
      <td>
        {isOwner ? (
          <Select
            size="row"
            aria-label={`${row.unit_no} hissedarı`}
            data-testid={`paylasim-form-hissedar-${row.unit_no}`}
            disabled={disabled}
            value={current.shareholderId ?? ""}
            onChange={(event) =>
              onChangeRowShareholder(row, event.target.value === "" ? null : event.target.value)
            }
          >
            <option value="">{ALLOCATION_ROW_SHAREHOLDER_PLACEHOLDER}</option>
            {shareholders.map((item) => (
              <option key={item.shareholder_id} value={item.shareholder_id}>
                {shareholderOptionLabel(item)}
              </option>
            ))}
          </Select>
        ) : (
          <span className={`pg-row-note ${isOurs ? "pg-row-note--ours" : "pg-row-note--unassigned"}`}>
            {isOurs ? ALLOCATION_CONTRACTOR_ROW_NOTE : ALLOCATION_UNASSIGNED_LABEL}
          </span>
        )}
      </td>
    </tr>
  );
}
