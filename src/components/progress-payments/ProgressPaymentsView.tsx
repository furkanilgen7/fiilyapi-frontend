"use client";

import Link from "next/link";

import { AccessDenied } from "@/components/settings/AccessDenied";
import { useProgressPayments } from "@/lib/api/hooks/useProgressPayments";
import { isForbidden } from "@/lib/api/unwrap";
import { useModulePermission } from "@/lib/auth/useModulePermission";

import { ProgressPaymentsListBody } from "./ProgressPaymentsList";
import { ProgressPaymentsTotalsStrip } from "./ProgressPaymentsTotalsStrip";
import "./progress-payments.css";

// Ekran 14 · Hakedişler (P7 T2) — proje-genel İŞVEREN hakediş listesi.
// Mockup `Şantiye - Hakedişler.dc.html`ın İŞVEREN HAKEDİŞLERİ yarısından
// (satır 90-113) alınır: kart-içi satır listesi, sol başlık+açıklama, sağ
// tutar+rozet. Taşeron yarısı bu ekranda YOK — taşeron hakediş modülü henüz
// yok. KPI şeridi (satır 81-86) coordinator review T6 fix ile EKLENDİ; karma
// basılır — bkz. `ProgressPaymentsTotalsStrip.tsx`. Satır gövdesi T6'nın
// şantiye sekmesiyle PAYLAŞILIR (`ProgressPaymentsList.tsx`) — kopyalanmaz.
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

      <ProgressPaymentsTotalsStrip items={paymentsQuery.data?.items} />

      <ProgressPaymentsListBody
        isError={paymentsQuery.isError}
        isLoading={paymentsQuery.isLoading}
        data={paymentsQuery.data}
      />
    </div>
  );
}
