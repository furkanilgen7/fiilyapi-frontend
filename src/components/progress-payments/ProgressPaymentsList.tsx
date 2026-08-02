"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge/Badge";
import {
  type ProgressPaymentListItem,
  type ProgressPaymentListResponse,
} from "@/lib/api/hooks/useProgressPayments";
import { formatCurrencyPrecise } from "@/lib/format";

import { PROGRESS_PAYMENT_STATUS_BADGE } from "./status";
import { formatPaymentTitle } from "./title";

// P7 T2 + T6 ortak hakediş liste gövdesi. `/hakedisler` (proje-genel) ve
// şantiye "Hakedişler" sekmesi AYNI kaydın iki görünümüdür (T6 brief §Kalıcı
// mimari karar) — satır bileşeni burada TEK yerde yaşar, kopyalanmaz.
// Yükleniyor/hata/boş/liste dört dalı da burada; her iki görünüm aynı
// metinleri kullanır (T6 brief'te ayrı metin istenmedi).
export function ProgressPaymentsListBody({
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
          <ProgressPaymentRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function ProgressPaymentRow({ item }: { item: ProgressPaymentListItem }) {
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
