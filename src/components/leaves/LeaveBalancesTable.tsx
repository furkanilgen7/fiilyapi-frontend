import { Select } from "@/components/ui";
import { WarningTriangleIcon } from "@/components/ui/icons";
import type { LeaveBalanceResponse } from "@/lib/api/hooks/useLeaves";

import {
  carriedOverText,
  entitlementText,
  formatDays,
  hasCarryoverRisk,
  remainingBalanceText,
  seniorityText,
  usageCell,
} from "./leaves-derive";
import {
  BALANCES_EMPTY_TEXT,
  BALANCES_LOADING_TEXT,
  BALANCES_TABLE_HINT,
  BALANCES_TABLE_TITLE,
  YEAR_SELECT_LABEL,
} from "./leaves-labels";
import "./leaves.css";

export interface LeaveBalancesTableProps {
  rows: readonly LeaveBalanceResponse[] | undefined;
  isLoading: boolean;
  errorMessage?: string;
  /** 120 · yıl seçici — seçilen yıl özet ucuna sorgu parametresi olarak gider. */
  year: number;
  yearOptions: readonly number[];
  onYearChange: (year: number) => void;
}

const COLUMN_COUNT = 7;

/** İlerleme çubuğunun genişliği yüzdedir; CSS'e değişkenle geçer (çıplak px yok). */
type BarStyle = React.CSSProperties & { "--iz-bar-pct"?: string };

/**
 * İZ 116-171 · "İzin Bakiyeleri" — YEDİ sütun.
 *
 * 🔴 K8: bu tablo SALT-OKUMAdır. `PUT /leave-balances/...` BU DİLİMDE
 * KULLANILMAZ; devre-dışı bir düzenleme düğmesi de BASILMAZ (mockup'ta yoktur,
 * icat edilmez).
 *
 * 🔴 Ham `<select>` YASAK — yıl seçici `ui/select` primitive'idir.
 */
export function LeaveBalancesTable({
  rows,
  isLoading,
  errorMessage,
  year,
  yearOptions,
  onYearChange,
}: LeaveBalancesTableProps) {
  return (
    <section className="iz-card" data-testid="iz-balances-card">
      {/* 117-121 */}
      <header className="iz-card__head">
        <h2 className="iz-card__title">{BALANCES_TABLE_TITLE}</h2>
        <p className="iz-card__hint">{BALANCES_TABLE_HINT}</p>
        <span className="iz-card__tools">
          <Select
            size="row"
            aria-label={YEAR_SELECT_LABEL}
            data-testid="iz-year-select"
            value={String(year)}
            onChange={(event) => onYearChange(Number(event.target.value))}
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </span>
      </header>

      <div className="iz-table-scroll">
        <table className="iz-table">
          {/* 123-131 */}
          <thead>
            <tr>
              <th scope="col" className="iz-table__th">
                Personel
              </th>
              <th scope="col" className="iz-table__th iz-table__th--center">
                Kıdem
              </th>
              <th scope="col" className="iz-table__th iz-table__th--center">
                Yıllık Hak
              </th>
              <th scope="col" className="iz-table__th iz-table__th--center">
                Devreden
              </th>
              <th scope="col" className="iz-table__th iz-table__th--center">
                Kullanılan
              </th>
              <th scope="col" className="iz-table__th iz-table__th--center iz-table__th--success">
                Kalan
              </th>
              <th scope="col" className="iz-table__th">
                Kullanım
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={COLUMN_COUNT} className="iz-table__state">
                  {BALANCES_LOADING_TEXT}
                </td>
              </tr>
            )}

            {!isLoading && errorMessage && (
              <tr>
                <td
                  colSpan={COLUMN_COUNT}
                  className="iz-table__state iz-table__state--error"
                  data-testid="iz-balances-error"
                >
                  {errorMessage}
                </td>
              </tr>
            )}

            {!isLoading && !errorMessage && rows?.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMN_COUNT}
                  className="iz-table__state"
                  data-testid="iz-balances-empty"
                >
                  {BALANCES_EMPTY_TEXT}
                </td>
              </tr>
            )}

            {!isLoading &&
              !errorMessage &&
              rows?.map((row) => {
                const isRisk = hasCarryoverRisk(row);
                const usage = usageCell(row);
                const barStyle: BarStyle =
                  usage.pct === null ? {} : { "--iz-bar-pct": `${usage.pct}%` };

                return (
                  <tr
                    key={row.personnel_id}
                    data-testid={`iz-balance-row-${row.personnel_id}`}
                    // 151 — devreden riski taşıyan satırın zemini sarımsıdır
                    className={isRisk ? "iz-table__row iz-table__row--risk" : "iz-table__row"}
                  >
                    <td className="iz-table__td iz-table__td--name">{row.personnel_name}</td>

                    {/* 135/162 */}
                    <td className="iz-table__td iz-table__td--center iz-table__td--date">
                      {seniorityText(row.seniority_years, row.seniority_months)}
                    </td>

                    {/* 136/163 */}
                    <td className="iz-table__td iz-table__td--center iz-table__td--strong">
                      {entitlementText(row.annual_entitlement)}
                    </td>

                    {/* 137/155/164 — `⚠` yerine SVG üçgen (K7) */}
                    <td
                      className={
                        "iz-table__td iz-table__td--center" +
                        (isRisk ? " iz-table__td--warning" : " iz-table__td--muted")
                      }
                      data-testid={`iz-carried-${row.personnel_id}`}
                    >
                      {carriedOverText(row)}
                      {isRisk && <WarningTriangleIcon className="iz-remaining__icon" />}
                    </td>

                    {/* 138 */}
                    <td className="iz-table__td iz-table__td--center iz-table__td--used">
                      {formatDays(row.used)}
                    </td>

                    {/* 139/166 */}
                    <td
                      className={
                        "iz-table__td iz-table__td--center iz-balance-remaining" +
                        (row.remaining === null
                          ? " iz-balance-remaining--none"
                          : isRisk
                            ? " iz-balance-remaining--risk"
                            : "")
                      }
                      data-testid={`iz-remaining-balance-${row.personnel_id}`}
                    >
                      {remainingBalanceText(row.remaining)}
                    </td>

                    {/* 140/158/167 */}
                    <td className="iz-table__td">
                      {usage.pct !== null && (
                        <span className="iz-bar" aria-hidden="true">
                          <span
                            className={isRisk ? "iz-bar__fill iz-bar__fill--risk" : "iz-bar__fill"}
                            style={barStyle}
                          />
                        </span>
                      )}
                      <span
                        className={isRisk ? "iz-usage-text iz-usage-text--risk" : "iz-usage-text"}
                      >
                        {usage.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
