import { Checkbox, DateInput, Field, Select } from "@/components/ui";
import type { SupplierCard } from "@/lib/api/hooks/useSuppliers";

import { PAYMENT_TERMS_LABELS, PAYMENT_TERMS_OPTIONS } from "./purchasing-labels";
import {
  PAYMENT_TERMS_PENDING_REASON,
  QUOTE_SUPPLIERS_PENDING_REASON,
  SUPPLIER_EMAIL_LABEL,
  SUPPLIER_EMAIL_PENDING_REASON,
  SUPPLIER_HINT,
  SUPPLIERS_EMPTY,
  SUPPLIERS_LOAD_ERROR,
} from "./purchase-request-form-constants";

interface PurchaseRequestFormSupplierCardProps {
  suppliers: readonly SupplierCard[];
  suppliersIsLoading: boolean;
  suppliersIsError: boolean;
  /** FST 133 — GERÇEK alan (`quote_deadline`). */
  quoteDeadline: string;
  onChangeQuoteDeadline: (value: string) => void;
}

/**
 * "🏢 Tedarikçi Tercihi" kartı (FST 119-138).
 *
 * Kartın DÖRT yüzeyinden **yalnız biri gerçektir**: "Teklif Son Tarihi" (133) =
 * `quote_deadline`. Öbür üçünün ŞEMADA KARŞILIĞI YOKTUR ve bunu
 * `PurchaseRequestCreate` açıklaması adıyla söyler ("FST'nin 'Teklif Istenecek
 * Tedarikciler' listesi ve 'Odeme Vadesi Tercihi' burada YOKTUR").
 *
 * Kural (WORKFLOW §3): kutu SİLİNMEZ, yerinde devre dışı + GÖRÜNÜR gerekçeyle
 * durur ve gövdeye HİÇBİR anahtar eklemez.
 *
 * ⚠️ Tedarikçi adları GERÇEK listeden basılır (`GET /suppliers`) — mockup'ın
 * "Demirsan A.Ş." gibi örnek adları UYDURULMAZ. Kutucuklar `checked={false}`
 * ve devre dışıdır: seçili bir kutu "bu tedarikçilerden teklif istenecek"
 * derdi, oysa seçim HİÇBİR YERE yazılmıyor (F-ST bildirim kutucuğu emsali).
 */
export function PurchaseRequestFormSupplierCard({
  suppliers,
  suppliersIsLoading,
  suppliersIsError,
  quoteDeadline,
  onChangeQuoteDeadline,
}: PurchaseRequestFormSupplierCardProps) {
  const supplierNote = suppliersIsError
    ? SUPPLIERS_LOAD_ERROR
    : suppliersIsLoading
      ? "Yükleniyor…"
      : suppliers.length === 0
        ? SUPPLIERS_EMPTY
        : null;

  return (
    <section className="pf-card">
      {/* 120 */}
      <h2 className="pf-card__title">🏢 Tedarikçi Tercihi</h2>
      <div className="pf-grid pf-grid--2">
        {/* 122-131 — PENDING */}
        <div>
          <span className="saf-label">Teklif İstenecek Tedarikçiler</span>
          <div className="saf-supplier-list" data-testid="talep-tedarikci-listesi">
            {supplierNote && <p className="saf-supplier-list__note">{supplierNote}</p>}
            {suppliers.map((supplier) => (
              <Checkbox
                key={supplier.id}
                disabled
                readOnly
                checked={false}
                title={QUOTE_SUPPLIERS_PENDING_REASON}
                label={supplier.name}
              />
            ))}
          </div>
          <p className="saf-hint">{SUPPLIER_HINT}</p>
          <p className="saf-pending" data-testid="talep-tedarikci-gerekce">
            {QUOTE_SUPPLIERS_PENDING_REASON}
          </p>
        </div>

        <div className="saf-supplier-side">
          {/* 133 — GERÇEK alan */}
          <Field label="Teklif Son Tarihi">
            {(control) => (
              <DateInput
                {...control}
                data-testid="talep-teklif-son-tarih"
                value={quoteDeadline}
                onValueChange={(iso) => onChangeQuoteDeadline(iso)}
              />
            )}
          </Field>

          {/* 134 — PENDING */}
          <Field label="Ödeme Vadesi Tercihi" hint={PAYMENT_TERMS_PENDING_REASON}>
            {(control) => (
              <Select
                {...control}
                disabled
                data-testid="talep-odeme-vadesi"
                title={PAYMENT_TERMS_PENDING_REASON}
                value=""
                onChange={() => undefined}
              >
                <option value="">Seçiniz...</option>
                {PAYMENT_TERMS_OPTIONS.map((terms) => (
                  <option key={terms} value={terms}>
                    {PAYMENT_TERMS_LABELS[terms]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {/* 135 — PENDING. Mockup kutucuğu SEÇİLİ çizer; burada SEÇİLMEDEN
              basılır: e-posta GÖNDERİLMEYECEKTİR ve seçili bir kutu
              "gönderilecek" der (F-ST 176 kararının ikizi). */}
          <span className="saf-notify">
            <Checkbox
              size="lg"
              disabled
              readOnly
              checked={false}
              title={SUPPLIER_EMAIL_PENDING_REASON}
              data-testid="talep-eposta-bildirim"
              label={SUPPLIER_EMAIL_LABEL}
            />
            <span className="saf-pending">{SUPPLIER_EMAIL_PENDING_REASON}</span>
          </span>
        </div>
      </div>
    </section>
  );
}
