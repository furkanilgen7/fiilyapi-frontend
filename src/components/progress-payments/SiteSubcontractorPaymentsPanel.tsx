"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge/Badge";
import { formatCurrencyPrecise } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import type { SiteSubcontractorPaymentItem } from "@/lib/api/hooks/useSiteSubcontractorPayments";

import { PAYMENT_STATUS_BADGE } from "./shared/status";

// Şantiye "Hakedişler" sekmesi sağ sütunu (F-TH T5, mockup satır 135-166:
// "Taşeron Hakedişleri" paneli). Satır kabuğu (`pp-row*`) İŞVEREN sütunuyla
// PAYLAŞILIR (`progress-payments.css`, aynı visual dil) — kopyalanmaz.
export interface SiteSubcontractorPaymentsPanelProps {
  items: SiteSubcontractorPaymentItem[];
  isLoading: boolean;
  isError: boolean;
}

export function SiteSubcontractorPaymentsPanel({
  items,
  isLoading,
  isError,
}: SiteSubcontractorPaymentsPanelProps) {
  return (
    <section className="spp__panel spp__panel--subcontractor">
      <div className="spp__panel-head">
        <span className="spp__panel-title">Taşeron Hakedişleri</span>
        <Link href="/hakedisler/taseron" className="spp__panel-link">
          Tümü →
        </Link>
      </div>

      {isError ? (
        <p className="pp-message">Taşeron hakedişleri yüklenemedi</p>
      ) : isLoading ? (
        <p className="pp-message">Yükleniyor…</p>
      ) : items.length === 0 ? (
        <section className="pp-empty">
          <p className="pp-empty__title">Bu şantiyede taşeron hakedişi yok</p>
          <p className="pp-empty__hint">Sözleşme bu şantiyeye bağlandığında burada listelenir</p>
        </section>
      ) : (
        <ul className="pp-list">
          {items.map((item) => (
            <SubcontractorPaymentRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

function SubcontractorPaymentRow({ item }: { item: SiteSubcontractorPaymentItem }) {
  const badge = PAYMENT_STATUS_BADGE[item.status];
  const href = `/hakedisler/taseron/${item.id}`;

  return (
    <li className="pp-row">
      <Link
        href={href}
        className="pp-row__link"
        aria-label={`${item.subcontractorName} — Hakediş #${item.sequenceNo}`}
      >
        <div className="pp-row__main">
          <p className="pp-row__title">
            {item.subcontractorName} #{item.sequenceNo}
          </p>
          {/* Zarif düşüş: "bölüm" (section) adı hiçbir uçtan gelmiyor
              (yalnız `section_id` var, isim çözümü bu dilimin kapsamında
              değil) — mockup'ın kategori-yalnız satırlarıyla (ör. "Elektrik
              Tesisatı") tutarlı biçimde yalnızca iş kategorisi basılır. İş
              kategorisi sözleşme detayından GERÇEK değerdir (bu hook zaten
              site_id süzmesi için sözleşme detayını çekiyor). */}
          {item.workCategory ? (
            <p className="pp-row__desc">{item.workCategory}</p>
          ) : (
            <p className="pp-row__desc" title={pendingModuleLabel("work_category")}>
              —<span className="sr-only">{pendingModuleLabel("work_category")}</span>
            </p>
          )}
        </div>
        <div className="pp-row__side">
          <span className="pp-row__amount">{formatCurrencyPrecise(item.grossTotal)}</span>
          {item.isRevisionRequired ? (
            <Badge variant="danger">Revize Gerekli</Badge>
          ) : (
            <Badge variant={badge.variant}>{badge.label}</Badge>
          )}
        </div>
      </Link>
    </li>
  );
}
