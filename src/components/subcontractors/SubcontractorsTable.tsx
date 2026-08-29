"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge/Badge";
import { cx } from "@/lib/cx";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

import {
  NO_CONTRACT_REASON,
  PAYMENT_PENDING_REASON,
  RATING_PENDING_REASON,
} from "./pending-reasons";
import type { PendingMoney, SubcontractorRow } from "./subcontractor-aggregate";
import { categoryBadgeVariant, categoryTone } from "./subcontractor-category";
import "./subcontractors.css";
import { routes } from "@/lib/routes";

/**
 * TL 41-107 · taşeron firma tablosu. Kolonlar 45-52'den BİREBİR sırasıyla:
 * Firma · Kategori · Aktif Sözl. (orta) · Toplam Sözl. Bedeli (sağ) ·
 * Ödenen (sağ) · Bekleyen Hak. (sağ) · Puan (orta) · başlıksız "Detay →".
 *
 * Satır tıklaması (55 `cursor:pointer`) ve son kolondaki link (63) AYNI
 * hedefe gider: `Taşeron Sözleşme Detay.dc.html` → `/sozlesmeler/taseron/
 * {contractId}` (T7'de yazılacak rota; link şimdiden doğru hedefe basılır).
 * Firmanın birden çok sözleşmesi olabildiği için hedef deterministik seçilir
 * (bkz. `pickDetailContract`); hiç sözleşmesi yoksa link SİLİNMEZ, devre dışı
 * + görünür gerekçeyle basılır.
 */
export interface SubcontractorsTableProps {
  isError: boolean;
  isLoading: boolean;
  rows?: SubcontractorRow[];
  /** Süzgeç uygulanmadan önce hiç firma var mıydı — boş durum metnini ayırır. */
  hasAnyRow: boolean;
}

export function SubcontractorsTable({
  isError,
  isLoading,
  rows,
  hasAnyRow,
}: SubcontractorsTableProps) {
  if (isError) return <p className="tl-message">Taşeron listesi yüklenemedi</p>;
  if (isLoading || !rows) return <p className="tl-message">Yükleniyor…</p>;
  if (rows.length === 0) {
    return (
      <section className="tl-empty">
        <p className="tl-empty__title">
          {hasAnyRow ? "Süzgeçle eşleşen taşeron yok" : "Henüz taşeron firma yok"}
        </p>
        <p className="tl-empty__hint">
          {hasAnyRow
            ? "Arama metnini veya kategori seçimini değiştirin"
            : "+ Taşeron Ekle ile başlayın"}
        </p>
      </section>
    );
  }

  return (
    <section className="tl-card">
      <table className="tl-table">
        <thead>
          <tr>
            <th className="tl-table__th tl-table__th--left">Firma</th>
            <th className="tl-table__th tl-table__th--left">Kategori</th>
            <th className="tl-table__th tl-table__th--center">Aktif Sözl.</th>
            <th className="tl-table__th tl-table__th--right">Toplam Sözl. Bedeli</th>
            <th className="tl-table__th tl-table__th--right">Ödenen</th>
            <th className="tl-table__th tl-table__th--right">Bekleyen Hak.</th>
            <th className="tl-table__th tl-table__th--center">Puan</th>
            <th className="tl-table__th tl-table__th--center" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <SubcontractorTableRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function detailHref(contractId: string): string {
  return routes.contracts.subcontractorDetail({ contractId });
}

/** 56 · "VKN: 1234567890 · İletişim: 0212 555 00 01"; 86'da telefon YOK. */
function contactLine(row: SubcontractorRow): string {
  const parts = [
    row.taxNumber ? `VKN: ${row.taxNumber}` : null,
    row.phone ? `İletişim: ${row.phone}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function SubcontractorTableRow({ row }: { row: SubcontractorRow }) {
  const router = useRouter();
  const href = row.detailContractId ? detailHref(row.detailContractId) : null;
  const tone = categoryTone(row.category);

  return (
    <tr
      className={cx("tl-row", href && "tl-row--clickable")}
      onClick={href ? () => router.push(href) : undefined}
      aria-label={row.name}
    >
      <td className="tl-table__td">
        <div className="tl-table__name">{row.name}</div>
        <div className="tl-table__contact">{contactLine(row)}</div>
      </td>
      <td className="tl-table__td">
        {row.category ? (
          <Badge
            variant={categoryBadgeVariant(tone)}
            className={cx("tl-badge", `tl-badge--${tone}`)}
          >
            {row.category}
          </Badge>
        ) : (
          <span className="tl-table__muted">—</span>
        )}
      </td>
      <td className="tl-table__td tl-table__td--center tl-table__td--count">
        {row.activeContractCount}
      </td>
      <td className="tl-table__td tl-table__td--right tl-table__td--mono tl-table__td--strong">
        {formatCompactCurrency(row.contractTotal)}
      </td>
      <td className="tl-table__td tl-table__td--right tl-table__td--mono">
        <PendingAwareMoney value={row.paidTotal} format={formatCompactCurrency} />
      </td>
      <td className="tl-table__td tl-table__td--right">
        <PendingBadge value={row.pendingTotal} />
      </td>
      {/* 62 · ONAYLI KARAR S4: kolon basılır, yıldız İCAT EDİLMEZ. */}
      <td className="tl-table__td tl-table__td--center">
        <span
          className="tl-rating tl-rating--pending"
          title={RATING_PENDING_REASON}
          data-testid="tl-rating-pending"
        >
          —<span className="sr-only">{RATING_PENDING_REASON}</span>
        </span>
      </td>
      <td className="tl-table__td tl-table__td--center">
        {href ? (
          <Link
            href={href}
            className="tl-table__detail"
            onClick={(event) => event.stopPropagation()}
          >
            Detay →
          </Link>
        ) : (
          <span
            className="tl-table__detail tl-table__detail--disabled"
            title={NO_CONTRACT_REASON}
            aria-disabled="true"
            data-testid="tl-detail-disabled"
          >
            Detay →<span className="sr-only">{NO_CONTRACT_REASON}</span>
          </span>
        )}
      </td>
    </tr>
  );
}

function PendingAwareMoney({
  value,
  format,
}: {
  value: PendingMoney;
  format: (value: number) => string;
}) {
  if (value === null) {
    return (
      <span className="tl-table__muted" title={PAYMENT_PENDING_REASON}>
        —<span className="sr-only">{PAYMENT_PENDING_REASON}</span>
      </span>
    );
  }
  return <>{format(value)}</>;
}

/**
 * 61 · "Bekleyen Hak." rozeti. Mockup'ta iki ton vardır ama seçimleri kendi
 * içinde ÇELİŞİR: 71'de ₺580.000 YEŞİL, 61/91/101'de dolu tutarlar KEHRİBAR,
 * 81'de ₺0 YEŞİL. Deterministik kural (tarih artefaktı istisnası):
 * **0 ⇒ yeşil, 0'dan büyük ⇒ kehribar**. Kırpılmada rozet basılmaz, "—" düşer.
 * Tutar burada KISALTILMAZ — mockup 61/91/101'de tam yazımdır (₺1.240.000).
 */
function PendingBadge({ value }: { value: PendingMoney }) {
  if (value === null) {
    return (
      <span className="tl-table__muted" title={PAYMENT_PENDING_REASON} data-testid="tl-pending-money">
        —<span className="sr-only">{PAYMENT_PENDING_REASON}</span>
      </span>
    );
  }
  return (
    <Badge
      variant={value > 0 ? "warning" : "success"}
      className={cx("tl-badge", value > 0 && "tl-badge--pending-due")}
      data-testid="tl-pending-money"
    >
      {formatCurrency(value)}
    </Badge>
  );
}
