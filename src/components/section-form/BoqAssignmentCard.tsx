import { Button } from "@/components/ui";
import { pendingModuleLabel } from "@/lib/pending-modules";

/** F198-199 artı ikonu — `SectionsCard.tsx`'teki `PlusIcon` deseniyle aynı. */
function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const COLUMNS = [
  "Poz No",
  "Poz Adı",
  "Birim",
  "Şantiye Kotası",
  "Bu Bölüme",
  "B. Fiyat",
  "Tutar",
];

/**
 * 📋 Bölüme Atanacak İş Kalemleri kartı (mockup F131–211).
 *
 * Kalıcı karar 1: iş kalemi ↔ bölüm bağı veri katmanında KAPALI. Kart mockup
 * yerleşimiyle (başlık + rozet + tablo başlıkları + toplam satırı) BİREBİR
 * basılır ama satır verisi UYDURULMAZ — boş/dürüst durum basılır, kontroller
 * `disabled`dır ve hiçbir alan POST/PATCH gövdesine girmez.
 */
export function BoqAssignmentCard() {
  return (
    <section className="pf-card pf-card--flush sf-boq-card">
      <div className="sf-boq-card__head">
        <span className="sf-boq-card__title">📋 Bölüme Atanacak İş Kalemleri</span>
        <span className="sf-boq-card__badge">İş kalemi bağları ile birlikte gelir</span>
        <Button type="button" variant="ghost" size="sm" disabled className="sf-boq-card__add">
          + Poz Seç
        </Button>
      </div>

      <div className="sf-boq-card__note">{pendingModuleLabel("boq")}</div>

      <table className="sf-boq-table">
        <caption className="sr-only">Bölüme atanacak iş kalemleri</caption>
        <thead>
          <tr>
            {COLUMNS.map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={COLUMNS.length + 1} className="sf-boq-table__empty">
              Bu bölüme henüz iş kalemi atanmadı — iş kalemi bağları ile birlikte gelir.
            </td>
          </tr>
          {/* F194-201: "Şantiye kotasından poz seç" satır-butonu — bir veri
              satırı değil, kontroldür; ÜST KURAL gereği devre dışı basılır
              (F135 "+ Poz Seç" zaten yukarıda basılı). */}
          <tr className="sf-boq-table__add-row">
            <td colSpan={COLUMNS.length + 1}>
              <button type="button" className="sf-boq-table__add-dashed" disabled>
                <PlusIcon />
                Şantiye kotasından poz seç
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={COLUMNS.length}>BÖLÜM İŞ KALEMİ TOPLAMI</td>
            <td className="sf-boq-table__total">—</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
