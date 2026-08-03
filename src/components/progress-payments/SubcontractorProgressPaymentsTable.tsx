"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge, type BadgeVariant } from "@/components/ui/badge/Badge";
import { formatCurrencyPrecise, formatPeriodShort } from "@/lib/format";
import { pendingModuleLabel } from "@/lib/pending-modules";
import { PAYMENT_STATUS_BADGE, type PaymentLifecycleStatus } from "./shared/status";
import type {
  SubcontractorProgressPaymentListItem,
  SubcontractorProgressPaymentListResponse,
} from "@/lib/api/hooks/useSubcontractorProgressPayments";

import "./subcontractor-progress-payments.css";

/**
 * Rozet RENK override'ı — YALNIZ bu ekrana özeldir, `PAYMENT_STATUS_BADGE`in
 * (`shared/status.ts`) METNİNİ değiştirmez, ikinci bir DURUM→METİN eşlemesi
 * DEĞİLDİR. Gerekçe (rapora da düşüldü): Ekran 2 mockup'ı (satır 147/157/167)
 * `approved`=YEŞİL, `paid`=MAVİ kanıtlıyor — bu, `shared/status.ts`'in
 * BUGÜNKÜ `approved`=primary(mavi)/`paid`=success(yeşil) varsayımının TAM
 * TERSİ. O dosyanın kendi yorumu bu varsayımı zaten "kaynak yoklukta yapılan
 * bir tercih" olarak işaretlemişti — şimdi elimizde taşeron tarafı için somut
 * ters kanıt var. İşveren ekranının halihazırda test edilmiş rengini
 * DEĞİŞTİRMEMEK için `shared/status.ts` burada güncellenmedi (T2 kapsamı bunu
 * kapsamıyor) — bu çelişki raporun "Şüpheler" bölümünde kullanıcıya
 * bırakıldı.
 */
const SUBCONTRACTOR_BADGE_VARIANT: Record<PaymentLifecycleStatus, BadgeVariant> = {
  draft: "neutral",
  pending_approval: "warning",
  approved: "success",
  paid: "primary",
};

export interface SubcontractorProgressPaymentsTableProps {
  isError: boolean;
  isLoading: boolean;
  data?: SubcontractorProgressPaymentListResponse;
}

export function SubcontractorProgressPaymentsTable({
  isError,
  isLoading,
  data,
}: SubcontractorProgressPaymentsTableProps) {
  if (isError) return <p className="thk-message">Taşeron hakedişleri yüklenemedi</p>;
  if (isLoading || !data) return <p className="thk-message">Yükleniyor…</p>;
  if (data.items.length === 0) {
    return (
      <section className="thk-empty">
        <p className="thk-empty__title">Henüz taşeron hakedişi oluşturulmadı</p>
        <p className="thk-empty__hint">+ Yeni Hakediş ile başlayın</p>
      </section>
    );
  }

  return (
    <section className="thk-card">
      <table className="thk-table">
        <thead>
          <tr>
            <th className="thk-table__th thk-table__th--left">Taşeron</th>
            <th className="thk-table__th thk-table__th--left">Hakediş No</th>
            <th className="thk-table__th thk-table__th--left">Dönem</th>
            <th className="thk-table__th thk-table__th--right">Brüt Tutar</th>
            <th className="thk-table__th thk-table__th--right">KDV</th>
            <th className="thk-table__th thk-table__th--right">Net Ödeme</th>
            <th className="thk-table__th thk-table__th--center">Durum</th>
            <th className="thk-table__th thk-table__th--center">İlerleme</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <SubcontractorPaymentRow key={item.id} item={item} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SubcontractorPaymentRow({ item }: { item: SubcontractorProgressPaymentListItem }) {
  const router = useRouter();
  const href = `/hakedisler/taseron/${item.id}`;
  const badge = PAYMENT_STATUS_BADGE[item.status];
  const subcontractorName = item.subcontractor_name ?? "—";

  return (
    <tr
      className="thk-row"
      onClick={() => router.push(href)}
      aria-label={`${subcontractorName} — Hakediş #${item.sequence_no}`}
    >
      <td className="thk-table__td">
        <Link href={href} className="thk-table__name-link" onClick={(event) => event.stopPropagation()}>
          {subcontractorName}
        </Link>
        {/* Zarif düşüş 1/3: iş kategorisi — şemada YOK (brief §Zarif düşüş).
            Mockup satır 141'de isim altında ikinci satır olarak durur; kolon
            SİLİNMEZ, sessizce atlanmaz. */}
        <div
          className="thk-table__category thk-table__category--pending"
          title={pendingModuleLabel("work_category")}
        >
          —<span className="sr-only">{pendingModuleLabel("work_category")}</span>
        </div>
      </td>
      <td className="thk-table__td thk-table__td--mono">#{item.sequence_no}</td>
      <td className="thk-table__td">
        {item.period_year && item.period_month ? formatPeriodShort(item.period_year, item.period_month) : "—"}
      </td>
      <td className="thk-table__td thk-table__td--right thk-table__td--mono thk-table__td--strong">
        {formatCurrencyPrecise(item.gross_total)}
      </td>
      {/* Zarif düşüş 2/3: KDV tutarı — şemada YOK. `net - gross` gibi bir
          TÜRETME YASAK (brief), bu yüzden hesaplanmaz, pending gösterilir. */}
      <td
        className="thk-table__td thk-table__td--right thk-table__td--pending"
        title={pendingModuleLabel("vat")}
      >
        —<span className="sr-only">{pendingModuleLabel("vat")}</span>
      </td>
      <td className="thk-table__td thk-table__td--right thk-table__td--mono thk-table__td--strong">
        {formatCurrencyPrecise(item.net_total)}
      </td>
      <td className="thk-table__td thk-table__td--center">
        {item.is_revision_required ? (
          <Badge variant="danger">Revize Gerekli</Badge>
        ) : (
          <Badge variant={SUBCONTRACTOR_BADGE_VARIANT[item.status]}>{badge.label}</Badge>
        )}
      </td>
      {/* Zarif düşüş 3/3: ilerleme yüzdesi — şemada YOK. Çubuk/yüzde
          TAHMİN EDİLMEZ, tüm hücre pending gösterilir. */}
      <td
        className="thk-table__td thk-table__td--center thk-table__td--pending"
        title={pendingModuleLabel("progress")}
      >
        —<span className="sr-only">{pendingModuleLabel("progress")}</span>
      </td>
    </tr>
  );
}
