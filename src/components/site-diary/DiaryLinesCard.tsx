import Link from "next/link";

import { Badge } from "@/components/ui/badge/Badge";
import { Input } from "@/components/ui/input/Input";
import { formatAmount, formatCurrencyPrecise, formatQuantity } from "@/lib/format";
import type { SiteDiaryEntryDetail, SiteDiaryLineRead } from "@/lib/api/hooks/useSiteDiary";

import { DIARY_QUANTITY_MAX } from "./diary-labels";
import { parseDiaryQuantity, type DiaryFormState } from "./form-state";

export interface DiaryLinesCardProps {
  /** Kayıt henüz açılmadıysa `undefined` — satır iskeleti sunucudan gelir. */
  entry: SiteDiaryEntryDetail | undefined;
  form: DiaryFormState;
  onQuantityChange: (boqItemId: string, value: string) => void;
  disabled: boolean;
  /** `boq_item_id` → sözleşme (BOQ) miktarı; okunamadıysa boş nesne. */
  contractQuantities: Record<string, string>;
  /** BOQ okuması başarısızsa sözleşme miktarı basılmaz, gerekçe görünür. */
  contractQuantitiesUnavailable: boolean;
  /** Kaydedilmemiş değişiklik var mı — türev sütunları için görünür uyarı. */
  isDirty: boolean;
  /** GK264 "Hakediş Durumu →". */
  paymentsHref: string;
}

/**
 * GK205-266 · "📋 İş Kalemi Giriş" kartı.
 *
 * KURAL (spec §2): satır iskeleti BOQ pozlarından SUNUCUDA üretilir
 * (`POST /sites/{id}/diary` yanıtı), ekran YALNIZ "Bugün Yapılan" hücresini
 * yazar. "Kümülatif" (GK229) ve "Hakediş (₺)" (GK230) sütunlarıyla tfoot
 * toplamı (GK257) YANITTAN okunur — frontend'de yeniden HESAPLANMAZ.
 */
export function DiaryLinesCard({
  entry,
  form,
  onQuantityChange,
  disabled,
  contractQuantities,
  contractQuantitiesUnavailable,
  isDirty,
  paymentsHref,
}: DiaryLinesCardProps) {
  const lines = entry?.lines ?? [];

  return (
    <section className="diary-card" aria-labelledby="diary-lines-title">
      {/* GK207-213: başlık + alt metin solda, rozet sağda */}
      <div className="diary-card__head">
        <div>
          <h2 className="diary-card__title" id="diary-lines-title">
            📋 İş Kalemi Giriş
          </h2>
          {/* GK210 */}
          <p className="diary-card__subtitle">
            Bu girişler otomatik olarak aylık hakedişe işlenir
          </p>
        </div>
        {/* GK212 */}
        <Badge variant="primary" className="diary-lines__badge">
          Sözleşme BOQ&apos;a bağlı
        </Badge>
      </div>

      {lines.length === 0 ? (
        // Dürüst boş durum: satırlar kayıt AÇILDIĞINDA sunucudan gelir; sahte
        // satır uydurulmaz (spec §2, backend sözleşmesi).
        <p className="diary-lines__empty">
          {entry
            ? "Bu şantiyede sözleşme BOQ pozu tanımlı değil — iş kalemi satırı üretilemedi."
            : "İş kalemi satırları, gün için kayıt açıldığında sözleşme BOQ pozlarından otomatik gelir. Önce “Taslak Kaydet” deyin."}
        </p>
      ) : (
        <table className="diary-lines">
          <thead>
            <tr>
              {/* GK217-221 */}
              <th scope="col" className="diary-lines__col-item">
                Poz / İş Kalemi
              </th>
              <th scope="col" className="diary-lines__col-unit">
                Birim
              </th>
              <th scope="col" className="diary-lines__col-today">
                Bugün Yapılan
              </th>
              <th scope="col" className="diary-lines__col-cumulative">
                Kümülatif
              </th>
              <th scope="col" className="diary-lines__col-amount">
                Hakediş (₺)
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <DiaryLineRow
                key={line.id}
                line={line}
                value={line.boq_item_id === null ? "" : form.quantities[line.boq_item_id] ?? ""}
                onChange={onQuantityChange}
                disabled={disabled}
                contractQuantity={
                  line.boq_item_id === null ? undefined : contractQuantities[line.boq_item_id]
                }
              />
            ))}
          </tbody>
          <tfoot>
            {/* GK255-258 */}
            <tr className="diary-lines__total-row">
              <td colSpan={4}>Bugünkü Hakediş Katkısı</td>
              <td className="diary-lines__total-amount">
                {formatCurrencyPrecise(entry?.lines_total ?? "0")}
              </td>
            </tr>
          </tfoot>
        </table>
      )}

      {contractQuantitiesUnavailable && lines.length > 0 && (
        <p className="diary__notice">
          Sözleşme (BOQ) miktarları okunamadı — “Kümülatif” sütununda sözleşme
          hedefi ve poz alt satırındaki sözleşme miktarı gösterilmiyor.
        </p>
      )}

      {isDirty && lines.length > 0 && (
        <p className="diary__notice">
          Kaydedilmemiş değişiklik var. “Kümülatif”, “Hakediş (₺)” ve günlük
          toplam sunucudan gelen türevlerdir; kayıttan sonra güncellenir.
        </p>
      )}

      {(entry?.dropped_orphan_count ?? 0) > 0 && (
        <p className="diary__notice">
          Sözleşme BOQ&apos;undan kaldırılan {entry?.dropped_orphan_count} poz bu
          kayıttan düşürüldü.
        </p>
      )}

      {/* GK261-265: bilgi kutusu + "Hakediş Durumu →" */}
      <div className="diary-lines__info">
        <span className="diary-lines__info-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </span>
        {/* GK263'teki "İşveren Hakedişi #5" SABİT bir numaradır; hangi hakedişe
            işleneceğini veren bir uç yok — numara UYDURULMAZ, cümle numarasız
            basılır (zarif düşüş). */}
        <span className="diary-lines__info-text">
          Bu girişler ay sonunda otomatik olarak <strong>işveren hakedişine</strong>{" "}
          ve ilgili <strong>taşeron hakedişlerine</strong> işlenecek.
        </span>
        <Link href={paymentsHref} className="diary-lines__info-link">
          Hakediş Durumu →
        </Link>
      </div>
    </section>
  );
}

function DiaryLineRow({
  line,
  value,
  onChange,
  disabled,
  contractQuantity,
}: {
  line: SiteDiaryLineRead;
  value: string;
  onChange: (boqItemId: string, value: string) => void;
  disabled: boolean;
  contractQuantity: string | undefined;
}) {
  const invalid = parseDiaryQuantity(value) === null;
  return (
    <tr>
      {/* GK226: poz adı + "Sözleşme: … · Birim fiyat: …" alt satırı */}
      <td className="diary-lines__item">
        <span className="diary-lines__item-name">
          {line.code} — {line.description}
        </span>
        <span className="diary-lines__item-meta">
          {contractQuantity !== undefined
            ? `Sözleşme: ${formatQuantity(contractQuantity)} ${line.unit} · `
            : ""}
          Birim fiyat: ₺{formatAmount(line.unit_price)}
        </span>
      </td>
      <td className="diary-lines__unit">{line.unit}</td>
      <td className="diary-lines__today">
        {line.boq_item_id === null ? (
          // Öksüz satır (BOQ pozu silinmiş): PUT gövdesi `boq_item_id`
          // zorunlu tuttuğu için düzenlenemez — gizlenmez, gerekçesiyle basılır.
          <span className="diary-lines__orphan" title="Sözleşme pozu kaldırılmış — düzenlenemez">
            —
          </span>
        ) : (
          <Input
            size="row"
            numeric
            inputMode="decimal"
            maxLength={DIARY_QUANTITY_MAX}
            className="diary-lines__qty"
            aria-label={`${line.code} bugün yapılan miktar`}
            status={invalid ? "error" : "default"}
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(line.boq_item_id as string, event.target.value)}
          />
        )}
      </td>
      {/* GK229: "900 / 1.200" — solu yanıttan, sağı BOQ'tan. */}
      <td className="diary-lines__cumulative">
        {formatQuantity(line.cumulative_quantity)}
        {contractQuantity !== undefined ? ` / ${formatQuantity(contractQuantity)}` : ""}
      </td>
      {/* GK230: satır hakedişi — YANITTAN. */}
      <td className="diary-lines__amount">{formatAmount(line.line_amount)}</td>
    </tr>
  );
}
