"use client";

import Link from "next/link";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { Badge } from "@/components/ui/badge/Badge";
import {
  useProgressPayments,
  type ProgressPaymentListItem,
  type ProgressPaymentListResponse,
} from "@/lib/api/hooks/useProgressPayments";
import { isForbidden } from "@/lib/api/unwrap";
import { formatCurrencyPrecise } from "@/lib/format";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { PROGRESS_PAYMENT_STATUS_BADGE } from "./status";
import { formatPaymentTitle } from "./title";
import "./progress-payments.css";

// Ekran 14 · Hakedişler (P7 T2) — proje-genel İŞVEREN hakediş listesi.
// Mockup `Şantiye - Hakedişler.dc.html`ın İŞVEREN HAKEDİŞLERİ yarısından
// (satır 90-113) alınır: kart-içi satır listesi, sol başlık+açıklama, sağ
// tutar+rozet. Taşeron yarısı ve KPI şeridi bu ekranda YOK (brief
// §BASILMAYACAKLAR) — taşeron hakediş modülü henüz yok, kar/marj KPI'ları
// bu veri sözleşmesinde tanımsız.
export function ProgressPaymentsView() {
  const paymentsQuery = useProgressPayments();
  // Yazma yüzeyi kapısı (spec §2.5): "Yeni Hakediş" yalnız `draft` ve üstü
  // seviyede görünür. Yetki zorlaması HER ZAMAN backend'dedir.
  const { canWrite } = useModulePermission("progress_payments");

  if (isForbidden(paymentsQuery.error)) return <AccessDenied />;

  return (
    <div className="pp">
      <div className="pp__title-row">
        <h1 className="pp__title">Hakedişler</h1>
        {canWrite && (
          <Link href="/hakedisler/yeni" className="pp__new-btn">
            + Yeni Hakediş
          </Link>
        )}
      </div>

      <PaymentsBody
        isError={paymentsQuery.isError}
        isLoading={paymentsQuery.isLoading}
        data={paymentsQuery.data}
      />
    </div>
  );
}

function PaymentsBody({
  isError,
  isLoading,
  data,
}: {
  isError: boolean;
  isLoading: boolean;
  data?: ProgressPaymentListResponse;
}) {
  if (isError) return <p className="pp-message">Hakedişler yüklenemedi</p>;
  if (isLoading || !data) return <p className="pp-message">Yükleniyor…</p>;
  if (data.items.length === 0) {
    return (
      <section className="pp-empty">
        <p className="pp-empty__title">Henüz hakediş oluşturulmadı</p>
        <p className="pp-empty__hint">+ Yeni Hakediş ile başlayın</p>
      </section>
    );
  }
  return (
    <section className="pp-card">
      <ul className="pp-list">
        {data.items.map((item) => (
          <PaymentRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function PaymentRow({ item }: { item: ProgressPaymentListItem }) {
  const badge = PROGRESS_PAYMENT_STATUS_BADGE[item.status];
  return (
    <li className="pp-row">
      <Link
        href={`/hakedisler/${item.id}`}
        className="pp-row__link"
        aria-label={`${item.project_name} — ${formatPaymentTitle(item)}`}
      >
        <div className="pp-row__main">
          <p className="pp-row__project">{item.project_name}</p>
          <p className="pp-row__title">{formatPaymentTitle(item)}</p>
          {item.description && <p className="pp-row__desc">{item.description}</p>}
        </div>
        <div className="pp-row__side">
          <span className="pp-row__amount">{formatCurrencyPrecise(item.gross_total)}</span>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </Link>
    </li>
  );
}
