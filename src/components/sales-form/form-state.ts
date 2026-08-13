/**
 * F-P8 T3 · DS (Yeni Satış) formunun DURUM modeli.
 *
 * ⚠️ PENDING YÜZEYLER GÖVDEYE SIZAMAZ (F-ST/F-PT emsali): "otomatik fatura"
 * (206) ve belge kutuları (167-201) bu arayüzde HİÇ YOKTUR; ekranda devre dışı
 * basılırlar ama durumda karşılıkları olmadığı için `build-body.ts`ten
 * geçemezler.
 *
 * ⚠️ TCKN ve VKN mockup'ta AYRI kutu değil, TEK "TCKN / VKN" girişidir (72);
 * `buyerType`e göre `national_id` (gerçek kişi) ya da `tax_number` (tüzel) olarak
 * gövdeye çevrilir (`build-body.ts`).
 */

import type { DeedCondition, PaymentPlanType, SaleType } from "@/lib/api/hooks/useSales";
import type { InstallmentPaymentMethod } from "@/lib/api/hooks/useSaleInstallments";
import type { CustomerType } from "@/lib/api/hooks/useCustomers";
import type { SaleInstallmentResponse } from "@/lib/api/hooks/useSaleInstallments";
import { normalizeDecimalInput } from "@/lib/decimal";

/**
 * Alıcı seçimi (spec §1/DS "müşteri seçimi + yeni müşteri"). Mockup yalnız yeni
 * müşteri alanlarını çizer (67-77); ONAYLI TÜRETİM olarak bir de kayıtlı müşteri
 * seçimi eklenir — `POST /projects/{id}/sales` bir `customer_id` ZORUNLU kılar,
 * onsuz satış açılamaz. Varsayılan "new"dir ki baseline mockup'ın inline
 * alanlarıyla birebir kalsın.
 */
export type CustomerMode = "new" | "existing";

/** Ödeme planı tablosunun DÜZENLENEBİLİR satırı (üretim SUNUCUDA; burada yalnız
 * kullanıcı düzeltmesi tutulur). `""` ödeme yöntemi = `null`. */
export interface PlanRowValues {
  /** SALT İSTEMCİ liste anahtarı — gövdeye girmez. */
  key: string;
  sequenceNo: number;
  label: string;
  dueDate: string;
  amount: string;
  paymentMethod: InstallmentPaymentMethod | "";
  /** Peşinat satırı yeşil vurgulanır (117-122) — sunucudan gelen sıra/etikete göre. */
  isDownPayment: boolean;
}

export interface SaleFormValues {
  // Satılan Ünite (51-63)
  projectId: string;
  unitId: string;
  saleType: SaleType;

  // Alıcı Bilgileri (66-77)
  customerMode: CustomerMode;
  existingCustomerId: string;
  buyerType: CustomerType;
  buyerName: string;
  /** Tek "TCKN / VKN" kutusu (72). */
  buyerNationalOrTaxId: string;
  buyerPhone: string;
  buyerEmail: string;
  advisorUserId: string;
  buyerAddress: string;

  // Satış Bedeli (80-92)
  discountAmount: string;
  salePrice: string;
  vatPct: string;

  // Ödeme Planı (95-149)
  paymentPlanType: PaymentPlanType;
  downPayment: string;
  installmentCount: string;
  firstInstallmentDate: string;
  termInterestPct: string;

  // Tapu & Teslim (152-165)
  deedCondition: DeedCondition;
  plannedDeedDate: string;
  deliveryDate: string;
  hasCondominiumEasement: boolean;
  hasMortgage: boolean;
  /** 163 — bilgi alanı; işaretliyse `late_fee_monthly_pct` gönderilir. */
  lateFeeEnabled: boolean;
}

export function emptySaleFormValues(): SaleFormValues {
  return {
    projectId: "",
    unitId: "",
    saleType: "sale", // 56 — "Kesin Satış" seçili
    customerMode: "new",
    existingCustomerId: "",
    buyerType: "person", // 70 — "Gerçek Kişi" seçili
    buyerName: "",
    buyerNationalOrTaxId: "",
    buyerPhone: "",
    buyerEmail: "",
    advisorUserId: "",
    buyerAddress: "",
    discountAmount: "",
    salePrice: "",
    vatPct: "1", // 87 — "%1" seçili
    paymentPlanType: "down_payment_installments", // 99 — "Peşinat + Taksit" seçili
    downPayment: "",
    installmentCount: "",
    firstInstallmentDate: "",
    termInterestPct: "",
    deedCondition: "full_payment", // 156 — "Tüm ödeme tamamlanınca" seçili
    plannedDeedDate: "",
    deliveryDate: "",
    hasCondominiumEasement: false,
    hasMortgage: false,
    lateFeeEnabled: false,
  };
}

/**
 * Ondalık girdi normalleştirici — KANON `@/lib/decimal`tedir (F-SA T3'te üç
 * kopya tek kaynağa indirildi). Buradan yeniden dışa verilir ki bu klasörün
 * çağıranları ve testleri ithalatlarını değiştirmesin.
 */
export { normalizeDecimalInput };

/**
 * "Bu Satıştan Kâr" ve maliyet gösterimi ünitenin `list_price` − indirim
 * hesabıyla ÖNERİLMEZ: satış bedeli kullanıcının KENDİ girdisidir (uydurma
 * değil), maliyet ise SUNUCUDAN gelir (`unit-info.ts`). Bu yardımcı yalnız
 * satış bedelini sayıya çevirir; hesabı `unit-info.ts` yapar.
 */
export function salePriceNumber(values: SaleFormValues): number | null {
  const normalized = normalizeDecimalInput(values.salePrice);
  return normalized === null ? null : Number(normalized);
}

/**
 * Sunucudan gelen planı düzenlenebilir satırlara çevirir. Peşinat satırı,
 * sunucunun ürettiği ilk satırın etiketi/label'ı üzerinden işaretlenir —
 * istemci peşinat HESAPLAMAZ, yalnız sunucunun verdiğini boyar.
 */
export function planRowsFromServer(items: readonly SaleInstallmentResponse[]): PlanRowValues[] {
  return items.map((item, index) => ({
    key: `plan-${item.sequence_no}-${index}`,
    sequenceNo: item.sequence_no,
    label: item.label,
    dueDate: item.due_date,
    amount: item.amount,
    paymentMethod: item.payment_method ?? "",
    isDownPayment: index === 0 && /peşinat/i.test(item.label),
  }));
}

export function updatePlanRow(
  rows: readonly PlanRowValues[],
  key: string,
  patch: Partial<Omit<PlanRowValues, "key">>,
): PlanRowValues[] {
  return rows.map((row) => (row.key === key ? { ...row, ...patch } : row));
}
