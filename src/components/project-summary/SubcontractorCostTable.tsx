import Link from "next/link";

import { formatCurrency, formatPercent } from "@/lib/format";
import type { ProjectType } from "@/lib/api/hooks/useProjects";
import type {
  SubcontractorCostRow,
  SubcontractorCostSummary,
} from "@/lib/api/hooks/useProjectCosts";

import { barWidthPct } from "./bar-ratio";
import { EMPTY_VALUE } from "./PendingCell";
import { REASONS } from "./project-summary-labels";

/**
 * KY 205-249 / KK 210-247 taşeron maliyet tablosu — satır birimi SÖZLEŞMEdir.
 *
 * 🔴 İKİ MOCKUP'IN SÜTUNLARI AYNI DEĞİLDİR ve bu ÖLÇÜLDÜ (emrin ilk hâli
 * `Durum`u KY'ye atfediyordu, yanlıştı):
 *
 *   KY 208-215 → Taşeron · İş Kalemi · Sözleşme · Ödenen · **Bekleyen** · İlerleme
 *   KK 213-220 → Taşeron · İş Kalemi · Sözleşme · Ödenen · İlerleme · **Durum**
 *
 * `Bekleyen` GERÇEKTİR (`SubcontractorCostRow.pending`) ve KY'de basılır.
 * `Durum` BASILMAZ: satırda durum alanı YOKTUR, üstelik `ContractStatus`
 * (`active`/`completed`/`on_hold`) mockup'ın sözcüklerine de oturmaz —
 * "Başlamadı"nın enum üyesi yok ve yeni sözleşme `active` doğduğu için hiç
 * başlamamış bir sözleşme ekranda "Aktif" basardı (K2).
 *
 * 🔴 `İlerleme` FİNANSAL bir orandır (`paid / contract_amount`), fiziksel
 * DEĞİL — şema açıklaması bunu adıyla uyarıyor. Bu yüzden başlık "İlerleme"
 * kalır; "Fiziksel İlerleme" diye ETİKETLENEMEZ.
 *
 * `progress_pct` `null` olabilir: bedeli `0` olan sözleşmede oran TANIMSIZDIR
 * ve `%0` basmak "veri yok"u "ilerleme yok" diye gösterirdi. `—` basılır.
 * Bedeli olup hiç ödeme görmemiş sözleşme ise GERÇEK `0.00` döner (KY 236-243
 * mockup'ta harfiyen `%0` basar) — iki hâl AYRI.
 */
export interface SubcontractorCostTableProps {
  rows: SubcontractorCostRow[];
  total: SubcontractorCostSummary;
  projectType: ProjectType;
}

/** KK'da `Durum` sütununun yerine basılan gerekçe — bir kez, başlıkta. */
export const STATUS_COLUMN_OMITTED_NOTE = REASONS.subcontractorStatus;

function ProgressCell({ row }: { row: SubcontractorCostRow }) {
  if (row.progress_pct === null) {
    return (
      <span className="psum-tbl__pending" title={REASONS.subcontractorZeroContract}>
        {EMPTY_VALUE}
      </span>
    );
  }
  const width = barWidthPct(row.paid, row.contract_amount);
  return (
    <div className="psum-tbl__progress">
      {width !== null ? (
        <div className="psum-tbl__bar">
          <div className="psum-tbl__bar-fill" style={{ width: `${width}%` }} />
        </div>
      ) : null}
      <span className="psum-tbl__pct">{formatPercent(row.progress_pct)}</span>
    </div>
  );
}

export function SubcontractorCostTable({ rows, total, projectType }: SubcontractorCostTableProps) {
  // KY'de `Bekleyen` sütunu VARDIR, KK'da yoktur (ölçüldü).
  const showPending = projectType === "kendi_yatirim";

  return (
    <section className="psum-card" aria-labelledby="psum-sub-title">
      <div className="psum-card__head">
        <div>
          <h2 className="psum-card__title" id="psum-sub-title">
            Taşeron Hakedişleri
          </h2>
          <p className="psum-card__sub">
            {projectType === "kat_karsiligi"
              ? "Kat karşılığında da taşeron çalışır, hakediş kesilir"
              : "Kendi yatırımda da taşeron çalışır — inşaat maliyetinin ana kalemi"}
          </p>
        </div>
        <Link className="psum-card__link" href="/hakedisler/taseron">
          Tümü
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="psum-empty">Bu projede taşeron sözleşmesi yok.</p>
      ) : (
        <div className="psum-tbl__scroll">
          <table className="psum-tbl">
            <thead>
              <tr>
                <th scope="col">Taşeron</th>
                <th scope="col">İş Kalemi</th>
                <th scope="col">Sözleşme</th>
                <th scope="col">Ödenen</th>
                {showPending ? <th scope="col">Bekleyen</th> : null}
                <th scope="col">İlerleme</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.contract_id}>
                  <td>
                    <div className="psum-tbl__name">{row.subcontractor_name ?? EMPTY_VALUE}</div>
                    {/* KY 219 ad altındaki kategori rozeti BASILMAZ: aynı
                        değer "İş Kalemi" sütununa tahsislidir (kullanıcı
                        kararı 2026-08-09) ve iki hücreye basmak sahte bir
                        ayrım üretirdi. */}
                    {row.contract_no ? (
                      <div className="psum-tbl__sub">{row.contract_no}</div>
                    ) : null}
                  </td>
                  {/* `work_category` NULL olabilir ve bu MEŞRUDUR (taslak
                      sözleşmede girilmemiş): hücre BOŞ basılır, uydurma metin
                      üretilmez (şema notu). */}
                  <td>{row.work_category ?? EMPTY_VALUE}</td>
                  <td className="psum-tbl__num">{formatCurrency(row.contract_amount)}</td>
                  <td className="psum-tbl__num">{formatCurrency(row.paid)}</td>
                  {showPending ? (
                    <td className="psum-tbl__num">{formatCurrency(row.pending)}</td>
                  ) : null}
                  <td>
                    <ProgressCell row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={2}>TOPLAM TAŞERON MALİYETİ</td>
                <td className="psum-tbl__num">{formatCurrency(total.contract_amount)}</td>
                <td className="psum-tbl__num">{formatCurrency(total.paid)}</td>
                {showPending ? (
                  <td className="psum-tbl__num">{formatCurrency(total.pending)}</td>
                ) : null}
                {/* KY 248 tfoot'unun "İlerleme" hücresi HARFİYEN BOŞTUR ve
                    şema bunu bilinçli sayar: toplam bir ilerleme yüzdesinin
                    "hangi ortalama" sorusuna tek doğru cevabı yoktur. */}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* KK'nın `Durum` sütunu basılmadı — gerekçe GÖRÜNÜR (K2). */}
      {projectType === "kat_karsiligi" ? (
        <p className="psum-card__note" data-pending-key="subcontractor_contract_status">
          {STATUS_COLUMN_OMITTED_NOTE}
        </p>
      ) : null}
    </section>
  );
}
