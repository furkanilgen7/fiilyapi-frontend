"use client";

import Link from "next/link";
import { useState } from "react";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Button, Select } from "@/components/ui";
import { AlertIcon, LockIcon, inlineSymbolProps } from "@/components/ui/icons";
import { backendErrorMessage } from "@/lib/api/error-message";
import { useAccountingPeriods } from "@/lib/api/hooks/useAccountingPeriods";
import {
  useCloseAccountingPeriod,
  useReopenAccountingPeriod,
} from "@/lib/api/hooks/useAccountingPeriodMutations";
import { isForbidden } from "@/lib/api/unwrap";
import { canDelete, hasAtLeast } from "@/lib/auth/permissions";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import {
  ACCOUNTING_PERMISSION_MODULE,
  ACCOUNTING_URL,
  currentPeriod,
} from "./accounting-labels";
import { PeriodCloseConfirmModal } from "./PeriodCloseConfirmModal";
import {
  buildPeriodRows,
  closeButtonDisabledReason,
  periodClosedAtText,
  periodClosedByText,
  periodEntryCountText,
  periodRowLabel,
  periodStatusLabel,
  periodSummaryText,
  reopenButtonDisabledReason,
  summarizePeriodRows,
  type PeriodRow,
} from "./period-closing";
import "./accounting.css";

/**
 * DK · `/muhasebe/donem-kapanisi` — mockup `Muhasebe - Dönem Kapanışı.dc.html`
 * (DK). Yorumlardaki sayılar O dosyanın SATIR numaralarıdır.
 *
 * Mockup'ın üst barı ve sol menüsü BASILMAZ: üst bar kabuk canon'u, sol menü
 * `MuhasebeSidebar`dedir (MZ/KDV emsali).
 *
 * 🔴 K1 — uçlar `_VIEW`/`_FULL`/`_ADMIN` üç ayrı eşiktedir; `useModulePermission`
 * TEK bir `AccessLevel` döner, eşik burada `hasAtLeast`/`canDelete` ile
 * KURULUR (`canWrite` YETMEZ: o `draft`ten başlar, kapatma `full` ister).
 *
 * 🔴 K3 — yıl seçici mockup'ta `2026/2025/2024` ÖRNEK VERİDİR (K4 kanonunun
 * kardeşi): sabit yazılmaz, `currentPeriod`in yılından + iki önceki yıldan
 * TÜRETİLİR.
 */
export function PeriodClosingView() {
  const permission = useModulePermission(ACCOUNTING_PERMISSION_MODULE);
  const [year, setYear] = useState(() => currentPeriod(new Date()).year);
  const [confirmRow, setConfirmRow] = useState<PeriodRow | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyMonth, setBusyMonth] = useState<number | null>(null);

  const periodsQuery = useAccountingPeriods(year);
  const closeMutation = useCloseAccountingPeriod();
  const reopenMutation = useReopenAccountingPeriod();

  if (!permission.canView || isForbidden(periodsQuery.error)) {
    return <AccessDenied />;
  }

  // K1 — sunucudaki üç eşik istemcide AYNEN kurulur; tek gerçek kapı yine de
  // sunucudur (K6), burası yalnız düğme görünürlüğüdür.
  const canClose = hasAtLeast(permission.level, "full");
  const canReopen = canDelete(permission.level); // DELETE_LEVELS = ["admin"] — K1'in `_ADMIN`i.

  const items = periodsQuery.data;
  const rows = items !== undefined ? buildPeriodRows(year, items) : undefined;
  const summary = rows !== undefined ? summarizePeriodRows(rows) : undefined;
  const errorMessage = periodsQuery.isError
    ? backendErrorMessage(periodsQuery.error, "Dönem listesi yüklenemedi.")
    : undefined;

  // DK:73-76 — üç yıl, en yeniden en eskiye (mockup ÖRNEK verisinin sırası).
  const currentYear = currentPeriod(new Date()).year;
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  async function handleClose(row: PeriodRow) {
    setActionError(null);
    setBusyMonth(row.month);
    try {
      await closeMutation.mutateAsync({ year: row.year, month: row.month });
      setConfirmRow(null);
    } catch (err) {
      setActionError(backendErrorMessage(err, "Dönem kapatılamadı."));
    } finally {
      setBusyMonth(null);
    }
  }

  async function handleReopen(row: PeriodRow) {
    setActionError(null);
    setBusyMonth(row.month);
    try {
      await reopenMutation.mutateAsync({ year: row.year, month: row.month });
    } catch (err) {
      setActionError(backendErrorMessage(err, "Dönem yeniden açılamadı."));
    } finally {
      setBusyMonth(null);
    }
  }

  return (
    <div className="mu">
      {/* DK:60-68 */}
      <div className="mu__head">
        <div>
          <h1 className="mu__title">Dönem Kapanışı</h1>
          <p className="mu__eyebrow" data-testid="dkap-subtitle">
            Kapatılan döneme yeni fiş girilemez, mevcut fişler değiştirilemez
          </p>
        </div>
        <div className="mu__actions">
          <Select
            aria-label="Yıl"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            data-testid="dkap-year-select"
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* DK:70-77 — Yetki notu. K1: metin backend'le birebir, UYDURULMAZ. */}
      <div className="mu-notice mu-notice--purple" data-testid="dkap-role-note">
        <AlertIcon className="mu-notice__icon" />
        <p>
          <strong>Yetki notu:</strong> Muhasebe rolü dönem <strong>kapatabilir</strong>, ancak{" "}
          <strong>geri açamaz</strong>. Kapalı bir dönemin geri açılması yalnızca{" "}
          <strong>Sistem Yöneticisi</strong> tarafından yapılabilir ve denetim günlüğüne işlenir.
        </p>
      </div>

      {errorMessage !== undefined && (
        <p className="mu-notice mu-notice--danger" data-testid="dkap-error">
          {errorMessage}
        </p>
      )}
      {errorMessage === undefined && rows === undefined && (
        <p className="mu-notice" data-testid="dkap-loading">
          Dönemler yükleniyor…
        </p>
      )}

      {rows !== undefined && summary !== undefined && (
        <PeriodTable
          year={year}
          rows={rows}
          summary={summary}
          canClose={canClose}
          canReopen={canReopen}
          busyMonth={busyMonth}
          onRequestClose={setConfirmRow}
          onReopen={handleReopen}
        />
      )}

      {confirmRow !== null && (
        <PeriodCloseConfirmModal
          row={confirmRow}
          isPending={closeMutation.isPending}
          errorText={actionError}
          onConfirm={() => void handleClose(confirmRow)}
          onClose={() => {
            setConfirmRow(null);
            setActionError(null);
          }}
        />
      )}

      {/* Görsel spec (K3 emsali) "yüklendi" iddiasının damgası. */}
      {rows !== undefined && <span hidden data-testid="dkap-loaded" />}
    </div>
  );
}

interface PeriodTableProps {
  year: number;
  rows: readonly PeriodRow[];
  summary: ReturnType<typeof summarizePeriodRows>;
  canClose: boolean;
  canReopen: boolean;
  busyMonth: number | null;
  onRequestClose: (row: PeriodRow) => void;
  onReopen: (row: PeriodRow) => void;
}

function PeriodTable({
  year,
  rows,
  summary,
  canClose,
  canReopen,
  busyMonth,
  onRequestClose,
  onReopen,
}: PeriodTableProps) {
  return (
    <section className="mu-panel dkap-panel" aria-label="Muhasebe Dönemleri">
      <div className="mu-panel__head">
        <span className="mu-panel__title">{year} Muhasebe Dönemleri</span>
        <span className="dkap-panel__summary" data-testid="dkap-summary">
          {periodSummaryText(summary)}
        </span>
      </div>
      <div className="mu-table-scroll">
        <table className="mu-table dkap-table">
          <thead>
            <tr>
              <th scope="col">Dönem</th>
              <th scope="col" className="is-center">
                Durum
              </th>
              <th scope="col" className="is-right">
                Fiş
              </th>
              <th scope="col">Kapatan</th>
              <th scope="col" className="is-center">
                Kapatma Tarihi
              </th>
              <th scope="col" className="is-right">
                Eylem
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <PeriodTableRow
                key={row.month}
                row={row}
                canClose={canClose}
                canReopen={canReopen}
                isBusy={busyMonth === row.month}
                onRequestClose={onRequestClose}
                onReopen={onReopen}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface PeriodTableRowProps {
  row: PeriodRow;
  canClose: boolean;
  canReopen: boolean;
  isBusy: boolean;
  onRequestClose: (row: PeriodRow) => void;
  onReopen: (row: PeriodRow) => void;
}

function PeriodTableRow({
  row,
  canClose,
  canReopen,
  isBusy,
  onRequestClose,
  onReopen,
}: PeriodTableRowProps) {
  const rowClassName =
    row.status === "blocked"
      ? "dkap-row--blocked"
      : row.status === "closable"
        ? "dkap-row--closable"
        : row.status === "no_record"
          ? "dkap-row--no-record"
          : undefined;

  return (
    <>
      <tr className={rowClassName} data-testid={`dkap-row-${row.month}`}>
        <td className="dkap-row__period">{periodRowLabel(row)}</td>
        <td className="is-center">
          <span
            className={`dkap-status dkap-status--${row.status}`}
            data-testid={`dkap-status-${row.month}`}
          >
            {row.status === "closed" && (
              <>
                <LockIcon {...inlineSymbolProps} />{" "}
              </>
            )}
            {periodStatusLabel(row.status)}
          </span>
        </td>
        <td className="is-right is-mono">{periodEntryCountText(row.item)}</td>
        <td>{periodClosedByText(row.item)}</td>
        <td className="is-center is-mono">{periodClosedAtText(row.item)}</td>
        <td className="is-right">
          <PeriodRowAction
            row={row}
            canClose={canClose}
            canReopen={canReopen}
            isBusy={isBusy}
            onRequestClose={onRequestClose}
            onReopen={onReopen}
          />
        </td>
      </tr>
      {row.status === "blocked" && <BlockedReasonRow row={row} />}
    </>
  );
}

function PeriodRowAction({
  row,
  canClose,
  canReopen,
  isBusy,
  onRequestClose,
  onReopen,
}: PeriodTableRowProps) {
  if (row.status === "closed") {
    const reason = reopenButtonDisabledReason(canReopen);
    return (
      <Button
        variant="secondary"
        size="sm"
        disabled={reason !== undefined || isBusy}
        title={reason}
        data-testid={`dkap-reopen-${row.month}`}
        onClick={() => onReopen(row)}
      >
        Geri Aç{" "}
        <LockIcon {...inlineSymbolProps} />
      </Button>
    );
  }

  const reason = closeButtonDisabledReason(row, canClose);
  return (
    <Button
      variant="primary"
      size="sm"
      disabled={reason !== undefined || isBusy}
      title={reason}
      data-testid={`dkap-close-${row.month}`}
      onClick={() => onRequestClose(row)}
    >
      Dönemi Kapat
    </Button>
  );
}

/**
 * DK:186-215 — Temmuz satırının altındaki hata bandı. Backend `draft_count`
 * (SAYI) döner, taslak fişlerin KENDİSİNİ (numara/açıklama/tutar) DEĞİL —
 * `AccountingPeriodListItem` şeması bunu bilinçli taşımaz (K9 docstring'i:
 * tek bir dönemi döndüren uçlar için bu ek sorgu turu GEREKSİZDİR). Mockup'ın
 * üç örnek satırı (`YEV-2026-0214` vb.) bu yüzden UYDURULMAZ; bunun yerine
 * kullanıcı Yevmiye Defteri'ne yönlendirilir — zarif düşüş (WORKFLOW §3).
 */
function BlockedReasonRow({ row }: { row: PeriodRow }) {
  const count = row.item?.draft_count ?? 0;
  return (
    <tr className="dkap-row--blocked" data-testid={`dkap-blocked-reason-${row.month}`}>
      <td colSpan={6}>
        <div className="dkap-blocked-banner">
          <AlertIcon className="dkap-blocked-banner__icon" />
          <div>
            <p className="dkap-blocked-banner__title">
              Dönem kapatılamıyor — {count} taslak fiş var
            </p>
            <p className="dkap-blocked-banner__detail">
              Taslak durumdaki fişler kapanışa dâhil edilemez. Kapatmadan önce hepsini
              kesinleştirin veya silin.{" "}
              <Link href={ACCOUNTING_URL}>Yevmiye Defteri&apos;nde görüntüle →</Link>
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}
