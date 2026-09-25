import { Input } from "@/components/ui/input/Input";
import { Select } from "@/components/ui/select/Select";
import { XIcon } from "@/components/ui/icons";
import { cx } from "@/lib/cx";
import { multiplyDecimalStrings, sumDecimalStrings } from "@/lib/decimal";
import { EMPTY_CELL, formatDecimal } from "@/lib/format";

import { DIARY_WORKER_COUNT_MAX, WORKER_SOURCE_LABELS } from "./diary-labels";
import type { DiaryFormState } from "./form-state";
import { puantajCellFor, type PuantajDayCrew } from "./puantaj-crew";
import {
  isFirmRow,
  parseWorkerCount,
  parseWorkerHours,
  workerCountKey,
  workerCountsTotal,
  type DiaryAddedFirm,
  type DiaryWorkerRow,
} from "./worker-counts";
import "./site-diary-progress.css";

/** Saat hücresinin metin tavanı ("23,5"). */
const WORKER_HOURS_MAX_LENGTH = 4;

export interface DiaryFirmOption {
  id: string;
  name: string;
}

/** Puantaj okuması (kendi ekip saati — SALT OKUNUR). */
export interface DiaryPuantajState {
  crew: PuantajDayCrew | null;
  isLoading: boolean;
  isError: boolean;
}

export interface DiaryWorkerCountsCardProps {
  rows: readonly DiaryWorkerRow[];
  form: DiaryFormState;
  onChange: (key: string, value: string) => void;
  /** Salt-okunur görünüm (izin yok, kayıt `submitted` ya da gün kilitli). */
  disabled: boolean;
  /** Kayıt henüz açılmadı — `POST` gövdesi `worker_counts` KABUL ETMEZ, sayı
   * girişi kaydedilemez; alanlar gerekçesiyle devre dışı kalır (silinmez). */
  isEntryMissing: boolean;
  /** Firma satırının saat hücresi (İ:356-357). */
  onHoursChange?: (key: string, value: string) => void;
  /** G10 — firma satırı ekle/kaldır (formen `site_diary` yazma). */
  onAddFirm?: (firm: DiaryAddedFirm) => void;
  onRemoveRow?: (key: string) => void;
  /** Eklenebilecek (aktif) taşeron firmaları. */
  firmOptions?: readonly DiaryFirmOption[];
  /** Firma adı çözümleyicisi (satır yanıtında ad YOK — taşeron listesinden). */
  firmNameById?: ReadonlyMap<string, string>;
  puantaj?: DiaryPuantajState;
}

const SOURCE_BADGE_CLASS: Record<DiaryWorkerRow["source"], string> = {
  company: "diary-workers__badge--company",
  subcontractor: "diary-workers__badge--subcontractor",
  general: "diary-workers__badge--general",
  /* freelance/intern mockup'ta yok; genel (nötr) rozet stiline düşer. */
  freelance: "diary-workers__badge--general",
  intern: "diary-workers__badge--general",
};

function formatHours(value: string | null): string {
  return value === null ? EMPTY_CELL : formatDecimal(value, 1);
}

/** Firma satırının a-s'i = kişi × saat (İ:365 "Taşeron: kişi × saat = a-s"). */
function firmManHours(countText: string, hoursText: string): string | null {
  const count = parseWorkerCount(countText);
  const hours = parseWorkerHours(hoursText);
  if (count === null || !hours.valid || hours.hours === null) return null;
  return multiplyDecimalStrings(String(count), String(hours.hours));
}

/**
 * İ:344-372 · "👷 Bugünkü İşçi Dağılımı" (PLN-F2.2 genişlemesi).
 *
 * Kolonlar Meslek·kaynak · Kişi · Saat · a-s. KENDİ ekip satırında saat
 * PUANTAJDAN salt okunur (eşleşme yoksa "—"); taşeron FİRMA satırında kişi ×
 * saat girilir (`subcontractor_id`, `hours`). Firma adı satır yanıtında yok,
 * taşeron listesinden çözülür. G10: formen firma satırı ekler/kaldırır.
 * "Toplam" kişi yazarken anında güncellenen bir TÜREVDİR; a-s toplamı =
 * puantaj günü toplamı + firma a-s'leri.
 */
export function DiaryWorkerCountsCard({
  rows,
  form,
  onChange,
  disabled,
  isEntryMissing,
  onHoursChange,
  onAddFirm,
  onRemoveRow,
  firmOptions = [],
  firmNameById,
  puantaj,
}: DiaryWorkerCountsCardProps) {
  const total = workerCountsTotal(rows, form.workerCounts);
  const isDisabled = disabled || isEntryMissing;
  const hoursValues = form.workerHours ?? {};
  const presentFirms = new Set(rows.flatMap((row) => (row.subcontractorId ? [row.subcontractorId] : [])));
  const addable = firmOptions.filter((firm) => !presentFirms.has(firm.id));
  const firmAs = rows.filter(isFirmRow).map((row) => {
    const key = workerCountKey(row);
    return firmManHours(form.workerCounts[key] ?? "", hoursValues[key] ?? "");
  });
  const totalAs =
    puantaj?.crew && firmAs.every((value) => value !== null)
      ? sumDecimalStrings([puantaj.crew.totalHours, ...(firmAs as string[])])
      : null;

  return (
    <section className="diary-card diary-card--side" aria-labelledby="diary-workers-title">
      <h2 className="diary-card__title" id="diary-workers-title">
        👷 Bugünkü İşçi Dağılımı
      </h2>
      <p className="diary-workers__subtitle">Formenin bölümü · kendi ekip saati puantajdan gelir</p>
      <div className="diary-workers__grid-head" aria-hidden="true">
        <span>Meslek · kaynak</span>
        <span className="diary-workers__cell-center">Kişi</span>
        <span className="diary-workers__cell-center">Saat</span>
        <span className="diary-workers__cell-right">a-s</span>
        <span />
      </div>
      <div className="diary-workers__list">
        {rows.map((row) => {
          const key = workerCountKey(row);
          const value = form.workerCounts[key] ?? "";
          const isInvalid = parseWorkerCount(value) === null;
          const isFirm = isFirmRow(row);
          const name = isFirm ? (firmNameById?.get(row.subcontractorId ?? "") ?? row.trade) : row.trade;
          const label = `${WORKER_SOURCE_LABELS[row.source]} · ${name}`;
          const hoursText = hoursValues[key] ?? "";
          const cell = isFirm || !puantaj?.crew ? null : puantajCellFor(puantaj.crew, row);
          const manHours = isFirm ? firmManHours(value, hoursText) : (cell?.hours ?? null);
          return (
            <div className="diary-workers__grid-row" key={key}>
              <span className="diary-workers__name">
                <span className={cx("diary-workers__badge", SOURCE_BADGE_CLASS[row.source])}>
                  {WORKER_SOURCE_LABELS[row.source]}
                </span>
                {name}
              </span>
              <Input
                className="diary-workers__count"
                size="row"
                inputMode="numeric"
                numeric
                status={isInvalid ? "error" : "default"}
                aria-label={`${label} işçi sayısı`}
                aria-invalid={isInvalid || undefined}
                maxLength={DIARY_WORKER_COUNT_MAX}
                value={value}
                disabled={isDisabled}
                title={
                  isEntryMissing
                    ? "Önce taslak kaydedin — işçi dağılımı kayıt açıldıktan sonra kaydedilebilir"
                    : undefined
                }
                onChange={(event) => onChange(key, event.target.value)}
              />
              {isFirm ? (
                <Input
                  className="diary-workers__hours-in"
                  size="row"
                  inputMode="decimal"
                  numeric
                  status={parseWorkerHours(hoursText).valid ? "default" : "error"}
                  aria-label={`${label} kişi başı saat`}
                  maxLength={WORKER_HOURS_MAX_LENGTH}
                  value={hoursText}
                  disabled={isDisabled}
                  onChange={(event) => onHoursChange?.(key, event.target.value)}
                />
              ) : (
                <span className="diary-workers__hours-ro" title="Puantajdan">
                  {formatHours(cell?.hours ?? null)}
                </span>
              )}
              <span className={cx("diary-workers__as", isFirm && "diary-workers__as--sub")}>
                {formatHours(manHours)}
              </span>
              {isFirm && onRemoveRow && !isDisabled ? (
                <button
                  type="button"
                  className="diary-lines__remove"
                  aria-label={`${name} satırını kaldır`}
                  onClick={() => onRemoveRow(key)}
                >
                  <XIcon width={12} height={12} />
                </button>
              ) : (
                <span />
              )}
            </div>
          );
        })}
        {/* İ:365 */}
        <div className="diary-workers__sub-note">Taşeron: kişi × saat = a-s</div>
        {onAddFirm && !isDisabled && addable.length > 0 && (
          <div className="diary-workers__add-firm">
            <Select
              aria-label="Taşeron firma ekle"
              value=""
              onChange={(event) => {
                const firm = addable.find((option) => option.id === event.target.value);
                if (firm) onAddFirm({ subcontractorId: firm.id, trade: firm.name });
              }}
            >
              <option value="">+ Taşeron firma ekle</option>
              {addable.map((firm) => (
                <option key={firm.id} value={firm.id}>
                  {firm.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        {/* İ:366-371 */}
        <div className="diary-workers__total diary-workers__grid-row">
          <span className="diary-workers__total-label">Toplam</span>
          <span className="diary-workers__total-value diary-workers__cell-center">{total === null ? EMPTY_CELL : total}</span>
          <span />
          <span className="diary-workers__total-as">{formatHours(totalAs)}</span>
          <span />
        </div>
      </div>
      {total === null && (
        <p className="diary-workers__note">
          İşçi sayısı yalnız tam sayı olabilir — toplam bu yüzden gösterilmiyor.
        </p>
      )}
      {puantaj?.isError && (
        <p className="diary-workers__note">Puantaj okunamadı — kendi ekip saatleri gösterilemiyor.</p>
      )}
      {isEntryMissing && !disabled && (
        <p className="diary-workers__note">
          İşçi dağılımı kayıt açıldıktan sonra girilebilir — önce “Taslak Kaydet” deyin.
        </p>
      )}
    </section>
  );
}
