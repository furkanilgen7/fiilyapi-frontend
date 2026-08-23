"use client";

import { useState } from "react";
import Link from "next/link";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { ProjectDetailTabs } from "@/components/project-detail/ProjectDetailTabs";
import { Button } from "@/components/ui/button";
import { useProject } from "@/lib/api/hooks/useProjects";
import {
  isLandShareMissing,
  useLandShareSummary,
  useLandShareUnits,
  LAND_SHARE_UNITS_PAGE_SIZE,
} from "@/lib/api/hooks/useLandShare";
import { downloadUnitsExport } from "@/lib/api/units-export-client";
import { isForbidden } from "@/lib/api/unwrap";
import { formatCurrency, formatPercent, formatDateDots, formatDecimal } from "@/lib/format";

import { PendingCell, EMPTY_VALUE } from "./PendingCell";
import {
  OWNER_SIDE_LABELS,
  PROJECT_SUMMARY_PENDING_KEYS,
  REASONS,
  UNIT_KIND_LABELS,
  unitSalesStatusLabel,
} from "./project-summary-labels";
import "./project-summary.css";

/**
 * F-PKK T3 · Paylaşım Tablosu (`Kat Karşılığı - Paylaşım.dc.html`).
 *
 * 🔴 F-UNIT2'nin `/satis/paylasim-girisi` ekranıyla KARIŞTIRILMAMALIDIR: o
 * GİRİŞ (yazma) ekranıdır, bu OKUMA ekranıdır. İkisi aynı iki ucu okur ama
 * bu ekran `PATCH`e HİÇ dokunmaz — kaydetme düğmesi giriş ekranına GİDER.
 *
 * 🔴 KAT KARŞILIĞI OLMAYAN PROJE 404 ALIR, BOŞ ÖZET DEĞİL (şema notu) ve bu
 * ayrım ekranda GÖRÜNÜR olmak zorundadır: boş özet "%0/%0 paylaşım" bastırır
 * ve kullanıcı veriyi kaybettiğini sanardı.
 */
export interface LandShareTableViewProps {
  projectId: string;
  activePath: string;
}

function SummaryTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="psum-hero__kpi">
      <div className="psum-hero__kpi-value">{value}</div>
      <div className="psum-hero__kpi-note">{label}</div>
    </div>
  );
}

export function LandShareTableView({ projectId, activePath }: LandShareTableViewProps) {
  const [offset, setOffset] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setExporting] = useState(false);

  const projectQuery = useProject(projectId);
  const summaryQuery = useLandShareSummary(projectId);
  const unitsQuery = useLandShareUnits(projectId, { offset });

  if (isForbidden(summaryQuery.error) || isForbidden(projectQuery.error)) return <AccessDenied />;

  // 404 bir HATA gibi değil, AÇIKLAYICI BOŞ HÂL gibi basılır (hook notu).
  if (isLandShareMissing(summaryQuery.error)) {
    return (
      <div className="psum">
        <p className="psum-message">
          Bu projede kat karşılığı sözleşmesi tanımlı değil; paylaşım tablosu yalnız kat karşılığı
          projelerinde tutulur.
        </p>
      </div>
    );
  }
  if (summaryQuery.isError) return <p className="psum-message">Paylaşım özeti yüklenemedi</p>;
  if (summaryQuery.isLoading || !summaryQuery.data) {
    return <p className="psum-message">Yükleniyor…</p>;
  }

  const summary = summaryQuery.data;
  const { contract, totals, our_side: ourSide, owner_side: ownerSide } = summary;
  const projectType = projectQuery.data?.project_type ?? "kat_karsiligi";

  async function handleExport() {
    setExportError(null);
    setExporting(true);
    try {
      await downloadUnitsExport(projectId);
    } catch {
      // Hata SESSİZ YUTULMAZ: indirme tarayıcı işidir ve başarısızlığı
      // kullanıcıya görünür olmalıdır.
      setExportError("Excel dosyası indirilemedi. Lütfen yeniden deneyin.");
    } finally {
      setExporting(false);
    }
  }

  const rows = unitsQuery.data?.items ?? [];
  const total = unitsQuery.data?.total ?? 0;
  const pageEnd = offset + rows.length;

  return (
    <div className="psum">
      <div className="psum-tabbar">        <ProjectDetailTabs
          projectId={projectId}
          activePath={activePath}
          projectType={projectType}
        />      </div>

      <div className="psum-card__head">
        <div>
          <h1 className="psum-card__title">Paylaşım Tablosu</h1>
          <p className="psum-card__sub">
            {contract.contract_no
              ? `Sözleşme ${contract.contract_no}`
              : "Sözleşme numarası girilmedi"}
          </p>
        </div>
        <div className="psum-actions">
          {/* KKP 24 "Excel" — uç SÜZGEÇ ALMAZ, tablonun TAMAMINI indirir. */}
          <Button type="button" variant="secondary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? "İndiriliyor…" : "Excel"}
          </Button>
          {/* KKP 25 "Paylaşımı Kaydet" — bu ekran OKUMA ekranıdır; yazma
              F-UNIT2'nin giriş ekranındadır (canlı). Düğme kendi işini
              yapmak yerine oraya GÖTÜRÜR. */}
          <Link className="psum-actions__link" href="/satis/paylasim-girisi">
            Paylaşımı Düzenle
          </Link>
        </div>
      </div>

      {exportError ? (
        <p className="psum-message" role="alert">
          {exportError}
        </p>
      ) : null}

      {/* KKP 55-77 · paylaşım özeti */}
      <section className="psum-hero psum-hero--kat_karsiligi">
        <div className="psum-hero__top">
          <div>
            <p className="psum-hero__type">Biz (Yüklenici)</p>
            <div className="psum-hero__profit-value">{formatPercent(contract.our_share_pct)}</div>
            <p className="psum-hero__meta">{ourSide.unit_count} ünite</p>
          </div>
          <div className="psum-hero__profit">
            <p className="psum-hero__type">Arsa Sahibi · {contract.landowner_name}</p>
            <div className="psum-hero__profit-value">
              {formatPercent(contract.owner_share_pct)}
            </div>
            <p className="psum-hero__meta">{ownerSide.unit_count} ünite</p>
          </div>
        </div>
        <div className="psum-hero__kpis">
          <SummaryTile value={String(totals.unit_count)} label="Toplam Ünite" />
          <SummaryTile
            value={
              contract.construction_area_m2 === null
                ? EMPTY_VALUE
                : formatDecimal(contract.construction_area_m2, 2)
            }
            label="m² İnşaat Alanı"
          />
          <SummaryTile value={formatCurrency(totals.value_total)} label="Toplam Değer" />
          <SummaryTile
            value={
              projectQuery.data?.land_share
                ? formatCurrency(projectQuery.data.land_share.land_cost)
                : EMPTY_VALUE
            }
            label="Arsa Maliyeti"
          />
        </div>
      </section>

      {/* KKP 84-160 · ünite bazlı paylaşım tablosu */}
      <section className="psum-card" aria-labelledby="psum-alloc-title">
        <div className="psum-card__head">
          <div>
            <h2 className="psum-card__title" id="psum-alloc-title">
              Ünite Bazlı Paylaşım
            </h2>
            <p className="psum-card__sub">Hangi ünite kime ait — noterde belirlendi</p>
          </div>
        </div>

        {unitsQuery.isError ? (
          <p className="psum-message">Ünite listesi yüklenemedi</p>
        ) : rows.length === 0 ? (
          <p className="psum-empty">Bu projede ünite tanımlı değil.</p>
        ) : (
          <div className="psum-tbl__scroll">
            <table className="psum-tbl">
              <thead>
                <tr>
                  <th scope="col">Ünite</th>
                  <th scope="col">Tip</th>
                  <th scope="col">m²</th>
                  <th scope="col">Rayiç Değer</th>
                  <th scope="col">Sahip</th>
                  <th scope="col">Hissedar / Alıcı</th>
                  <th scope="col">Satış Durumu</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.unit_id}>
                    <td>
                      <span className="psum-tbl__name">
                        {row.block_name} · {row.unit_no}
                      </span>
                    </td>
                    {/* `layout` ("3+1") girilmemişse ünite TÜRÜ basılır
                        ("Ticari" yerine "Dükkan") — uydurma metin yok. */}
                    <td>{row.layout ?? UNIT_KIND_LABELS[row.unit_kind]}</td>
                    <td className="psum-tbl__num">
                      {row.gross_area_m2 === null
                        ? EMPTY_VALUE
                        : formatDecimal(row.gross_area_m2, 2)}
                    </td>
                    <td className="psum-tbl__num">
                      {row.appraisal_value === null
                        ? EMPTY_VALUE
                        : formatCurrency(row.appraisal_value)}
                    </td>
                    <td>
                      {row.owner_side === null ? (
                        <span className="psum-tbl__pending">Atanmadı</span>
                      ) : (
                        <span className={`psum-side psum-side--${row.owner_side}`}>
                          {OWNER_SIDE_LABELS[row.owner_side]}
                        </span>
                      )}
                    </td>
                    {/* KKP 93 sütunu İKİ kaynaklıdır: arsa payında HİSSEDAR,
                        bizim payımızda ALICI. İkisi de boş olabilir. */}
                    <td>{row.shareholder_name ?? row.buyer_name ?? EMPTY_VALUE}</td>
                    <td>
                      {unitSalesStatusLabel(row.sales_status, row.owner_side) ?? EMPTY_VALUE}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* KKP 159-171 · iki taraflı tfoot. Sayılar SUNUCUNUN
                  toplamlarıdır; sayfadaki satırlardan toplanmaz — tablo
                  sayfalıdır ve sayfa toplamı proje toplamı DEĞİLDİR. */}
              <tfoot>
                <tr>
                  <td colSpan={3}>
                    BİZİM PAY ({ourSide.unit_count} ünite · {formatPercent(contract.our_share_pct)})
                  </td>
                  <td className="psum-tbl__num">{formatCurrency(ourSide.value_total)}</td>
                  <td colSpan={3}>
                    {ourSide.sold_count} satıldı · {ourSide.reserved_count} rezerve ·{" "}
                    {ourSide.available_count} satışta
                  </td>
                </tr>
                <tr>
                  <td colSpan={3}>
                    ARSA SAHİBİ PAYI ({ownerSide.unit_count} ünite ·{" "}
                    {formatPercent(contract.owner_share_pct)})
                  </td>
                  <td className="psum-tbl__num">{formatCurrency(ownerSide.value_total)}</td>
                  <td colSpan={3}>
                    {contract.delivery_date
                      ? `Teslim: ${formatDateDots(contract.delivery_date)}`
                      : "Teslim tarihi girilmedi"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Sayfa çubuğu `total`den çıkar (süzgeçlenmiş kümenin boyutu),
            `items.length`ten DEĞİL — hook notu. */}
        {total > LAND_SHARE_UNITS_PAGE_SIZE ? (
          <div className="psum-pager">
            <Button
              type="button"
              variant="secondary"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - LAND_SHARE_UNITS_PAGE_SIZE))}
            >
              Önceki
            </Button>
            <span className="psum-pager__label">
              {offset + 1}–{pageEnd} / {total}
            </span>
            <Button
              type="button"
              variant="secondary"
              disabled={pageEnd >= total}
              onClick={() => setOffset(offset + LAND_SHARE_UNITS_PAGE_SIZE)}
            >
              Sonraki
            </Button>
          </div>
        ) : null}
      </section>

      {/* KKP 176-197 · Teslim Takibi. Kartın DÖRT adımı hiçbir uçtan gelmez
          (backend emri bilinçli kapsam dışı bıraktı) — kart SİLİNMEZ,
          gerekçesiyle durur. Tek GERÇEK sayısı günlük cezadır ve o BASILIR. */}
      <section className="psum-card" aria-labelledby="psum-delivery-title">
        <h2 className="psum-card__title" id="psum-delivery-title">
          Arsa Sahibi Teslim Takibi
        </h2>
        <PendingCell
          moduleKey={PROJECT_SUMMARY_PENDING_KEYS.landownerDelivery}
          className="psum-profit__pending"
        />
        <dl className="psum-terms">
          <div>
            <dt>Teslim Tarihi</dt>
            <dd>
              {contract.delivery_date ? formatDateDots(contract.delivery_date) : EMPTY_VALUE}
            </dd>
          </div>
          <div>
            <dt>Gecikme Cezası</dt>
            <dd>
              {contract.daily_penalty === null
                ? EMPTY_VALUE
                : `${formatCurrency(contract.daily_penalty)} / gün`}
            </dd>
          </div>
          <div>
            <dt>Teminat</dt>
            <dd>
              {contract.guarantee_amount === null
                ? EMPTY_VALUE
                : formatCurrency(contract.guarantee_amount)}
            </dd>
          </div>
          <div>
            <dt>Noter Tarihi</dt>
            <dd>{contract.notary_date ? formatDateDots(contract.notary_date) : EMPTY_VALUE}</dd>
          </div>
        </dl>
        {/* KKP 197 "%8 gecikme riski" — tahmin algoritmasını mockup
            SÖYLEMİYOR; ceza TUTARI gerçektir ve yukarıda basıldı. */}
        <p className="psum-card__note">{REASONS.landownerDelayRisk}</p>
      </section>
    </div>
  );
}
