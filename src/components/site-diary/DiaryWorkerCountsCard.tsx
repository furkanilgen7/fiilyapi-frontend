import { Input } from "@/components/ui/input/Input";
import { cx } from "@/lib/cx";

import { DIARY_WORKER_COUNT_MAX, WORKER_SOURCE_LABELS } from "./diary-labels";
import type { DiaryFormState } from "./form-state";
import {
  parseWorkerCount,
  workerCountKey,
  workerCountsTotal,
  type DiaryWorkerRow,
} from "./worker-counts";

export interface DiaryWorkerCountsCardProps {
  rows: readonly DiaryWorkerRow[];
  form: DiaryFormState;
  onChange: (key: string, value: string) => void;
  /** Salt-okunur görünüm (izin yok ya da kayıt `submitted`). */
  disabled: boolean;
  /** Kayıt henüz açılmadı — `POST` gövdesi `worker_counts` KABUL ETMEZ, sayı
   * girişi kaydedilemez; alanlar gerekçesiyle devre dışı kalır (silinmez). */
  isEntryMissing: boolean;
}

const SOURCE_BADGE_CLASS: Record<DiaryWorkerRow["source"], string> = {
  company: "diary-workers__badge--company",
  subcontractor: "diary-workers__badge--subcontractor",
  general: "diary-workers__badge--general",
  /* freelance/intern mockup'ın (GK418-430) dört satırında yok; genel (nötr)
     rozet stiline düşer — İK-3 dalıyla `WorkerSource`e eklendi (T1 kapsamı). */
  freelance: "diary-workers__badge--general",
  intern: "diary-workers__badge--general",
};

/**
 * GK414-439 · "👷 Bugünkü İşçi Dağılımı" kartı.
 *
 * Satır listesi mockup'ın dört (meslek, kaynak) çiftidir — mockup'ta satır
 * ekle/sil kontrolü YOKTUR (bkz. `worker-counts.ts`). Sayılar `PATCH
 * /diary/{entry_id}` gövdesindeki `worker_counts[]` ile kaydedilir; "Toplam"
 * (GK434-437) yazarken anında güncellenen bir TÜREVDİR.
 */
export function DiaryWorkerCountsCard({
  rows,
  form,
  onChange,
  disabled,
  isEntryMissing,
}: DiaryWorkerCountsCardProps) {
  const total = workerCountsTotal(rows, form.workerCounts);
  const isDisabled = disabled || isEntryMissing;

  return (
    <section className="diary-card diary-card--side" aria-labelledby="diary-workers-title">
      {/* GK415 */}
      <h2 className="diary-card__title" id="diary-workers-title">
        👷 Bugünkü İşçi Dağılımı
      </h2>
      <div className="diary-workers__list">
        {rows.map((row) => {
          const key = workerCountKey(row);
          const value = form.workerCounts[key] ?? "";
          const isInvalid = parseWorkerCount(value) === null;
          return (
            <div className="diary-workers__row" key={key}>
              <span className="diary-workers__name">
                <span className={cx("diary-workers__badge", SOURCE_BADGE_CLASS[row.source])}>
                  {WORKER_SOURCE_LABELS[row.source]}
                </span>
                {row.trade}
              </span>
              {/* GK420 — girilebilir sayı hücresi */}
              <Input
                className="diary-workers__count"
                size="row"
                inputMode="numeric"
                numeric
                status={isInvalid ? "error" : "default"}
                aria-label={`${WORKER_SOURCE_LABELS[row.source]} · ${row.trade} işçi sayısı`}
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
            </div>
          );
        })}
        {/* GK434-437 */}
        <div className="diary-workers__total">
          <span className="diary-workers__total-label">Toplam</span>
          <span className="diary-workers__total-value">{total === null ? "—" : total}</span>
        </div>
      </div>
      {total === null && (
        <p className="diary-workers__note">
          İşçi sayısı yalnız tam sayı olabilir — toplam bu yüzden gösterilmiyor.
        </p>
      )}
      {isEntryMissing && !disabled && (
        <p className="diary-workers__note">
          İşçi dağılımı kayıt açıldıktan sonra girilebilir — önce “Taslak Kaydet” deyin.
        </p>
      )}
    </section>
  );
}
