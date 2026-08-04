export interface DiarySummaryTrendCardProps {
  /** HÖ235 başlığındaki şantiye adı; henüz yüklenmediyse `null`. */
  siteName: string | null;
}

/**
 * HÖ234-259 · "Aylık Hakediş Trendi" kartı — **PENDING** (spec §6 S4,
 * kullanıcı kararı).
 *
 * Backend'de aylık ZAMAN SERİSİ ucu YOKTUR. Üst kural gereği kart SİLİNMEZ:
 * başlık, grafik alanı ve gösterge (HÖ255-258) basılır; grafik alanı devre dışı
 * ve GÖRÜNÜR gerekçelidir.
 *
 * SIZINTI YOK (bilinçli karar): bu kart son N ayın hakediş listelerini çekip
 * eğri TÜRETMEZ — hiçbir ek sorgu atmaz, hiçbir hook çağırmaz, sayfanın
 * sorgularına dokunmaz. Saf sunum bileşenidir; tek prop'u şantiye adıdır.
 */
export function DiarySummaryTrendCard({ siteName }: DiarySummaryTrendCardProps) {
  return (
    <section className="diary-card" aria-labelledby="diary-trend-title">
      {/* HÖ235 */}
      <h2 className="diary-card__title" id="diary-trend-title">
        Aylık Hakediş Trendi{siteName === null ? "" : ` — ${siteName}`}
      </h2>

      {/* HÖ236-254 — grafik alanı; devre dışı yer tutucu */}
      <div className="diary-trend__plot" aria-disabled="true">
        <p className="diary-trend__plot-text">Grafik henüz çizilemiyor</p>
      </div>

      <p className="diary__notice">
        Aylık trend grafiği için backend&apos;de bir zaman-serisi ucu henüz yok. Bu kart, geçmiş
        aylar için ayrı ayrı hakediş sorguları atıp tahmini bir eğri çizmez; uç eklendiğinde
        grafik olduğu yerde açılacak.
      </p>

      {/* HÖ255-258 — gösterge (grafik gelince aynı iki seriyi anlatır) */}
      <ul className="diary-trend__legend">
        <li className="diary-trend__legend-item">
          <span className="diary-trend__legend-line diary-trend__legend-line--employer" />
          İşveren Hakediş (kümülatif)
        </li>
        <li className="diary-trend__legend-item">
          <span className="diary-trend__legend-line diary-trend__legend-line--subcontractor" />
          Taşeron Ödemeleri (kümülatif)
        </li>
      </ul>
    </section>
  );
}
