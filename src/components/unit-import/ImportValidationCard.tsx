import { Badge } from "@/components/ui";

import {
  IMPORT_BLOCKED_ROWS_HINT,
  IMPORT_BLOCKS_STALE_NOTICE,
  IMPORT_BLOCKS_TO_CREATE_HINT,
  IMPORT_BLOCKS_TO_CREATE_LABEL,
  IMPORT_ERROR_LABEL,
  IMPORT_TOTAL_ROWS_LABEL,
  IMPORT_VALID_LABEL,
  IMPORT_VALIDATION_CARD_TITLE,
  IMPORT_WARNING_LABEL,
  importBlockedRowsText,
} from "./constants";
import {
  describeBlocksToCreate,
  deriveValidationOutcome,
  type ImportValidationOutcome,
  type UnitImportValidation,
} from "./report";

interface ImportValidationCardProps {
  /** Sunucudan gelen doğrulama; henüz sorulmadıysa `null`. */
  validation: UnitImportValidation | null;
  /** EI 192 kutucuğunun GÜNCEL değeri — aktarılacak satır sayısını değiştirir. */
  includeWarnings: boolean;
  /** Kutucuk doğrulamadan SONRA değişti mi (yalnız blok listesini bayatlatır). */
  blocksStale: boolean;
  isLoading: boolean;
  /** Sunucu hatası — OLDUĞU GİBİ basılır. */
  errorMessage: string | null;
  /** Kart boşken basılacak gerekçe (ilk açılış ≠ girdi değişti). */
  emptyNotice: string;
}

/**
 * "Doğrulama Sonucu" kartı (EI 91-103).
 *
 * 🔴 SAYAÇLAR SESSİZCE ÇİZİLMEZ. `UnitImportSummary`nin değişmezi
 * `valid + warning + error == total_rows`tir; bozulursa tablo da güvenilmezdir
 * ve `checkImportSummary` (T1) bunu BİLDİRİR. O hâlde kırmızı özet şeridi
 * BASILMAZ — çünkü "kaç satır aktarılamayacak" sorusunun cevabı da güvenilmez
 * sayaçlardan çıkardı; yerine tutarsızlık gerekçesi basılır.
 *
 * 🔴 EI 100-102'nin SAYISI SABİT DEĞİLDİR. Mockup "1 satır aktarılamayacak"
 * yazar (EI 192 işaretliyken doğru); kutucuk kapatılınca uyarılı satır da
 * yazılmayacaktır ve sayı 2 olur. Sayı bu yüzden
 * `total_rows - importableCount`tan TÜRETİLİR.
 *
 * 🔴 MOCKUP'TA KUTUSU OLMAYAN ALAN — `blocks_to_create`. Aktarım dosyada geçen
 * ama projede olmayan blokları AÇAR; bunu söylememek sessiz sürpriz olurdu
 * (kullanıcı bir yazım hatası yüzünden fazladan blok açtığını sonradan fark
 * ederdi). MOCKUP + BİR olarak bilgilendirici bir not basılır.
 *
 * ⚠️ EI 93'ün keycap `2️⃣`si glif bekçisinin izin listesinde YOKTUR (U+20E3
 * birleştiricisi) → adım numarası `Badge` ile basılır.
 */
export function ImportValidationCard({
  validation,
  includeWarnings,
  blocksStale,
  isLoading,
  errorMessage,
  emptyNotice,
}: ImportValidationCardProps) {
  const outcome =
    validation === null ? null : deriveValidationOutcome(validation, { includeWarnings });
  const blocks = validation === null ? null : describeBlocksToCreate(validation);

  return (
    <section className="pf-card" data-testid="excel-form-dogrulama-kart">
      {/* 93 */}
      <h2 className="pf-card__title">
        <Badge variant="primary" shape="count" className="ei-step">
          2
        </Badge>
        {IMPORT_VALIDATION_CARD_TITLE}
      </h2>

      {errorMessage && (
        <p className="ei-inline-error" data-testid="excel-form-dogrulama-hata">
          {errorMessage}
        </p>
      )}

      {validation === null || outcome === null ? (
        <p className="ei-notice" data-testid="excel-form-dogrulama-bos">
          {isLoading ? "Dosya doğrulanıyor…" : emptyNotice}
        </p>
      ) : (
        <>
          {/* 94-99 — dört sayaç */}
          <div className="ei-counters" data-testid="excel-form-sayaclar">
            <Counter
              label={IMPORT_TOTAL_ROWS_LABEL}
              value={validation.summary.total_rows}
              tone="neutral"
              testId="excel-form-sayac-toplam"
            />
            <Counter
              label={IMPORT_VALID_LABEL}
              value={validation.summary.valid}
              tone="valid"
              testId="excel-form-sayac-gecerli"
            />
            <Counter
              label={IMPORT_WARNING_LABEL}
              value={validation.summary.warning}
              tone="warning"
              testId="excel-form-sayac-uyari"
            />
            <Counter
              label={IMPORT_ERROR_LABEL}
              value={validation.summary.error}
              tone="error"
              testId="excel-form-sayac-hata"
            />
          </div>

          <ValidationStrip outcome={outcome} totalRows={validation.summary.total_rows} />

          {blocks && (
            <p className="ei-blocks" data-testid="excel-form-yeni-bloklar">
              <strong>{IMPORT_BLOCKS_TO_CREATE_LABEL}</strong> {blocks.names.join(", ")} (
              {blocks.count}) — {IMPORT_BLOCKS_TO_CREATE_HINT}
              {blocksStale && (
                <span className="ei-blocks__stale" data-testid="excel-form-yeni-bloklar-bayat">
                  {" "}
                  {IMPORT_BLOCKS_STALE_NOTICE}
                </span>
              )}
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** EI 95-98 — tek sayaç kutusu; dördü aynı kalıptan çıkar. */
function Counter({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone: "neutral" | "valid" | "warning" | "error";
  testId: string;
}) {
  return (
    <div className={`ei-counter ei-counter--${tone}`} data-testid={testId}>
      <span className="ei-counter__value">{value}</span>
      <span className="ei-counter__label">{label}</span>
    </div>
  );
}

/**
 * EI 100-102 kırmızı özet şeridi — ama YALNIZ aktarılamayan satır varsa.
 * Hepsi aktarılabiliyorken kırmızı bir şerit basmak yanlış alarm olurdu.
 */
function ValidationStrip({
  outcome,
  totalRows,
}: {
  outcome: ImportValidationOutcome;
  totalRows: number;
}) {
  if (outcome.kind === "inconsistent") {
    return (
      <p className="ei-strip ei-strip--danger" data-testid="excel-form-ozet-tutarsiz">
        <strong>{outcome.message}</strong>
      </p>
    );
  }

  if (outcome.kind === "empty" || outcome.kind === "nothing_importable") {
    return (
      <p className="ei-strip ei-strip--danger" data-testid="excel-form-ozet-serit">
        <strong>{outcome.message}</strong>
      </p>
    );
  }

  const blocked = totalRows - outcome.importableCount;
  if (blocked <= 0) return null;

  return (
    <p className="ei-strip ei-strip--danger" data-testid="excel-form-ozet-serit">
      <strong>{importBlockedRowsText(blocked)}</strong> {IMPORT_BLOCKED_ROWS_HINT}
    </p>
  );
}
