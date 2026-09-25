import { cx } from "@/lib/cx";
import { formatUnitRate } from "@/lib/earned-value";
import { EMPTY_CELL, formatDateDots, formatQuantity } from "@/lib/format";
import type { EvCatalogItemRead } from "@/lib/api/models";

import { diffBand, formatDiffPercent, siteDeviationRatio } from "./catalog-model";
import { RatePlot } from "./RatePlot";

interface CatalogRowDetailProps {
  item: EvCatalogItemRead;
}

function numberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value);
}

/**
 * KAT:178-218 — açılan satır: tamamlanan şantiye tablosu + dağılım grafiği.
 *
 * K4: ortalama MİKTAR AĞIRLIKLI ve yalnız tamamlanmış şantiye (mockup'taki
 * "basit ortalama" notu ve "devam eden · ortalamaya girmez" satırı bu karar ve
 * API'nin devam edeni taşımaması nedeniyle basılmaz). B1'de `sites` BOŞ →
 * "Henüz gerçekleşen yok" satırı (KAT:491).
 */
export function CatalogRowDetail({ item }: CatalogRowDetailProps) {
  const { actual } = item;
  const averageBand = diffBand(item.diff_pct);
  const range =
    actual.min !== null && actual.max !== null
      ? `${formatUnitRate(actual.min)}–${formatUnitRate(actual.max)}`
      : EMPTY_CELL;

  return (
    <div className="ev-cat-detail" role="region" aria-label={`${item.name} gerçekleşen şantiyeler`}>
      <div className="ev-cat-sites">
        <table>
          <thead>
            <tr>
              <th scope="col">Şantiye</th>
              <th scope="col">Bitiş</th>
              <th scope="col">Miktar</th>
              <th scope="col">Oran</th>
              <th scope="col">Standarttan</th>
            </tr>
          </thead>
          <tbody>
            {actual.sites.map((site) => {
              const deviation = siteDeviationRatio(site.rate, item.standard_unit_mhr);
              return (
                <tr key={site.site_id}>
                  <td>
                    <span className="ev-cat-sites__site">
                      <span>{site.site_name}</span>
                      <span className="ev-cat-sites__note">tamamlandı</span>
                    </span>
                  </td>
                  <td>{site.end_date ? formatDateDots(site.end_date) : EMPTY_CELL}</td>
                  <td>{`${formatQuantity(site.qty)} ${item.uom}`}</td>
                  <td>{formatUnitRate(site.rate)}</td>
                  <td className={`ev-cat-diff-text--${diffBand(deviation)}`}>{formatDiffPercent(deviation)}</td>
                </tr>
              );
            })}
            {actual.avg !== null && (
              <tr className="ev-cat-sites__avg">
                <td>
                  <span className="ev-cat-sites__site">
                    <span>{`Ortalama · ${actual.site_count} şantiye`}</span>
                    <span className="ev-cat-sites__note">miktar ağırlıklı</span>
                  </span>
                </td>
                <td />
                <td />
                <td>{formatUnitRate(actual.avg)}</td>
                <td className={`ev-cat-diff-text--${averageBand}`}>{formatDiffPercent(item.diff_pct)}</td>
              </tr>
            )}
            {actual.sites.length === 0 && actual.avg === null && (
              <tr className="ev-cat-sites__empty">
                <td>
                  <span className="ev-cat-sites__site">
                    <span>Henüz gerçekleşen yok</span>
                    <span className="ev-cat-sites__note">ilk tamamlanan şantiyede oluşur</span>
                  </span>
                </td>
                <td />
                <td />
                <td>{EMPTY_CELL}</td>
                <td>{EMPTY_CELL}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="ev-cat-plot-card">
        <div className="ev-cat-plot-card__legend">
          <span className="ev-cat-plot-card__title">{`Dağılım · a-s/${item.uom}`}</span>
          <span className="ev-cat-plot-card__key">
            <span className="ev-cat-plot-card__dot" aria-hidden="true" />
            Tamamlanan
          </span>
          <span className="ev-cat-plot-card__key">
            <svg className="ev-cat-plot-card__dash" viewBox="0 0 14 10" aria-hidden="true">
              <line x1="7" y1="0" x2="7" y2="10" strokeWidth="2" strokeDasharray="3 2" />
            </svg>
            Standart
          </span>
        </div>
        <RatePlot
          uom={item.uom}
          standard={Number(item.standard_unit_mhr)}
          sites={actual.sites.map((site) => ({ name: site.site_name, rate: Number(site.rate) }))}
          average={numberOrNull(actual.avg)}
          min={numberOrNull(actual.min)}
          max={numberOrNull(actual.max)}
        />
        <div className={cx("ev-cat-plot-card__foot")}>
          Ortalama <b>{formatUnitRate(actual.avg)}</b> · aralık <span className="ev-cat-mono">{range}</span> · mavi
          zemin min–max
        </div>
      </div>
    </div>
  );
}
