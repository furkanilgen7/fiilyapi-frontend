import { Button } from "@/components/ui";
import { pendingModuleLabel } from "@/lib/pending-modules";

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
