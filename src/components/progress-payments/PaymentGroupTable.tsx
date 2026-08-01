import { formatAmount } from "@/lib/format";
import type { ProgressPaymentDetail } from "@/lib/api/hooks/useProgressPayments";

type ProgressPaymentGroupSummary = ProgressPaymentDetail["groups"][number];

export interface PaymentGroupTableProps {
  groups: ProgressPaymentGroupSummary[];
}

// E15 94-145 "Hakediş Kalemleri" kartı — grup satırları (spec §6.6, brief §3).
// `group_name` null olduğunda uydurma bir "Gruplanmamış" başlığı YAZILMAZ,
// hücre boş bırakılır (brief açık talimatı).
//
// Mockup 136-142'deki "Ara Toplam" satırı BİLEREK basılmaz: şema grup
// toplamları için ayrı bir alan taşımıyor, istemci tarafında dört sütunu
// toplamak brief'in listelemediği bir hesaptır (§BASILMAYACAKLAR: "ara
// çözüm/sahte hesap yazılmaz") — rapora soru olarak düşüldü.
export function PaymentGroupTable({ groups }: PaymentGroupTableProps) {
  return (
    <section className="pp-table-card">
      <div className="pp-table-card__head">Hakediş Kalemleri</div>
      <table className="pp-table">
        <thead>
          <tr>
            <th className="pp-table__th pp-table__col--item">İş Kalemi</th>
            <th className="pp-table__th pp-table__col--amount">Sözleşme</th>
            <th className="pp-table__th pp-table__col--amount">Önceki</th>
            <th className="pp-table__th pp-table__col--amount">Bu Ay</th>
            <th className="pp-table__th pp-table__col--amount">Toplam</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, index) => (
            // group_name benzersiz değil (null de olabilir) — sıra sabit
            // olduğundan index anahtar olarak güvenli.
            <tr key={index} className="pp-table__row">
              <td className="pp-table__cell pp-table__col--item">{group.group_name ?? ""}</td>
              <td className="pp-table__cell pp-table__col--amount">
                {formatAmount(group.contract_amount)}
              </td>
              <td className="pp-table__cell pp-table__col--amount">
                {formatAmount(group.previous_amount)}
              </td>
              <td className="pp-table__cell pp-table__col--amount pp-table__cell--this">
                {formatAmount(group.this_amount)}
              </td>
              <td className="pp-table__cell pp-table__col--amount pp-table__cell--total">
                {formatAmount(group.cumulative_amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
