import {
  IMPORT_RESULT_ALL_HINT,
  IMPORT_RESULT_BLOCKS_LABEL,
  IMPORT_RESULT_CREATED_LABEL,
  IMPORT_RESULT_PARTIAL_HINT,
  IMPORT_RESULT_SKIPPED_LABEL,
} from "./constants";
import { deriveImportResultOutcome, type UnitImportResult } from "./report";

interface ImportResultCardProps {
  result: UnitImportResult;
}

/**
 * EI 202 sonrası SONUÇ şeridi — mockup'ta karşılığı YOKTUR ve olmaması bir
 * eksikliktir, çünkü mockup aktarımın SONRASINI hiç çizmez.
 *
 * 🔴 KISMİ AKTARIM SUNUCUNUN BİLİNÇLİ DAVRANIŞIDIR: *"gecerli satirlar yazilir,
 * hatalilar raporlanir"*. Ekranın "aktarıldı" deyip geçmesi, 24 satırlık bir
 * dosyadan 23 ünite yazıldığını kullanıcıdan SAKLARDI. Bu yüzden `created`,
 * `skipped` ve `blocks_created` AÇIKÇA basılır ve ekran aktarım sonrası listeye
 * GİTMEZ (TU'nun aksine): gezinmek bu üç sayıyı görünmeden yok ederdi.
 *
 * 🔴 `created === 0` İLE GELEN BİR 200 SÖZLEŞME DIŞIDIR — sunucu o hâlde 422
 * döner (*"`created=0` ile 200 donmek kullanicinin 'aktarildi' sanmasina yol
 * acardi"*). Yine de "hepsi yazıldı" dalına düşürülmez: beklenmeyen bir yanıt
 * BAŞARI diye gösterilirse kullanıcı hiçbir şey yazılmadığını asla öğrenemez
 * (`deriveImportResultOutcome`, T1).
 */
export function ImportResultCard({ result }: ImportResultCardProps) {
  const outcome = deriveImportResultOutcome(result);

  if (outcome.kind === "nothing_created") {
    return (
      <section
        className="pf-card ei-result ei-result--empty"
        data-testid="excel-form-sonuc"
        aria-live="polite"
      >
        <p className="ei-strip ei-strip--danger" data-testid="excel-form-sonuc-bos">
          <strong>{outcome.message}</strong>
        </p>
        <dl className="ei-result__grid">
          <ResultItem label={IMPORT_RESULT_CREATED_LABEL} value={0} testId="excel-form-sonuc-olusan" />
          <ResultItem
            label={IMPORT_RESULT_SKIPPED_LABEL}
            value={outcome.skipped}
            testId="excel-form-sonuc-atlanan"
          />
        </dl>
      </section>
    );
  }

  const skipped = outcome.kind === "partial" ? outcome.skipped : 0;

  return (
    <section
      className="pf-card ei-result ei-result--done"
      data-testid="excel-form-sonuc"
      aria-live="polite"
    >
      <p className="ei-result__hint" data-testid="excel-form-sonuc-mesaj">
        {outcome.kind === "partial" ? IMPORT_RESULT_PARTIAL_HINT : IMPORT_RESULT_ALL_HINT}
      </p>
      <dl className="ei-result__grid">
        <ResultItem
          label={IMPORT_RESULT_CREATED_LABEL}
          value={outcome.created}
          testId="excel-form-sonuc-olusan"
        />
        <ResultItem
          label={IMPORT_RESULT_SKIPPED_LABEL}
          value={skipped}
          testId="excel-form-sonuc-atlanan"
        />
        <ResultItem
          label={IMPORT_RESULT_BLOCKS_LABEL}
          value={outcome.blocksCreated}
          testId="excel-form-sonuc-blok"
        />
      </dl>
    </section>
  );
}

function ResultItem({
  label,
  value,
  testId,
}: {
  label: string;
  value: number;
  testId: string;
}) {
  return (
    <div className="ei-result__item" data-testid={testId}>
      <dt className="ei-result__label">{label}</dt>
      <dd className="ei-result__value">{value}</dd>
    </div>
  );
}
